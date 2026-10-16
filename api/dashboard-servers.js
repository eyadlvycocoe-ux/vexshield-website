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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = getUser(req);
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getPool();
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
      const [allServers] = await db.query(
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
      const [owned] = await db.query(
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

    const [adminRows] = await db.query(
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
