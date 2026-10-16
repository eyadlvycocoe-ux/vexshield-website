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
      if (!rows || rows.length === 0) {
        return res.status(200).json({
          discord_id: userId,
          username: user.username || '',
          display_name: user.display_name || user.username || '',
          avatar: user.avatar || null,
          bio: '',
          funds: 0,
          tokens_total: 0,
          two_factor_enabled: false,
        });
      }
      const u = rows[0];
      return res.status(200).json({
        discord_id: u.discord_id,
        username: u.username,
        display_name: u.display_name || u.username,
        avatar: u.avatar,
        bio: u.bio || '',
        funds: parseFloat(u.funds) || 0,
        tokens_total: 0,
        tokens_daily: 0,
        tokens_purchased: 0,
        daily_allowance: 0,
        plan_tier: 1,
        two_factor_enabled: !!u.two_factor_secret,
      });
    } catch (err) {
      console.error('profile GET error:', err);
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const updates = [];
      const values = [];

      if (body.bio !== undefined) {
        updates.push('bio = ?');
        values.push(String(body.bio || ''));
      }
      if (body.display_name !== undefined) {
        updates.push('display_name = ?');
        values.push(String(body.display_name || ''));
      }

      if (updates.length > 0) {
        values.push(userId);
        await pool.query(`UPDATE discord_users SET ${updates.join(', ')} WHERE discord_id = ?`, values);
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('profile PATCH error:', err);
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
