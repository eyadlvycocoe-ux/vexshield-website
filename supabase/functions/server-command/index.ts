/// <reference path="../types.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const server_identifier = body.server_id || body.server_ip
    const license_key = body.license_key
    const command_type = body.command_type
    const command_data = body.command_data

    console.log(`[Server-Command] Received request: command_type=${command_type}, server_id=${server_identifier}`)

    if (!server_identifier || !license_key) {
      console.error('[Server-Command] Missing credentials:', { server_identifier: !!server_identifier, license_key: !!license_key })
      return new Response(
        JSON.stringify({ error: 'Missing server_id/server_ip or license_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify server credentials (support server_id OR server_ip)
    let serverLookup = await supabase
      .from('servers')
      .select('server_id, server_ip, license_key')
      .eq('server_id', server_identifier)
      .maybeSingle()

    if (!serverLookup.data) {
      serverLookup = await supabase
        .from('servers')
        .select('server_id, server_ip, license_key')
        .eq('server_ip', server_identifier)
        .maybeSingle()
    }

    const server = serverLookup.data

    if (serverLookup.error) {
      console.error('[Server-Command] Server lookup error:', serverLookup.error)
      return new Response(
        JSON.stringify({ error: 'Database error while verifying server', details: serverLookup.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!server) {
      console.error('[Server-Command] Server not found:', server_identifier)
      return new Response(
        JSON.stringify({ error: 'Server not found. Please verify your server is registered.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (server.license_key !== license_key) {
      console.error('[Server-Command] License key mismatch for server:', server_identifier)
      return new Response(
        JSON.stringify({ error: 'Invalid license key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resolvedServerId = server.server_id

    // Handle kick/ban/unban/warn/unwarn/monitoring commands by storing in dashboard_commands for FiveM to execute
    if (command_type === 'kick' || command_type === 'ban' || command_type === 'unban' || command_type === 'warn' || command_type === 'unwarn' || command_type === 'start_monitoring' || command_type === 'stop_monitoring' || command_type === 'request_peer_stream' || command_type === 'stop_peer_stream') {
      if (command_type === 'request_peer_stream') {
        const playerKey = String(
          command_data?.player_id_str ?? command_data?.player_id ?? command_data?.source ?? '',
        ).trim()
        if (playerKey) {
          const { data: pendingRows } = await supabase
            .from('dashboard_commands')
            .select('id, command_data')
            .eq('server_id', resolvedServerId)
            .eq('command_type', 'request_peer_stream')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(12)

          const existing = (pendingRows || []).find((row: { command_data?: Record<string, unknown> }) => {
            const d = row.command_data || {}
            const k = String(d.player_id_str ?? d.player_id ?? d.source ?? '').trim()
            return k === playerKey
          })

          if (existing) {
            const { error: updateError } = await supabase
              .from('dashboard_commands')
              .update({ command_data })
              .eq('id', existing.id)

            if (updateError) {
              console.error('Error coalescing stream command:', updateError)
            } else {
              return new Response(
                JSON.stringify({ success: true, message: 'Stream request updated', coalesced: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
              )
            }
          }
        }
      }

      const { error: cmdError } = await supabase
        .from('dashboard_commands')
        .insert({
          server_id: resolvedServerId,
          command_type,
          command_data,
          status: 'pending'
        })

      if (cmdError) {
        console.error('Error queueing command:', cmdError)
        return new Response(
          JSON.stringify({ error: 'Failed to queue command' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // IMPORTANT: bans state must come ONLY from ban.json via report:sync_bans_from_anticheat
      // So we do NOT insert/delete bans here.

      // Store non-stateful history items
      if (command_type === 'kick') {
        await supabase.from('kicks').insert({
          server_id: resolvedServerId,
          player_id: command_data.player_id,
          player_name: command_data.player_name || command_data.player_id,
          reason: command_data.reason,
          kicked_by: 'Dashboard',
          mode: 'Manuel'
        })
      } else if (command_type === 'unban') {
        // Immediately soft-deactivate so dashboard updates without waiting for ban.json sync
        const playerId = command_data?.player_id || command_data?.license
        const playerName = command_data?.player_name
        const banId = command_data?.ban_id || command_data?.id

        if (playerId) {
          await supabase
            .from('bans')
            .update({ is_active: false })
            .eq('server_id', resolvedServerId)
            .eq('is_active', true)
            .eq('player_id', playerId)
        } else if (playerName) {
          await supabase
            .from('bans')
            .update({ is_active: false })
            .eq('server_id', resolvedServerId)
            .eq('is_active', true)
            .eq('player_name', playerName)
        }

        if (banId) {
          const { data: activeBans } = await supabase
            .from('bans')
            .select('id, metadata')
            .eq('server_id', resolvedServerId)
            .eq('is_active', true)

          for (const row of activeBans || []) {
            const meta = row.metadata as Record<string, unknown> | null
            const jsonId = String(meta?.ban_json_id || meta?.id || '').trim()
            if (jsonId === String(banId)) {
              await supabase.from('bans').update({ is_active: false }).eq('id', row.id)
            }
          }
        }

        // Log the unban action (ban.json on game server remains source of truth)
        await supabase.from('kicks').insert({
          server_id: resolvedServerId,
          player_id: command_data.player_id || 'unknown',
          player_name: command_data.player_name || command_data.player_id || 'Unknown',
          reason: `Unbanned by Dashboard`,
          kicked_by: 'Dashboard',
          mode: 'Unban',
          type: 'unban'
        })
      } else if (command_type === 'warn') {
        await supabase.from('warns').insert({
          server_id: resolvedServerId,
          player_id: command_data.player_id,
          player_name: command_data.player_name || command_data.player_id,
          message: command_data.reason,
          warned_by: 'Dashboard',
          mode: 'Manuel'
        })
      } else if (command_type === 'unwarn') {
        // Delete the warn record
        let deleteQuery = supabase
          .from('warns')
          .delete()
          .eq('server_id', resolvedServerId)

        if (command_data?.warn_id) {
          deleteQuery = deleteQuery.eq('id', command_data.warn_id)
        } else if (command_data?.player_id) {
          deleteQuery = deleteQuery.eq('player_id', command_data.player_id)
        } else if (command_data?.player_name) {
          deleteQuery = deleteQuery.eq('player_name', command_data.player_name)
        }

        const { error: deleteError } = await deleteQuery

        if (deleteError) {
          console.error('Error deleting warn:', deleteError)
          return new Response(
            JSON.stringify({ error: 'Failed to delete warn record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Command queued successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle entity deletion commands
    const entityCommands = [
      'delete_vehicles', 'delete_all_vehicles',
      'delete_npcs', 'delete_all_npcs',
      'delete_objects', 'delete_all_objects'
    ]
    
    if (entityCommands.includes(command_type)) {
      const { error: cmdError } = await supabase
        .from('dashboard_commands')
        .insert({
          server_id: resolvedServerId,
          command_type,
          command_data: command_data || {},
          status: 'pending'
        })

      if (cmdError) {
        return new Response(
          JSON.stringify({ error: 'Failed to queue command' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Command queued successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle settings update command
    if (command_type === 'update_settings') {
      console.log(`[Server-Command] Queueing settings update for server ${resolvedServerId}`);
      console.log(`[Server-Command] Settings data:`, command_data);
      
      if (!command_data || !command_data.settings) {
        console.error('[Server-Command] Invalid settings data received');
        return new Response(
          JSON.stringify({ error: 'Invalid settings data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error: cmdError } = await supabase
        .from('dashboard_commands')
        .insert({
          server_id: resolvedServerId,
          command_type,
          command_data,
          status: 'pending'
        })
        .select()
        .single()

      if (cmdError) {
        console.error('[Server-Command] Error queuing settings update:', cmdError);
        return new Response(
          JSON.stringify({ error: 'Failed to queue settings update', details: cmdError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[Server-Command] Successfully queued settings update with command_id: ${data?.id}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Settings update queued successfully', command_id: data?.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle console commands
    if (command_type === 'execute_command') {
      const { error: cmdError } = await supabase
        .from('dashboard_commands')
        .insert({
          server_id: resolvedServerId,
          command_type,
          command_data,
          status: 'pending'
        })

      if (cmdError) {
        return new Response(
          JSON.stringify({ error: 'Failed to queue command' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Command queued successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle resource management commands
    const resourceCommands = ['start_resource', 'stop_resource', 'restart_resource', 'sync_resources', 'get_resources']
    if (resourceCommands.includes(command_type)) {
      console.log(`[Server-Command] Queueing resource command: ${command_type} for server ${resolvedServerId}`)
      
      const { data, error: cmdError } = await supabase
        .from('dashboard_commands')
        .insert({
          server_id: resolvedServerId,
          command_type,
          command_data: command_data || {},
          status: 'pending'
        })
        .select()
        .single()

      if (cmdError) {
        console.error('[Server-Command] Error queueing resource command:', cmdError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to queue resource command',
            details: cmdError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`[Server-Command] Successfully queued resource command: ${command_type}`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Resource command queued successfully',
          command_id: data?.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle scheduled tasks update
    if (command_type === 'update_scheduled_tasks') {
      const { data, error: cmdError } = await supabase
        .from('dashboard_commands')
        .insert({
          server_id: resolvedServerId,
          command_type,
          command_data: command_data || {},
          status: 'pending'
        })
        .select()
        .single()

      if (cmdError) {
        return new Response(
          JSON.stringify({ error: 'Failed to queue scheduled tasks update' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Scheduled tasks update queued', command_id: data?.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown command type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[Server-Command] Unexpected error:', error)
    console.error('[Server-Command] Error stack:', error?.stack)
    
    // Return a proper error response that can be parsed by the client
    const errorMessage = error?.message || 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage,
        type: 'internal_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
