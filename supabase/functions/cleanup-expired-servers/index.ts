import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running expired servers cleanup...');

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current timestamp
    const now = new Date().toISOString();

    // Find expired servers (where expires_at is not null and is in the past)
    const { data: expiredServers, error: fetchError } = await supabase
      .from('servers')
      .select('id, server_id, server_ip, license_key, expires_at, ban_count')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired servers:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredServers?.length || 0} expired servers`);

    if (!expiredServers || expiredServers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired servers found', deleted: 0 }),
        { headers: corsHeaders }
      );
    }

    // Store ban counts before deletion for record keeping
    const banCounts: { server_id: string; ban_count: number }[] = [];

    // Delete expired servers and their related data
    // NOTE: We keep bans, blacklisted_users, and blacklisted_proofs - those should persist
    // Bans are kept for historical record and security purposes
    const deletedServers = [];
    
    for (const server of expiredServers) {
      console.log(`Deleting expired server: ${server.server_ip} (expires: ${server.expires_at})`);
      
      // Store ban count for logging/archival
      if (server.ban_count) {
        banCounts.push({
          server_id: server.server_id,
          ban_count: server.ban_count
        });
      }
      
      // Delete related data first 
      // NOTE: We do NOT delete bans - they are kept for security/historical purposes
      // Bans stay in the database even after server expires
      // NOTE: We do NOT delete warns - they contribute to total counts
      await supabase.from('kicks').delete().eq('server_id', server.server_id);
      await supabase.from('reports').delete().eq('server_id', server.server_id);
      await supabase.from('players_snapshots').delete().eq('server_id', server.server_id);
      await supabase.from('consoles').delete().eq('server_id', server.server_id);
      await supabase.from('server_settings').delete().eq('server_id', server.server_id);
      await supabase.from('server_admins').delete().eq('server_id', server.server_id);
      await supabase.from('dashboard_commands').delete().eq('server_id', server.server_id);
      await supabase.from('server_resources').delete().eq('server_id', server.server_id);
      
      // Delete the server itself
      const { error: deleteError } = await supabase
        .from('servers')
        .delete()
        .eq('id', server.id);

      if (deleteError) {
        console.error(`Error deleting server ${server.server_ip}:`, deleteError);
      } else {
        deletedServers.push({
          server_id: server.server_id,
          server_ip: server.server_ip,
          license_key: server.license_key,
          expires_at: server.expires_at,
          ban_count: server.ban_count || 0
        });
      }
    }

    console.log(`Successfully deleted ${deletedServers.length} expired servers`);
    console.log('Ban counts archived:', banCounts);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup completed', 
        deleted: deletedServers.length,
        servers: deletedServers,
        archived_ban_counts: banCounts
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in cleanup-expired-servers function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});
