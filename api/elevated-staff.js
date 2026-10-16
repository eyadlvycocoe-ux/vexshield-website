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
const OWNER_DISCORD_IDS = ['1505242741091598418', '1134674389254803456', '1284209480824786987', '1339366537085321257'];

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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const user = getUser(req);
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
    const db = getPool();
    const [rows] = await db.query(
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
