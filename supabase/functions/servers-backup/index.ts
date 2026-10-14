import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://aircore.xyz',
  'https://www.aircore.xyz',
  'https://airsheild.xyz',
  'https://www.airsheild.xyz',
])
const headers = {
  'Access-Control-Allow-Origin': '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Content-Type': 'application/json',
}

const BUCKET = 'airshield-exports'
const OBJECT = 'licenses-secret-x8f9v2m4p1q7z3w5.json'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.aircore.xyz'
  headers['Access-Control-Allow-Origin'] = allowOrigin
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const { server_id, server_ip, license_key, expires_at } = body
    if (!license_key || !server_ip) {
      return new Response(JSON.stringify({ error: 'Missing server_ip or license_key' }), { status: 400, headers })
    }

    // Ensure bucket exists
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

    // Load existing backup
    const { data: file } = await supabase.storage.from(BUCKET).download(OBJECT)
    let backup: Array<{["server id"]?: string; ["server ip"]: string; ["license"]: string; ["expiration time"]: string}> = []
    if (file) {
      const text = await file.text()
      try { backup = JSON.parse(text) } catch { backup = [] }
    }

    // Upsert entry (by license or ip)
    const exp = expires_at
      ? (() => {
          const d = new Date(expires_at)
          const dd = d.getDate().toString().padStart(2, '0')
          const mm = (d.getMonth() + 1).toString().padStart(2, '0')
          const yy = d.getFullYear()
          return `${dd}/${mm}/${yy}`
        })()
      : 'permanent'

    const entry = { "server id": server_id ?? '', "server ip": server_ip, "license": license_key, "expiration time": exp }
    let replaced = false
    backup = backup.map(b => {
      if (b["license"] === license_key || b["server ip"] === server_ip) {
        replaced = true
        return entry
      }
      return b
    })
    if (!replaced) backup.unshift(entry)

    // Save updated backup
    const payload = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(OBJECT, payload, { upsert: true, contentType: 'application/json' })
    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers })
    }

    return new Response(JSON.stringify({ success: true, count: backup.length }), { status: 200, headers })
  } catch (e) {
    console.error('servers-backup error:', e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers })
  }
})
