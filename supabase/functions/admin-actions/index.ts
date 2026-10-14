import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGINS = ['https://aircore.xyz', 'https://www.aircore.xyz', 'http://localhost:3000', 'http://localhost:5173'];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

/** Resolve profile/auth user by email; repair missing profiles so admin invites work. */
async function resolveUserIdForEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const clean = email.trim().toLowerCase()
  if (!clean) return null

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', clean)
    .maybeSingle()

  if (!profileErr && profile?.id) {
    return { id: profile.id, email: profile.email ?? clean }
  }

  const { data: uid, error: rpcErr } = await supabase.rpc('resolve_user_id_by_email', {
    _email: clean,
  })

  if (rpcErr || uid == null || uid === '') {
    return null
  }

  const userId = String(uid)

  await supabase.from('profiles').upsert(
    {
      id: userId,
      email: clean,
      display_name: clean,
    },
    { onConflict: 'id' },
  )

  return { id: userId, email: clean }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => ({}))
    const { action, server_id, license_key, admin_email, permissions } = body
    const normalizedAdminEmail = typeof admin_email === 'string' ? admin_email.trim().toLowerCase() : null

    if (!server_id || !license_key) {
      return new Response(JSON.stringify({ error: 'Missing server_id or license_key' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // verify server & license_key
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('server_id, license_key, owner_email')
      .eq('server_id', server_id)
      .single()

    const logAdminAction = async (commandType: string, payload: Record<string, any>) => {
      await supabase.from('dashboard_commands').insert({
        server_id,
        command_type: commandType,
        command_data: payload,
        status: 'completed',
        executed_at: new Date().toISOString(),
        result: { source: 'admin-actions', success: true },
      })
    }

    if (serverError || !server || server.license_key !== license_key) {
      return new Response(JSON.stringify({ error: 'Invalid server or license key' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'list_admins') {
      const { data: admins, error } = await supabase
        .from('server_admins')
        .select('user_id, permissions')
        .eq('server_id', server_id)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const userIds = (admins ?? []).map(a => a.user_id)
      let adminList: { email: string; permissions: string[] }[] = []
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('email, id')
          .in('id', userIds)

        if (profilesError) {
          return new Response(JSON.stringify({ error: profilesError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Map profiles to admins with permissions
        adminList = (profiles ?? []).map(p => {
          const admin = admins?.find(a => a.user_id === p.id)
          return {
            email: p.email,
            permissions: (admin?.permissions as string[]) || ['all']
          }
        })
      }

      return new Response(JSON.stringify({ owner_email: server.owner_email, admins: adminList }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'add_admin') {
      if (!admin_email) {
        return new Response(JSON.stringify({ error: 'admin_email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Only server owner can add admins
      const callerEmail = body.caller_email?.trim().toLowerCase()
      if (!callerEmail || callerEmail !== (server.owner_email ?? '').trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Only server owner can manage admins' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const resolved = await resolveUserIdForEmail(supabase, normalizedAdminEmail ?? String(admin_email))

      if (!resolved) {
        return new Response(
          JSON.stringify({
            error:
              'No account found for that email. Ask them to sign up once, or check the spelling (must match their login email).',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Validate permissions - default to ['all'] if not provided
      const adminPermissions = Array.isArray(permissions) && permissions.length > 0 
        ? permissions 
        : ['all']

      // upsert admin with permissions
      const { error: insertError } = await supabase
        .from('server_admins')
        .upsert({ 
          server_id, 
          user_id: resolved.id,
          permissions: adminPermissions
        }, { onConflict: 'server_id, user_id' })

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await logAdminAction('admin_added', { admin_email, permissions: adminPermissions, performed_by: body.performed_by || server.owner_email || 'dashboard' })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update_permissions') {
      if (!admin_email) {
        return new Response(JSON.stringify({ error: 'admin_email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Only server owner can update permissions
      const callerEmail = body.caller_email?.trim().toLowerCase()
      if (!callerEmail || callerEmail !== (server.owner_email ?? '').trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Only server owner can manage admins' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const resolved = await resolveUserIdForEmail(supabase, normalizedAdminEmail ?? String(admin_email))

      if (!resolved) {
        return new Response(JSON.stringify({ error: 'User not found for given email' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Validate permissions
      const adminPermissions = Array.isArray(permissions) && permissions.length > 0 
        ? permissions 
        : ['all']

      // Update admin permissions
      const { error: updateError } = await supabase
        .from('server_admins')
        .update({ permissions: adminPermissions })
        .eq('server_id', server_id)
        .eq('user_id', resolved.id)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await logAdminAction('admin_permissions_updated', { admin_email, permissions: adminPermissions, performed_by: body.performed_by || server.owner_email || 'dashboard' })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'remove_admin') {
      if (!admin_email) {
        return new Response(JSON.stringify({ error: 'admin_email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Only server owner can remove admins
      const callerEmail = body.caller_email?.trim().toLowerCase()
      if (!callerEmail || callerEmail !== (server.owner_email ?? '').trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Only server owner can manage admins' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Prevent removing owner
      if ((normalizedAdminEmail ?? admin_email).toLowerCase() === (server.owner_email ?? '').trim().toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Cannot remove server owner' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const resolved = await resolveUserIdForEmail(supabase, normalizedAdminEmail ?? String(admin_email))

      if (!resolved) {
        return new Response(JSON.stringify({ error: 'User not found for given email' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // delete admin
      const { error: deleteError } = await supabase
        .from('server_admins')
        .delete()
        .eq('server_id', server_id)
        .eq('user_id', resolved.id)

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await logAdminAction('admin_removed', { admin_email, performed_by: body.performed_by || server.owner_email || 'dashboard' })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('admin-actions error:', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})