import { getPool, getUserFromReq } from '../../_db.js';

export default async function handler(req, res) {
  const user = getUserFromReq(req);
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = getPool();
  const userId = String(user.id);

  if (req.method === 'GET') {
    try {
      const [rows] = await pool.query(
        'SELECT discord_id, username, display_name, avatar, bio, funds, two_factor_secret, email FROM discord_users WHERE discord_id = ? LIMIT 1',
        [userId]
      );
      if (!rows.length) {
        return res.status(200).json({
          discord_id: userId,
          username: user.username || '',
          display_name: user.display_name || user.username || '',
          avatar: user.avatar || null,
          bio: '',
          funds: 0,
          two_factor_enabled: false,
        });
      }
      const row = rows[0];
      row.funds = parseFloat(row.funds) || 0;
      row.two_factor_enabled = !!row.two_factor_secret;
      return res.status(200).json(row);
    } catch (e) {
      console.error('discord-profile GET error:', e);
      return res.status(500).json({ error: e.message || 'Server error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const updates = [];
      const params = [];

      if (typeof body.bio === 'string') {
        updates.push('bio = ?');
        params.push(body.bio.substring(0, 500));
      }
      if (typeof body.display_name === 'string' && body.display_name.trim()) {
        updates.push('display_name = ?');
        params.push(body.display_name.trim().substring(0, 100));
      }

      if (updates.length > 0) {
        params.push(userId);
        await pool.query(
          `UPDATE discord_users SET ${updates.join(', ')} WHERE discord_id = ?`,
          params
        );
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error('discord-profile PATCH error:', e);
      return res.status(500).json({ error: e.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
