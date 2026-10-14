import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const BAN_SYNC_SKIP_VALUES = new Set(['', 'onbekend', 'offline', 'null', 'n/a', 'unknown'])

function isInvalidBanIdentifier(value: unknown) {
  if (value == null) return true
  const s = String(value).trim()
  if (!s) return true
  return BAN_SYNC_SKIP_VALUES.has(s.toLowerCase())
}

function normalizeBansList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((b) => b && typeof b === 'object') as Record<string, unknown>[]
  if (raw && typeof raw === 'object') {
    const vals = Object.values(raw as Record<string, unknown>).filter((b) => b && typeof b === 'object') as Record<string, unknown>[]
    if (vals.length > 0) return vals
  }
  return []
}

function resolveBanPlayerId(ban: Record<string, unknown>) {
  const banId =
    ban.id?.toString() || ban.BANID?.toString() || ban.ban_id?.toString() || ''
  const license = (ban.license || ban.LICENSE || '').toString()
  const license2 = (ban.license2 || ban.LICENSE2 || '').toString()
  const playerId = (ban.player_id || '').toString()

  if (!isInvalidBanIdentifier(license)) return license
  if (!isInvalidBanIdentifier(license2)) return license2
  if (!isInvalidBanIdentifier(playerId)) return playerId
  if (banId) return `ban_${banId}`
  return null
}

/** Dashboard-only keys — never overwritten by anticheat sync_settings. */
const DASHBOARD_ONLY_KEYS = [
  'blacklist_block_enabled',
  'scheduled_tasks',
  'airshield_whitelist_entries',
  'airshield_admin_json',
]

function mergeServerSettingsForWrite(
  prev: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const p = prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {}
  const inc = incoming && typeof incoming === 'object' && !Array.isArray(incoming) ? incoming : {}
  const prevWebhooks =
    p.discord_webhooks && typeof p.discord_webhooks === 'object' ? (p.discord_webhooks as Record<string, unknown>) : {}
  const incWebhooks =
    inc.discord_webhooks && typeof inc.discord_webhooks === 'object'
      ? (inc.discord_webhooks as Record<string, unknown>)
      : {}
  const merged: Record<string, unknown> = {
    ...p,
    ...inc,
    discord_webhooks: { ...prevWebhooks, ...incWebhooks },
  }
  for (const key of DASHBOARD_ONLY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(p, key)) {
      merged[key] = p[key]
    }
  }
  return merged
}

function readAirshieldAdminJson(settings: unknown): Record<string, unknown> | null {
  let parsed: unknown = settings
  if (typeof settings === 'string') {
    try {
      parsed = JSON.parse(settings)
    } catch {
      return null
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const admin = (parsed as Record<string, unknown>).airshield_admin_json
  if (!admin || typeof admin !== 'object' || Array.isArray(admin)) return null
  return admin as Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json().catch(() => ({}))
    console.log('[Report] Received request:', JSON.stringify(body))
    
    // Support both server_ip (new) and server_id (legacy) for backwards compatibility
    const server_ip = body.server_ip
    const server_id_input = body.server_id
    const license_key = body.license_key
    const report_type = body.report_type

    if ((!server_ip && !server_id_input) || !license_key) {
      console.log('[Report] Missing server_ip/server_id or license_key')
      return new Response(JSON.stringify({ error: 'Missing server_ip/server_id or license_key' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify server — license_key first, then server_id, then IP fallbacks
    const serverIp = server_ip ? String(server_ip) : null
    const cleanServerIp = serverIp ? serverIp.replace(/:\d+$/, '') : null

    const lookupServer = async (ip: string) => supabase
      .from('servers')
      .select('server_id, license_key, server_ip')
      .eq('server_ip', ip)
      .maybeSingle()

    let server = null as any
    let serverError = null as any

    // Prefer explicit server_id from the verified resource. License keys can be reused
    // across rows during resets/migrations, while dashboard writes are keyed by server_id.
    if (server_id_input) {
      console.log(`[Report] Looking up server with server_id: ${server_id_input}`)
      const byId = await supabase
        .from('servers')
        .select('server_id, license_key, server_ip')
        .eq('server_id', server_id_input)
        .maybeSingle()
      server = byId.data
      serverError = byId.error
    }

    if ((!server || serverError) && license_key) {
      console.log(`[Report] Fallback lookup with license_key`)
      const byLicense = await supabase
        .from('servers')
        .select('server_id, license_key, server_ip')
        .eq('license_key', license_key)
        .maybeSingle()
      server = byLicense.data
      serverError = byLicense.error
    }

    if ((!server || serverError) && serverIp) {
      console.log(`[Report] Looking up server with IP: ${serverIp}`)
      const primary = await lookupServer(serverIp)
      server = primary.data
      serverError = primary.error
    }

    if ((!server || serverError) && cleanServerIp && cleanServerIp !== serverIp) {
      console.log(`[Report] Fallback lookup with clean IP: ${cleanServerIp}`)
      const fallback = await lookupServer(cleanServerIp)
      server = fallback.data
      serverError = fallback.error
    }

    if ((!server || serverError) && cleanServerIp) {
      // Final fallback: match stored server_ip that includes port when client sends no port
      if (cleanServerIp === serverIp) {
        console.log(`[Report] Fallback lookup with IP prefix: ${serverIp}`)
        const prefixLookup = await supabase
          .from('servers')
          .select('server_id, license_key, server_ip')
          .like('server_ip', `${serverIp}:%`)
          .limit(1)
          .maybeSingle()
        server = prefixLookup.data
        serverError = prefixLookup.error
      }
    }

    if (serverError) {
      console.log('[Report] Server lookup error:', serverError.message)
      return new Response(JSON.stringify({ error: 'Server not found' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!server || server.license_key !== license_key) {
      console.log('[Report] Invalid license key')
      return new Response(JSON.stringify({ error: 'Invalid server or license key' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if server has expired
    const { data: serverFull } = await supabase
      .from('servers')
      .select('expires_at')
      .eq('server_id', server.server_id)
      .maybeSingle()

    if (serverFull?.expires_at) {
      const expiresAt = new Date(serverFull.expires_at)
      if (expiresAt < new Date()) {
        console.log(`[Report] Server ${server.server_id} has expired (${serverFull.expires_at})`)
        return new Response(JSON.stringify({ error: 'Server license expired', expired: true }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Use the server_id from the database for all operations
    const server_id = server.server_id
    console.log(`[Report] Server verified, server_id: ${server_id}`)

    // Helper: update servers status to online (heartbeat)
    const markOnline = async () => {
      await supabase.from('servers').update({ status: 'online', last_update: new Date().toISOString() }).eq('server_id', server_id)
    }

    // ---------- server status (started/stopped/heartbeat) ----------
    if (report_type === 'server_status') {
      const event = body.event
      console.log(`[Report] Server status event: ${event}`)
      
      if (event === 'started') {
        await supabase.from('servers').update({ status: 'online', last_update: new Date().toISOString() }).eq('server_id', server_id)
        await supabase.from('consoles').upsert({ server_id, logs: [{ ts: Date.now(), message: '?? Server started' }], updated_at: new Date().toISOString() }, { onConflict: 'server_id' })
      } else if (event === 'stopped') {
        await supabase.from('servers').update({ status: 'offline', last_update: new Date().toISOString() }).eq('server_id', server_id)
        await supabase.from('players_snapshots').upsert({
          server_id,
          snapshot: [],
          total_players: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'server_id' })
        await supabase.from('consoles').upsert({ server_id, logs: [{ ts: Date.now(), message: '?? Server stopped' }], updated_at: new Date().toISOString() }, { onConflict: 'server_id' })
      } else if (event === 'heartbeat') {
        await markOnline()
      }

      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- players_snapshot: replace by upsert (one row per server) ----------
    if (report_type === 'players_snapshot') {
      const snapshot = Array.isArray(body.snapshot) ? body.snapshot : []
      const total_players = snapshot.length
      const max_players = Number(body.max_players || body.metadata?.max_players || body.metadata?.maxClients || body.metadata?.slots) || 32
      const server_name = String(body.server_name || body.metadata?.server_name || body.metadata?.hostname || '').trim()
      const server_logo = String(body.server_logo || body.metadata?.server_logo || body.metadata?.server_logo_url || '').trim()

      const metadata = {
        max_players,
        maxClients: max_players,
        slots: max_players,
        server_name: server_name || undefined,
        server_logo: server_logo || undefined,
        server_logo_url: server_logo || undefined
      }

      console.log(`[Report] Players snapshot with ${total_players} players for ${server_name || server_id}`)

      await supabase.from('players_snapshots').upsert({
        server_id,
        snapshot,
        total_players,
        metadata,
        updated_at: new Date().toISOString()
      }, { onConflict: 'server_id' })

      if (server_name && server_name !== 'Onbekend') {
        await supabase.from('servers').update({
          display_name: server_name
        }).eq('server_id', server_id)
      }

      await markOnline()

      return new Response(JSON.stringify({ status: 'ok', inserted: 1 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- console_logs: append only new logs, keep last 1000 ----------
    if (report_type === 'console_logs') {
      const console_logs = Array.isArray(body.console_logs) ? body.console_logs : []
      console.log(`[Report] Received ${console_logs.length} console logs`)

      if (console_logs.length === 0) {
        await markOnline()
        return new Response(JSON.stringify({ status: 'ok', appended: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Read existing logs
      const { data: existingRow } = await supabase
        .from('consoles')
        .select('logs')
        .eq('server_id', server_id)
        .maybeSingle()

      const existingLogs = Array.isArray(existingRow?.logs) ? existingRow.logs : []

      // Find max ts from existing
      const existingMaxTs = existingLogs.length ? Math.max(...existingLogs.map((l:any) => Number(l.ts) || 0)) : 0

      // Filter new logs
      const filtered = console_logs.filter((l:any) => {
        const t = Number(l.ts) || 0
        return t > existingMaxTs
      })

      if (filtered.length === 0) {
        await markOnline()
        return new Response(JSON.stringify({ status: 'ok', appended: 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const merged = existingLogs.concat(filtered)
      const keep = merged.slice(-1000)

      const { error: upsertError } = await supabase.from('consoles').upsert({
        server_id,
        logs: keep,
        updated_at: new Date().toISOString()
      }, { onConflict: 'server_id' })

      if (upsertError) {
        console.error('[Report] Upsert error:', upsertError)
        return new Response(JSON.stringify({ error: 'Failed to save logs' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await markOnline()
      console.log(`[Report] Saved ${filtered.length} new logs`)

      return new Response(JSON.stringify({ status: 'ok', appended: filtered.length, total: keep.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- poll_commands: fetch pending commands for server ----------
    if (report_type === 'poll_commands') {
      console.log(`[Report] Polling commands for server ${server_id}`)

      // NOTE: update_settings payloads can be large.
      // We return a small stub for update_settings (fetch_settings=true) and let FiveM fetch the
      // latest settings snapshot via report_type=get_settings.
      // Also: do NOT starve update_settings behind other pending commands (otherwise it can sit
      // pending forever if other commands are stuck). We always include at most 1 update_settings.

      // IMPORTANT: supabase-js query builders are mutable; do NOT reuse the same builder
      // across different queries (filters can accumulate unexpectedly).
      const buildBaseQuery = () =>
        supabase
          .from('dashboard_commands')
          .select('*')
          .eq('server_id', server_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

      // 1) Always return ALL pending player-moderation commands (never starve behind streams/monitoring)
      const PRIORITY_CMD_TYPES = [
        'kick',
        'ban',
        'unban',
        'warn',
        'unwarn',
        'blacklist_block',
        'request_peer_stream',
        'stop_peer_stream',
      ]
      const { data: priorityCommands, error: cmdErrorPriority } = await buildBaseQuery()
        .in('command_type', PRIORITY_CMD_TYPES)
        .limit(20)

      if (cmdErrorPriority) {
        console.error('[Report] Commands fetch error (priority):', cmdErrorPriority)
        return new Response(JSON.stringify({ error: 'Failed to fetch commands' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 2) Fetch up to 2 other non-settings commands (small payload)
      const { data: commandsNonSettings, error: cmdError1 } = await buildBaseQuery()
        .not('command_type', 'in', `(${[...PRIORITY_CMD_TYPES, 'update_settings', 'update_admin_json'].join(',')})`)
        .limit(2)

      if (cmdError1) {
        console.error('[Report] Commands fetch error:', cmdError1)
        return new Response(JSON.stringify({ error: 'Failed to fetch commands' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // 2) Also include 1 update_settings stub if pending
      const { data: commandsSettings, error: cmdError2 } = await buildBaseQuery()
        .eq('command_type', 'update_settings')
        .limit(1)

      if (cmdError2) {
        console.error('[Report] Commands fetch error (settings):', cmdError2)
        return new Response(JSON.stringify({ error: 'Failed to fetch commands' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const slimSettingsCommands = (commandsSettings || []).map((cmd: any) => ({
        id: cmd.id,
        server_id: cmd.server_id,
        command_type: cmd.command_type,
        created_at: cmd.created_at,
        status: cmd.status,
        command_data: { fetch_settings: true },
      }))

      const { data: commandsAdminJson, error: cmdError3 } = await buildBaseQuery()
        .eq('command_type', 'update_admin_json')
        .limit(1)

      if (cmdError3) {
        console.error('[Report] Commands fetch error (admin json):', cmdError3)
        return new Response(JSON.stringify({ error: 'Failed to fetch commands' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const merged = ([] as any[])
        .concat(priorityCommands || [])
        .concat(commandsAdminJson || [])
        .concat(commandsNonSettings || [])
        .concat(slimSettingsCommands)

      let adminJson: Record<string, unknown> | null = null
      try {
        const { data: settingsRow } = await supabase
          .from('server_settings')
          .select('settings')
          .eq('server_id', server_id)
          .maybeSingle()
        adminJson = readAirshieldAdminJson(settingsRow?.settings ?? null)
      } catch {
        /* ignore */
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok', server_id, commands: merged, admin_json: adminJson }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ---------- get_settings: FiveM fetches the latest settings snapshot (server_settings) ----------
    // Used by site.lua when it receives update_settings stub from poll_commands.
    if (report_type === 'get_settings') {
      console.log(`[Report] get_settings for server ${server_id}`)

      const { data: row, error } = await supabase
        .from('server_settings')
        .select('settings, anti_objects, anti_blackwords, updated_at')
        .eq('server_id', server_id)
        .maybeSingle()

      if (error) {
        console.error('[Report] get_settings error:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await markOnline()
      const adminJson = readAirshieldAdminJson(row?.settings ?? null)
      return new Response(
        JSON.stringify({
          status: 'ok',
          server_id,
          settings: row?.settings ?? {},
          admin_json: adminJson,
          anti_objects: row?.anti_objects ?? [],
          anti_blackwords: row?.anti_blackwords ?? [],
          updated_at: row?.updated_at ?? null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---------- command_result: update command status + keep history for Activity page ----------
    if (report_type === 'command_result') {
      const { command_id, result, success } = body
      const cmdId = command_id != null ? String(command_id).trim() : ''
      console.log(`[Report] Command result for ${cmdId}: success=${success}`)
      console.log(`[Report] Result type: ${typeof result}, Result: ${typeof result === 'string' ? result.substring(0, 200) : JSON.stringify(result).substring(0, 200)}`)

      if (!cmdId) {
        return new Response(JSON.stringify({ error: 'Missing command_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let resultValue: any = result
      if (typeof result === 'string') {
        try {
          resultValue = JSON.parse(result)
        } catch (_) {
          resultValue = result
        }
      }
      // JSONB column: plain strings/booleans must be wrapped or PostgREST can reject the update.
      let resultForDb: Record<string, unknown> | unknown[]
      if (resultValue !== null && typeof resultValue === 'object' && !Array.isArray(resultValue)) {
        resultForDb = resultValue as Record<string, unknown>
      } else if (Array.isArray(resultValue)) {
        resultForDb = resultValue
      } else if (typeof resultValue === 'string') {
        resultForDb = { message: resultValue }
      } else if (typeof resultValue === 'boolean' || typeof resultValue === 'number') {
        resultForDb = { value: resultValue }
      } else {
        resultForDb = { message: String(resultValue ?? '') }
      }

      const { error: updateError } = await supabase
        .from('dashboard_commands')
        .update({
          status: success ? 'completed' : 'failed',
          result: resultForDb,
          executed_at: new Date().toISOString(),
        })
        .eq('id', cmdId)

      if (updateError) {
        console.error('[Report] Error updating command status:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to update command status' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Cleanup stale pending commands only (don't delete completed/failed history)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      await supabase
        .from('dashboard_commands')
        .delete()
        .eq('server_id', server_id)
        .eq('status', 'pending')
        .neq('command_type', 'update_settings')
        .lt('created_at', fifteenMinutesAgo)

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- sync_bans: get all active bans for server ----------
    if (report_type === 'sync_bans') {
      console.log(`[Report] Syncing bans for server ${server_id}`)
      
      const { data: bans, error: bansError } = await supabase
        .from('bans')
        .select('*')
        .eq('server_id', server_id)
        .eq('is_active', true)

      if (bansError) {
        console.error('[Report] Bans fetch error:', bansError)
        return new Response(JSON.stringify({ error: 'Failed to fetch bans' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok', bans: bans || [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- unban_from_anticheat: when player is unbanned from game/bans.json ----------
    if (report_type === 'unban_from_anticheat') {
      const { player_id, player_name, unbanned_by } = body
      console.log(`[Report] Unban from anticheat for player: ${player_name || player_id}`)
      
      // Soft-deactivate (same as sync_bans_from_anticheat) so lifetime ban totals are preserved.
      if (player_id) {
        await supabase
          .from('bans')
          .update({ is_active: false })
          .eq('server_id', server_id)
          .eq('is_active', true)
          .eq('player_id', player_id)
      } else if (player_name) {
        await supabase
          .from('bans')
          .update({ is_active: false })
          .eq('server_id', server_id)
          .eq('is_active', true)
          .eq('player_name', player_name)
      }

      // Log the unban in kicks table for activity tracking
      await supabase.from('kicks').insert({
        server_id,
        player_id: player_id || 'unknown',
        player_name: player_name || 'Unknown',
        reason: `Unbanned by ${unbanned_by || 'In-game/Command'}`,
        kicked_by: unbanned_by || 'Server',
        mode: 'Unban',
        type: 'unban'
      })

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- sync_activity_logs: receive logs from anticheat logs.json ----------
    if (report_type === 'sync_activity_logs') {
      const activity_logs = Array.isArray(body.activity_logs) ? body.activity_logs : []
      console.log(`[Report] Syncing ${activity_logs.length} activity logs`)

      for (const log of activity_logs) {
        const logType = log.type?.toUpperCase() || ''
        const player = log.player || 'Unknown'
        const details = log.details || ''
        const admin = log.admin || '-'
        const ts = log.ts || Math.floor(Date.now() / 1000)

        if (logType === 'BAN_PLAYER' || logType === 'BAN') {
          // IMPORTANT: bans state is handled ONLY by sync_bans_from_anticheat (ban.json)
          // Activity logs can still show the ban event, but we must not create DB bans here.
          continue
        } else if (logType === 'KICK_PLAYER' || logType === 'KICK') {
          const { data: existingKick } = await supabase
            .from('kicks')
            .select('id')
            .eq('server_id', server_id)
            .eq('player_name', player)
            .eq('reason', details)
            .maybeSingle()

          if (!existingKick) {
            await supabase.from('kicks').insert({
              server_id,
              player_id: `anticheat_${ts}`,
              player_name: player,
              reason: details,
              kicked_by: admin,
              mode: 'Anticheat'
            })
          }
        } else if (logType === 'WARN_PLAYER' || logType === 'WARN') {
          const { data: existingWarn } = await supabase
            .from('warns')
            .select('id')
            .eq('server_id', server_id)
            .eq('player_name', player)
            .eq('message', details)
            .maybeSingle()

          if (!existingWarn) {
            await supabase.from('warns').insert({
              server_id,
              player_id: `anticheat_${ts}`,
              player_name: player,
              message: details,
              warned_by: admin,
              mode: 'Anticheat'
            })
          }
        }
        // PLAYER_JOIN and PLAYER_LEAVE are info events - can be stored in console logs if needed
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok', synced: activity_logs.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- sync_bans_from_anticheat: receive FULL ban state from anticheat ban.json ----------
    // ban.json is the SINGLE SOURCE OF TRUTH - database will be updated to match exactly
    if (report_type === 'sync_bans_from_anticheat') {
      const bans_list = normalizeBansList(body.bans)
      const replaceAll = body.replace_all === true || body.bans_replace === true
      console.log(`[Report] Syncing ban state from anticheat: ${bans_list.length} bans in ban.json`)

      if (bans_list.length === 0 && !replaceAll) {
        console.warn('[Report] empty bans payload without replace_all — skipping to avoid wiping dashboard')
        await markOnline()
        return new Response(JSON.stringify({ status: 'ok', synced: 0, skipped: 'empty_bans_list' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const banJsonIds = new Set<string>()
      const banJsonLicenses = new Set<string>()
      const skipVals = BAN_SYNC_SKIP_VALUES

      const addBanKeys = (ban: Record<string, unknown>) => {
        const banId = ban.id?.toString() || ban.BANID?.toString() || ban.ban_id?.toString() || ''
        if (banId) banJsonIds.add(banId)
        const addKey = (v: unknown) => {
          if (v == null) return
          const s = String(v).trim()
          if (!s || skipVals.has(s.toLowerCase())) return
          banJsonLicenses.add(s)
          const m = s.match(/^(license2?):(.+)$/i)
          if (m) banJsonLicenses.add(m[2])
        }
        addKey(ban.license)
        addKey(ban.license2)
        addKey(ban.license3)
        addKey(ban.license4)
        addKey(ban.license5)
        addKey(ban.LICENSE)
        addKey(ban.LICENSE2)
        addKey(ban.player_id)
        addKey(ban.discord)
        addKey(ban.steam)
        addKey(ban.fivem)
        addKey(ban.xbl)
      }

      const rowInJson = (dbPlayerId: string, dbBanJsonId: string) => {
        if (dbBanJsonId && banJsonIds.has(String(dbBanJsonId))) return true
        const pid = String(dbPlayerId || '')
        if (!pid) return false
        if (banJsonLicenses.has(pid)) return true
        const bare = pid.replace(/^(license2?):/i, '')
        if (bare !== pid && banJsonLicenses.has(bare)) return true
        return false
      }

      // Process each ban from ban.json
      for (const ban of bans_list) {
        addBanKeys(ban)

        const banId = ban.id?.toString() || ban.BANID?.toString() || ban.ban_id?.toString() || ''

        // Extract other fields
        const playerName = ban.name || ban.player_name || ban.player || 'Unknown'
        const reason = ban.reason || ban.details || 'No reason'
        const bannedBy = ban.banned_by || ban.admin || 'Anticheat'
        const mode = ban.mode || 'Anticheat'
        const screenshot = ban.screenshot_url || ban.screenshot || null

        const pid = resolveBanPlayerId(ban)
        
        if (!pid) {
          console.log(`[Report] Skipping ban with no identifiable player_id:`, ban)
          continue
        }

        // Check if this ban already exists in the database
        const { data: existingBan } = await supabase
          .from('bans')
          .select('id')
          .eq('server_id', server_id)
          .eq('player_id', pid)
          .maybeSingle()

        if (existingBan) {
          // Update existing ban
          await supabase.from('bans').update({
            player_name: playerName,
            reason: reason,
            banned_by: bannedBy,
            mode: mode,
            is_active: true,
            metadata: { 
              ban_json_id: banId,
              id: banId,
              screenshot_url: screenshot,
              ...ban
            } as any,
          }).eq('id', existingBan.id)
        } else {
          // Insert new ban
          await supabase.from('bans').insert({
            server_id,
            player_id: pid,
            player_name: playerName,
            reason: reason,
            banned_by: bannedBy,
            mode: mode,
            type: 'ban',
            is_active: true,
            metadata: { 
              ban_json_id: banId,
              id: banId,
              screenshot_url: screenshot,
              ...ban
            } as any,
          })
        }
      }

      if (replaceAll || bans_list.length > 0) {
        const { data: existingActive, error: existingErr } = await supabase
          .from('bans')
          .select('id, player_id, metadata, type')
          .eq('server_id', server_id)
          .eq('is_active', true)

        if (existingErr) {
          console.error('[Report] Failed to fetch existing bans:', existingErr)
        } else {
          const toDelete: string[] = []
          
          for (const dbBan of (existingActive || [])) {
            // NEVER delete discord_blacklist bans - they are managed by the blacklist system
            if (dbBan.type === 'discord_blacklist') {
              console.log(`[Report] Preserving discord_blacklist ban: id=${dbBan.id}`)
              continue
            }
            
            const dbPlayerId = String(dbBan.player_id || '')
            const dbBanJsonId = (dbBan.metadata as any)?.ban_json_id || (dbBan.metadata as any)?.id || ''
            
            const existsInBanJson = rowInJson(dbPlayerId, dbBanJsonId)
            
            if (!existsInBanJson) {
              toDelete.push(dbBan.id)
              console.log(`[Report] Will deactivate ban: id=${dbBan.id}, player_id=${dbPlayerId}, ban_json_id=${dbBanJsonId}`)
            }
          }

          if (toDelete.length > 0) {
            console.log(`[Report] Deactivating ${toDelete.length} bans not in ban.json (preserving discord_blacklist)`)
            for (const id of toDelete) {
              await supabase.from('bans').update({ is_active: false }).eq('id', id)
            }
          } else {
            console.log(`[Report] No bans to deactivate - all ${existingActive?.length || 0} DB bans match ban.json`)
          }
        }
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok', synced: bans_list.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- get_settings: fetch settings from dashboard for anticheat ----------
    if (report_type === 'get_settings') {
      console.log(`[Report] Fetching settings for server ${server_id}`)
      
      const { data: settings, error: settingsError } = await supabase
        .from('server_settings')
        .select('*')
        .eq('server_id', server_id)
        .maybeSingle()

      if (settingsError) {
        console.error('[Report] Settings fetch error:', settingsError)
        return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await markOnline()
      return new Response(JSON.stringify({ 
        status: 'ok', 
        settings: settings?.settings || null,
        discord_webhook: settings?.discord_webhook || null,
        anti_objects: settings?.anti_objects || [],
        anti_blackwords: settings?.anti_blackwords || []
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- sync_settings: save settings from anticheat config.lua to dashboard ----------
    if (report_type === 'sync_settings') {
      console.log(`[Report] Saving settings from anticheat for server ${server_id}`)
      
      const settings = body.settings || {}
      const discord_webhooks = body.discord_webhooks || {}
      const anti_objects = body.anti_objects || []
      const anti_blackwords = body.anti_blackwords || []

      const { data: existingRow } = await supabase
        .from('server_settings')
        .select('settings')
        .eq('server_id', server_id)
        .maybeSingle()

      const mergedSettings = mergeServerSettingsForWrite(
        (existingRow?.settings as Record<string, unknown> | null) ?? {},
        { ...settings, discord_webhooks }
      )

      const { error: upsertError } = await supabase
        .from('server_settings')
        .upsert({
          server_id,
          settings: mergedSettings,
          anti_objects,
          anti_blackwords,
          discord_webhook: discord_webhooks.mainLogs || discord_webhooks.logsBans || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'server_id' })

      if (upsertError) {
        console.error('[Report] Settings upsert error:', upsertError)
        return new Response(JSON.stringify({ error: 'Failed to save settings' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- sync_resources: receive resource list from anticheat and store as single row ----------
    if (report_type === 'sync_resources') {
      const resources_list = Array.isArray(body.resources) ? body.resources : []
      console.log(`[Report] Syncing ${resources_list.length} resources for server ${server_id}`)
      
      // Upsert single row per server with all resources as JSONB
      const { error: upsertError } = await supabase
        .from('server_resources')
        .upsert({
          server_id,
          resources: resources_list,
          total_count: resources_list.length,
          updated_at: new Date().toISOString()
        }, { onConflict: 'server_id' })

      if (upsertError) {
        console.error('[Report] Resources upsert error:', upsertError)
        // If table doesn't exist, return success anyway (graceful degradation)
        if (upsertError.message?.includes('does not exist')) {
          console.log('[Report] server_resources table does not exist, skipping storage')
          await markOnline()
          return new Response(JSON.stringify({ status: 'ok', synced: resources_list.length, note: 'table_not_found' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        console.log(`[Report] ? Synced ${resources_list.length} resources for server ${server_id}`)
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok', synced: resources_list.length }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- get_resources: directly fetch resources from server (immediate response) ----------
    if (report_type === 'get_resources') {
      console.log(`[Report] get_resources request for server ${server_id}`)
      
      // Fetch from consolidated single row per server
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('server_resources')
        .select('resources, total_count')
        .eq('server_id', server_id)
        .maybeSingle()

      if (resourcesError && !resourcesError.message?.includes('does not exist')) {
        console.error('[Report] Error fetching resources:', resourcesError)
      }

      const resources = Array.isArray(resourcesData?.resources) ? resourcesData.resources : []

      await markOnline()
      return new Response(JSON.stringify({ 
        status: 'ok', 
        resources: resources,
        count: resources.length 
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ---------- resource_event: handle resource detection/start/stop events ----------
    if (report_type === 'resource_event') {
      const event_type = body.event_type
      const resource_name = body.resource_name
      const resource_status = body.status || 'unknown'
      const resource_type = body.type || 'existing'
      
      console.log(`[Report] Resource event: ${event_type} for ${resource_name} (status: ${resource_status})`)

      if (resource_name) {
        // Fetch current resources, update the specific one, and save back
        const { data: existingRow } = await supabase
          .from('server_resources')
          .select('resources')
          .eq('server_id', server_id)
          .maybeSingle()

        let resources = Array.isArray(existingRow?.resources) ? [...existingRow.resources] : []
        
        // Find and update or add the resource
        const existingIdx = resources.findIndex((r: any) => r.name === resource_name)
        if (existingIdx >= 0) {
          resources[existingIdx] = {
            ...resources[existingIdx],
            status: resource_status.toLowerCase(),
            type: resource_type
          }
        } else {
          resources.push({
            name: resource_name,
            status: resource_status.toLowerCase(),
            type: resource_type
          })
        }

        // Upsert the consolidated row
        const { error: upsertError } = await supabase
          .from('server_resources')
          .upsert({
            server_id,
            resources,
            total_count: resources.length,
            updated_at: new Date().toISOString()
          }, { onConflict: 'server_id' })

        if (upsertError) {
          console.error('[Report] Resource event upsert error:', upsertError)
        } else {
          console.log(`[Report] ? Updated resource ${resource_name} to status ${resource_status}`)
        }
      }

      await markOnline()
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`[Report] Invalid report_type: ${report_type}`)
    return new Response(JSON.stringify({ error: 'invalid report_type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: 'internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
