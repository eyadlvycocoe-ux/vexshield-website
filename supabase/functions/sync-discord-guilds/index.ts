import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { discord_id, access_token, action } = body;

    // Action: fetch_guilds - Fetch user's Discord guilds using their OAuth token
    if (action === 'fetch_guilds') {
      if (!access_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing access_token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { 'Authorization': `Bearer ${access_token}` },
      });

      if (!guildsResponse.ok) {
        const error = await guildsResponse.text();
        console.error('Discord API error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch Discord guilds', details: error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const guilds = await guildsResponse.json();
      console.log(`Fetched ${guilds.length} guilds for user ${discord_id || 'unknown'}`);

      const guildData = guilds.map((g: any) => ({ id: g.id, name: g.name, icon: g.icon }));

      if (discord_id) {
        const { data: existingUser } = await supabase
          .from('discord_users')
          .select('guilds')
          .eq('discord_id', discord_id)
          .single();

        const oldGuildIds = new Set((existingUser?.guilds || []).map((g: any) => g.id));
        const newGuildIds = new Set(guildData.map((g: any) => g.id));
        
        const joinedGuilds = guildData.filter((g: any) => !oldGuildIds.has(g.id));
        const leftGuilds = (existingUser?.guilds || []).filter((g: any) => !newGuildIds.has(g.id));
        
        if (joinedGuilds.length > 0) {
          console.log(`User ${discord_id} joined ${joinedGuilds.length} new guilds:`, joinedGuilds.map((g: any) => g.name));
        }
        if (leftGuilds.length > 0) {
          console.log(`User ${discord_id} left ${leftGuilds.length} guilds:`, leftGuilds.map((g: any) => g.name));
        }

        const { error: updateError } = await supabase
          .from('discord_users')
          .update({ guilds: guildData })
          .eq('discord_id', discord_id);

        if (updateError) {
          console.error('Error updating user guilds:', updateError);
        } else {
          console.log(`Updated guilds for user ${discord_id}: ${guildData.length} guilds`);
        }
      }

      // Check if any guild is blacklisted
      const { data: blacklisted, error: blacklistError } = await supabase
        .from('blacklisted_discord_servers')
        .select('discord_server_id, server_name, reason');

      if (blacklistError) {
        console.error('Error fetching blacklist:', blacklistError);
        throw blacklistError;
      }

      const blacklistedIds = new Set((blacklisted || []).map(b => b.discord_server_id));
      const foundBlacklistedGuilds: { id: string; name: string; blacklist_name: string; reason: string }[] = [];
      
      for (const guild of guilds) {
        if (blacklistedIds.has(guild.id)) {
          const blacklistedInfo = blacklisted?.find(b => b.discord_server_id === guild.id);
          foundBlacklistedGuilds.push({
            id: guild.id,
            name: guild.name,
            blacklist_name: blacklistedInfo?.server_name || guild.name,
            reason: blacklistedInfo?.reason || 'Blacklisted Discord server'
          });
        }
      }

      // If user is in blacklisted guild(s), ban them in ALL servers
      if (foundBlacklistedGuilds.length > 0) {
        console.log(`User ${discord_id} is in ${foundBlacklistedGuilds.length} blacklisted guild(s)!`);
        
        const { data: allServers } = await supabase
          .from('servers')
          .select('server_id');

        if (allServers && allServers.length > 0) {
          for (const server of allServers) {
            for (const blacklistedGuild of foundBlacklistedGuilds) {
              // Check if ban already exists
              const { data: existingBan } = await supabase
                .from('bans')
                .select('id, exempted_by_server, is_active')
                .eq('server_id', server.server_id)
                .eq('player_id', `discord:${discord_id}`)
                .eq('type', 'discord_blacklist')
                .maybeSingle();

              if (existingBan) {
                const exemptions = existingBan.exempted_by_server || [];
                if (exemptions.includes(server.server_id)) {
                  console.log(`User ${discord_id} is exempted from blacklist ban on server ${server.server_id}`);
                  continue;
                }
                // If ban exists but is inactive (was globally unbanned), reactivate it
                if (!existingBan.is_active) {
                  await supabase
                    .from('bans')
                    .update({ is_active: true })
                    .eq('id', existingBan.id);
                  console.log(`Reactivated blacklist ban for ${discord_id} on server ${server.server_id}`);
                }
                continue;
              }

              // Insert new ban
              const { error: banError } = await supabase
                .from('bans')
                .insert({
                  server_id: server.server_id,
                  player_id: `discord:${discord_id}`,
                  player_name: body.username || 'Unknown',
                  reason: `Joined blacklisted Discord server: ${blacklistedGuild.blacklist_name}`,
                  banned_by: 'AirShield Blacklist System',
                  mode: 'Anticheat',
                  type: 'discord_blacklist',
                  is_active: true,
                  metadata: {
                    discord_id: discord_id,
                    blacklisted_guild: blacklistedGuild.blacklist_name
                  }
                });

              if (banError) {
                console.error(`Error creating ban for server ${server.server_id}:`, banError);
              } else {
                console.log(`Banned user ${discord_id} on server ${server.server_id} for blacklisted guild: ${blacklistedGuild.blacklist_name}`);
              }
            }
          }
        }

        const firstBlacklisted = foundBlacklistedGuilds[0];
        return new Response(
          JSON.stringify({
            success: true,
            blocked: true,
            guild_id: firstBlacklisted.id,
            guild_name: firstBlacklisted.name,
            blacklist_server_name: firstBlacklisted.blacklist_name,
            reason: firstBlacklisted.reason,
            total_blacklisted_guilds: foundBlacklistedGuilds.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, blocked: false, guild_count: guilds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Action: ban_user - Ban a user for joining blacklisted server (called from FiveM)
    if (action === 'ban_user') {
      const { discord_id, user_name, guild_name, server_id, server_ip, license_key } = body;

      if (!discord_id || (!server_id && !server_ip) || !license_key) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let serverLookup = await supabase
        .from('servers')
        .select('server_id, server_ip, license_key')
        .eq('server_id', server_id)
        .maybeSingle();

      if (!serverLookup.data && server_ip) {
        serverLookup = await supabase
          .from('servers')
          .select('server_id, server_ip, license_key')
          .eq('server_ip', server_ip)
          .maybeSingle();
      }

      const serverData = serverLookup.data;
      if (serverLookup.error || !serverData || serverData.license_key !== license_key) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid server credentials' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      const resolvedServerId = serverData.server_id;

      // Ban user on ALL servers, not just the requesting one
      const { data: allServers } = await supabase
        .from('servers')
        .select('server_id');

      const serversToban = allServers || [{ server_id: resolvedServerId }];
      
      for (const srv of serversToban) {
        const { data: existingBan } = await supabase
          .from('bans')
          .select('id, exempted_by_server, is_active')
          .eq('server_id', srv.server_id)
          .eq('player_id', `discord:${discord_id}`)
          .eq('type', 'discord_blacklist')
          .maybeSingle();

        if (existingBan) {
          const exemptions = existingBan.exempted_by_server || [];
          if (exemptions.includes(srv.server_id)) {
            continue;
          }
          // Reactivate if inactive
          if (!existingBan.is_active) {
            await supabase.from('bans').update({ is_active: true }).eq('id', existingBan.id);
          }
          continue;
        }

        await supabase.from('bans').insert({
          server_id: srv.server_id,
          player_id: `discord:${discord_id}`,
          player_name: user_name || 'Unknown',
          reason: `Joined blacklisted Discord server: ${guild_name || 'Unknown'}`,
          banned_by: 'AirShield Blacklist System',
          mode: 'Anticheat',
          type: 'discord_blacklist',
          is_active: true,
          metadata: {
            discord_id: discord_id,
            blacklisted_guild: guild_name
          }
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User banned on all servers for blacklisted server' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Action: check_exemption
    if (action === 'check_exemption') {
      const { discord_id, server_id, server_ip } = body;

      if (!discord_id || (!server_id && !server_ip)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing discord_id or server_id' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      let resolvedServerId = server_id;
      if (!resolvedServerId && server_ip) {
        const { data: serverData } = await supabase
          .from('servers')
          .select('server_id')
          .eq('server_ip', server_ip)
          .maybeSingle();
        resolvedServerId = serverData?.server_id;
      }

      if (!resolvedServerId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Server not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      const { data: ban } = await supabase
        .from('bans')
        .select('exempted_by_server, is_active')
        .eq('player_id', `discord:${discord_id}`)
        .eq('type', 'discord_blacklist')
        .eq('server_id', resolvedServerId)
        .maybeSingle();

      const exemptions = ban?.exempted_by_server || [];
      const isExempted = exemptions.includes(resolvedServerId) || ban?.is_active === false;

      return new Response(
        JSON.stringify({ success: true, exempted: isExempted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Action: global_unban - Remove all blacklist bans for a discord_id
    if (action === 'global_unban') {
      const { discord_id } = body;

      if (!discord_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing discord_id' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Set all discord_blacklist bans to inactive instead of deleting
      const { error: updateError } = await supabase
        .from('bans')
        .update({ is_active: false })
        .eq('type', 'discord_blacklist')
        .or(`metadata->>discord_id.eq.${discord_id},player_id.eq.discord:${discord_id}`);

      if (updateError) {
        console.error('Error global unbanning:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to unban user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Queue unban_blacklist command to all online servers
      const { data: allServers } = await supabase
        .from('servers')
        .select('server_id')
        .eq('status', 'online');

      if (allServers && allServers.length > 0) {
        for (const server of allServers) {
          await supabase.from('dashboard_commands').insert({
            server_id: server.server_id,
            command_type: 'unban_blacklist',
            command_data: { discord_id },
            status: 'pending'
          });
        }
        console.log(`Queued unban_blacklist commands to ${allServers.length} online servers`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User unbanned globally' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Action: global_reban - Re-ban user on all servers after a global unban
    if (action === 'global_reban') {
      const { discord_id, reason, blacklisted_guild, player_name } = body;

      if (!discord_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing discord_id' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Reactivate all existing discord_blacklist bans for this user
      const { data: existingBans, error: fetchError } = await supabase
        .from('bans')
        .select('id, server_id, exempted_by_server')
        .eq('type', 'discord_blacklist')
        .or(`metadata->>discord_id.eq.${discord_id},player_id.eq.discord:${discord_id}`);

      if (fetchError) {
        console.error('Error fetching bans for reban:', fetchError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to reban user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const existingServerIds = new Set((existingBans || []).map(b => b.server_id));

      // Reactivate existing bans (clear exemptions too)
      for (const ban of (existingBans || [])) {
        await supabase
          .from('bans')
          .update({ is_active: true, exempted_by_server: [] })
          .eq('id', ban.id);
      }

      // Get all servers and create bans for any missing servers
      const { data: allServers } = await supabase
        .from('servers')
        .select('server_id');

      for (const server of (allServers || [])) {
        if (!existingServerIds.has(server.server_id)) {
          await supabase.from('bans').insert({
            server_id: server.server_id,
            player_id: `discord:${discord_id}`,
            player_name: player_name || 'Unknown',
            reason: reason || `Joined blacklisted Discord server: ${blacklisted_guild || 'Unknown'}`,
            banned_by: 'AirShield Blacklist System',
            mode: 'Anticheat',
            type: 'discord_blacklist',
            is_active: true,
            metadata: {
              discord_id: discord_id,
              blacklisted_guild: blacklisted_guild || 'Unknown'
            }
          });
        }
      }

      // Queue ban commands to all online servers
      const { data: onlineServers } = await supabase
        .from('servers')
        .select('server_id')
        .eq('status', 'online');

      if (onlineServers && onlineServers.length > 0) {
        for (const server of onlineServers) {
          await supabase.from('dashboard_commands').insert({
            server_id: server.server_id,
            command_type: 'ban',
            command_data: {
              player_id: `discord:${discord_id}`,
              player_name: player_name || 'Unknown',
              reason: reason || `Re-banned: Joined blacklisted Discord server`,
              license: `discord:${discord_id}`
            },
            status: 'pending'
          });
        }
        console.log(`Queued ban commands to ${onlineServers.length} online servers`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User re-banned on all servers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
