import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Simple headers for maximum compatibility with FiveM HTTP client
const ALLOWED_ORIGINS = new Set([
  'https://aircore.xyz',
  'https://www.aircore.xyz',
  'https://airsheild.xyz',
  'https://www.airsheild.xyz',
])
const headers = {
  'Access-Control-Allow-Origin': '',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const origin = req.headers.get('origin') || ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.aircore.xyz'
  headers['Access-Control-Allow-Origin'] = allowOrigin
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers 
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify([]),
      { headers }
    );
  }

  try {
    console.log('Fetching servers data for export...');

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all servers
    const { data: servers, error } = await supabase
      .from('servers')
      .select('server_id, server_ip, license_key, expires_at')
      .order('created_at', { ascending: false });

    // If DB fails, fallback to storage backup
    let formattedServers: Array<Record<string, string>> = [];
    if (error) {
      console.error('Error fetching servers, falling back to storage backup:', error);
      const BUCKET = 'airshield-exports';
      const OBJECT = 'licenses-secret-x8f9v2m4p1q7z3w5.json';
      try {
        const storage = createClient(supabaseUrl, supabaseServiceKey);
        const { data: file } = await storage.storage.from(BUCKET).download(OBJECT);
        if (file) {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            formattedServers = parsed;
          }
        }
      } catch (e) {
        console.error('Storage backup read failed:', e);
      }
      return new Response(JSON.stringify(formattedServers), { headers });
    }

    console.log(`Found ${servers?.length || 0} servers`);

    // Format the data as requested - simple format for FiveM
    formattedServers = (servers || []).map((server) => {
      let expirationTime = 'permanent';
      
      if (server.expires_at) {
        const expiresDate = new Date(server.expires_at);
        // Format as DD/MM/YYYY
        const day = expiresDate.getDate().toString().padStart(2, '0');
        const month = (expiresDate.getMonth() + 1).toString().padStart(2, '0');
        const year = expiresDate.getFullYear();
        expirationTime = `${day}/${month}/${year}`;
      }

      return {
        "server id": server.server_id || '',
        "server ip": server.server_ip || '',
        "license": server.license_key || '',
        "expiration time": expirationTime
      };
    });

    console.log('Servers export successful');

    // Return plain JSON
    return new Response(JSON.stringify(formattedServers), { status: 200, headers });

  } catch (error) {
    console.error('Error in servers-export function:', error);
    // Return empty array on error to prevent FiveM crash
    return new Response(
      JSON.stringify([]),
      { 
        status: 200, 
        headers 
      }
    );
  }
});
