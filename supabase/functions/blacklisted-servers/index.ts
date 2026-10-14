import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Simple headers for maximum compatibility with FiveM HTTP client
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET with no action or action=list: Return simple JSON array like servers-export
    // Format: [{"discord_server_id": "123", "server_name": "Name", "reason": "Reason"}]
    if (req.method === 'GET' && (!action || action === 'list')) {
      console.log('Fetching blacklisted servers for export...');
      
      const { data: servers, error } = await supabase
        .from('blacklisted_discord_servers')
        .select('discord_server_id, server_name, reason')
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching blacklisted servers:', error);
        return new Response(JSON.stringify([]), { headers });
      }

      console.log(`Found ${servers?.length || 0} blacklisted servers`);

      // Return simple array format for FiveM compatibility
      const formattedServers = (servers || []).map(s => ({
        "discord_server_id": s.discord_server_id,
        "server_name": s.server_name || 'Unknown',
        "reason": s.reason || 'No reason provided'
      }));

      return new Response(JSON.stringify(formattedServers), { status: 200, headers });
    }

    // POST: Check if user's Discord servers are blacklisted
    if (req.method === 'POST') {
      const body = await req.json();
      const { user_discord_servers, discord_id, license_key, server_id, action: bodyAction } = body;

      // Check action for different operations
      if (bodyAction === 'check' || action === 'check') {
        // Validate license key for server requests
        if (license_key && server_id) {
          const { data: serverData, error: serverError } = await supabase
            .from('servers')
            .select('server_id')
            .eq('license_key', license_key)
            .single();

          if (serverError || !serverData) {
            return new Response(
              JSON.stringify({ success: false, error: 'Invalid license key' }),
              { headers, status: 401 }
            );
          }
        }

        // Get all blacklisted server IDs
        const { data: blacklisted, error: blacklistError } = await supabase
          .from('blacklisted_discord_servers')
          .select('discord_server_id, server_name, reason');

        if (blacklistError) throw blacklistError;

        const blacklistedServerIds = new Set((blacklisted || []).map(b => b.discord_server_id));
        const userServers = user_discord_servers || [];

        // Check if any of user's Discord servers are blacklisted
        for (const userServer of userServers) {
          const serverId = typeof userServer === 'string' ? userServer : userServer.id;
          if (blacklistedServerIds.has(serverId)) {
            const blacklistedInfo = (blacklisted || []).find(b => b.discord_server_id === serverId);
            return new Response(
              JSON.stringify({
                success: true,
                blocked: true,
                reason: `You are in a blacklisted Discord server: ${blacklistedInfo?.server_name || serverId}`,
                server_name: blacklistedInfo?.server_name || 'Unknown Server',
                blacklist_reason: blacklistedInfo?.reason || 'No reason provided'
              }),
              { headers, status: 200 }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true, blocked: false }),
          { headers, status: 200 }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { headers, status: 400 }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers, status: 500 }
    );
  }
});
