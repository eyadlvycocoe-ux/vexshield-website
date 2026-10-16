import mysql from 'mysql2/promise';
import crypto from 'crypto';

let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'mysql-2c01ccb3-eyadlaghnimi2012-de61.i.aivencloud.com',
      port: Number(process.env.DB_PORT || 21202),
      user: process.env.DB_USER || 'avnadmin',
      password: process.env.DB_PASSWORD || Buffer.from('QVZOU19hNHpiZTIzdVBCWWZacVlTZ0lQ', 'base64').toString('ascii'),
      database: process.env.DB_NAME || 'defaultdb',
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

const JWT_SECRET = process.env.JWT_SECRET || '014ba23d46efe965d33ff86030be6e71ad8fbe06b96ff813bdd769d0190a9d1c';

function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac('sha256', secret).update(h + '.' + p).digest('base64url');
  if (s !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function getUser(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)(?:token|sb-aircore-token|airshield_auth_token)=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : (req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!token) return null;
  return verifyJwt(token, JWT_SECRET);
}

export default async function handler(req, res) {
  const user = getUser(req);
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
