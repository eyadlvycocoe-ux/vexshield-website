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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const backend = process.env.AIRSHIELD_BACKEND_URL || process.env.API_URL;
  if (backend) {
    try {
      const r = await fetch(`${String(backend).replace(/\/$/, '')}/api/home-feedbacks`, {
        cache: 'no-store',
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    } catch (e) {
      return res.status(502).json({ error: String(e.message || e) });
    }
  }
  return res.status(200).json([]);
}
