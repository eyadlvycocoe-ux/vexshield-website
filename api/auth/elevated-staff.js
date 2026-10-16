import { getPool, getUserFromReq, OWNER_DISCORD_IDS } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const user = getUserFromReq(req);
  if (!user || !user.id) {
    return res.status(200).json({ site_admin: false, site_support: false });
  }

  const userId = String(user.id);
  if (OWNER_DISCORD_IDS.includes(userId)) {
    return res.status(200).json({
      site_admin: true,
      site_support: true,
      is_staff_admin: true,
      is_staff_support: true,
      verified2fa: true,
    });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT is_admin, admin_level, staff_role FROM discord_users WHERE discord_id = ? LIMIT 1',
      [userId]
    );

    if (rows.length && (rows[0].is_admin === 1 || (rows[0].admin_level && rows[0].admin_level >= 1))) {
      return res.status(200).json({
        site_admin: true,
        site_support: true,
        is_staff_admin: true,
        is_staff_support: true,
        verified2fa: true,
      });
    }

    return res.status(200).json({ site_admin: false, site_support: false });
  } catch (e) {
    console.error('elevated-staff error:', e);
    return res.status(200).json({ site_admin: false, site_support: false });
  }
}
