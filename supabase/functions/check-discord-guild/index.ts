import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Your Discord server guild ID — we'll resolve this from the invite
const TARGET_GUILD_ID = Deno.env.get('DISCORD_GUILD_ID') || '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
    if (!BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN is not configured');
    }

    if (!TARGET_GUILD_ID) {
      throw new Error('DISCORD_GUILD_ID is not configured');
    }

    const { discord_id, access_token, action } = await req.json();

    // Action: check_and_join — Check if user is in the guild, try to add them if not
    if (action === 'check_and_join') {
      if (!discord_id) {
        return new Response(
          JSON.stringify({ error: 'Missing discord_id' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Step 1: Check if user is already a member using Bot API
      const memberRes = await fetch(
        `https://discord.com/api/v10/guilds/${TARGET_GUILD_ID}/members/${discord_id}`,
        { headers: { 'Authorization': `Bot ${BOT_TOKEN}` } }
      );

      if (memberRes.ok) {
        // User is already in the server
        return new Response(
          JSON.stringify({ in_guild: true, joined: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 2: If not a member and we have an access_token, try to add them
      if (access_token) {
        console.log(`Attempting to add user ${discord_id} to guild ${TARGET_GUILD_ID}`);
        const addRes = await fetch(
          `https://discord.com/api/v10/guilds/${TARGET_GUILD_ID}/members/${discord_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bot ${BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token }),
          }
        );

        if (addRes.status === 201) {
          // Successfully added
          console.log(`Successfully added user ${discord_id} to guild`);
          return new Response(
            JSON.stringify({ in_guild: true, joined: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (addRes.status === 204) {
          // Already a member (race condition)
          return new Response(
            JSON.stringify({ in_guild: true, joined: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          const errText = await addRes.text();
          console.error(`Failed to add user to guild: ${addRes.status} ${errText}`);
        }
      }

      // User is NOT in the guild and we couldn't add them
      return new Response(
        JSON.stringify({ in_guild: false, joined: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: resolve_invite — Resolve an invite code to get guild ID (utility)
    if (action === 'resolve_invite') {
      const { invite_code } = await req.json();
      const res = await fetch(`https://discord.com/api/v10/invites/${invite_code}`);
      const data = await res.json();
      return new Response(
        JSON.stringify({ guild_id: data.guild?.id, guild_name: data.guild?.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
