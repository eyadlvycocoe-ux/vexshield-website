/**
 * Vercel serverless: forwards POST to Express when AIRSHIELD_BACKEND_URL (or API_URL) is set.
 * Set in Vercel: AIRSHIELD_BACKEND_URL=https://your-vps-or-api-host:5000
 * Or point the SPA at the API with VITE_API_BASE_URL so the browser calls Express directly (bypasses this file).
 */
function applyCors(req, res) {
  const o = req.headers.origin;
  if (!o) {
    res.setHeader('Access-Control-Allow-Origin', 'https://aircore.xyz');
    return;
  }
  let ok = false;
  try {
    const h = new URL(o).hostname;
    ok =
      h === 'aircore.xyz' ||
      h.endsWith('.aircore.xyz') ||
      h === 'airsheild.xyz' ||
      h.endsWith('.airsheild.xyz') ||
      h === 'airshield.xyz' ||
      h.endsWith('.airshield.xyz') ||
      h === 'localhost' ||
      h === '127.0.0.1';
  } catch {
    ok = false;
  }
  if (ok) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const backend = process.env.AIRSHIELD_BACKEND_URL || process.env.API_URL;
  if (!backend) {
    // No Express URL on Vercel: avoid fake success without telling the client (see Home.tsx stub check).
    return res.status(200).json({
      success: true,
      stub: true,
      error:
        'Set AIRSHIELD_BACKEND_URL in Vercel to your Express API, or set VITE_API_BASE_URL in the frontend build.',
    });
  }

  const base = String(backend).replace(/\/$/, '');
  try {
    const r = await fetch(`${base}/api/feedback-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 300) };
    }
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
}
