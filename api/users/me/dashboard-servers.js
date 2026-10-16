import { getPool, getUserFromReq, OWNER_DISCORD_IDS } from '../../_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUserFromReq(req);
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pool = getPool();
    const userId = String(user.id);
    const email = String(user.email || '').trim().toLowerCase();

    const isOwnerOrAdmin = OWNER_DISCORD_IDS.includes(userId);

    const SELECT_FIELDS = `
      id, server_id, license_key, display_name, status, owner_email, server_ip,
      expires_at, created_at, last_update,
      ent_airshield, ent_airscanner, ent_airpc, ent_airzeroflood,
      soft_deleted_at, purge_after, deletion_reason
    `;

    const out = [];
    const seen = new Set();

    if (isOwnerOrAdmin) {
      const [allServers] = await pool.query(
        `SELECT ${SELECT_FIELDS} FROM servers WHERE soft_deleted_at IS NULL ORDER BY created_at DESC`
      );
      for (const s of allServers) {
        const isOwner = !!(email && s.owner_email && String(s.owner_email).trim().toLowerCase() === email);
        out.push({
          ...s,
          isOwner,
          player_count: 0,
          bans_count: s.ban_count || 0,
        });
      }
      return res.status(200).json(out);
    }

    if (email) {
      const [owned] = await pool.query(
        `SELECT ${SELECT_FIELDS} FROM servers WHERE soft_deleted_at IS NULL AND LOWER(TRIM(owner_email)) = ?`,
        [email]
      );
      for (const s of owned) {
        seen.add(s.server_id);
        out.push({
          ...s,
          isOwner: true,
          player_count: 0,
          bans_count: s.ban_count || 0,
        });
      }
    }

    const [adminRows] = await pool.query(
      `SELECT s.* FROM server_admins sa
       INNER JOIN servers s ON s.server_id = sa.server_id
       WHERE sa.user_id = ? AND s.soft_deleted_at IS NULL`,
      [userId]
    );
    for (const s of adminRows) {
      if (!seen.has(s.server_id)) {
        seen.add(s.server_id);
        out.push({
          ...s,
          isOwner: false,
          player_count: 0,
          bans_count: s.ban_count || 0,
        });
      }
    }

    return res.status(200).json(out);
  } catch (err) {
    console.error('dashboard-servers error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
