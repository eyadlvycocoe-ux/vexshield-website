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

async function fetchUserServers(db, userId, userEmail) {
  const email = String(userEmail || '').trim().toLowerCase();
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
    return out;
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

  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const view = req.query?.view;

  // View: Stats (Public Telemetry)
  if (view === 'stats') {
    try {
      const db = getPool();
      const [[sRow]] = await db.query('SELECT COUNT(*) as count FROM servers WHERE soft_deleted_at IS NULL');
      const [[uRow]] = await db.query('SELECT COUNT(*) as count FROM discord_users');
      const [[bRow]] = await db.query('SELECT COUNT(*) as count FROM global_bans');
      const [[pRow]] = await db.query('SELECT COUNT(*) as count FROM pricing_plans');
      return res.status(200).json({
        servers: Number(sRow?.count || 0),
        users: Number(uRow?.count || 0),
        bans: Number(bRow?.count || 0),
        plans: Number(pRow?.count || 0),
      });
    } catch (err) {
      return res.status(200).json({ servers: 0, users: 0, bans: 0, plans: 0 });
    }
  }

  // View: Server Session Validation
  if (view === 'server_session') {
    const sid = String(req.query?.server_id || '').trim();
    const lkey = String(req.query?.license_key || '').trim();
    if (!sid) return res.status(400).json({ error: 'Missing server_id' });
    try {
      const db = getPool();
      let query = 'SELECT server_id, license_key, status, expires_at, display_name FROM servers WHERE server_id = ? AND soft_deleted_at IS NULL';
      let params = [sid];
      if (lkey) {
        query += ' AND license_key = ?';
        params.push(lkey);
      }
      const [rows] = await db.query(query, params);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'Server not found or invalid license' });
      }
      const s = rows[0];
      return res.status(200).json({
        ok: true,
        server_id: s.server_id,
        license_key: s.license_key,
        status: s.status,
        expires_at: s.expires_at,
        display_name: s.display_name,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  const decoded = getUser(req);
  if (!decoded || !decoded.id) {
    if (view === 'staff') {
      return res.status(200).json({ site_admin: false, site_support: false });
    }
    if (view === 'server_permissions') {
      return res.status(200).json({
        permissions: ['all'],
        is_owner: true,
        is_license_owner: true,
      });
    }
    return res.status(401).json({ user: null });
  }

  const userId = String(decoded.id);
  const email = String(decoded.email || '').trim().toLowerCase();

  // View: Staff
  if (view === 'staff') {
    if (OWNER_DISCORD_IDS.includes(userId)) {
      return res.status(200).json({
        site_admin: true,
        site_support: true,
        is_staff_admin: true,
        is_staff_support: true,
        requires2fa: false,
        requires2faSetup: false,
      });
    }
    try {
      const db = getPool();
      const [rows] = await db.query(
        'SELECT admin_level, is_admin FROM discord_users WHERE discord_id = ? LIMIT 1',
        [userId]
      );
      const row = rows[0];
      const isAdmin = !!(row && (row.is_admin === 1 || Number(row.admin_level) >= 1));
      return res.status(200).json({
        site_admin: isAdmin,
        site_support: isAdmin,
        is_staff_admin: isAdmin,
        is_staff_support: isAdmin,
        requires2fa: false,
        requires2faSetup: false,
      });
    } catch {
      return res.status(200).json({ site_admin: false, site_support: false });
    }
  }

  // View: Server Permissions
  if (view === 'server_permissions') {
    const sid = String(req.query?.server_id || '').trim();
    const isOwner = OWNER_DISCORD_IDS.includes(userId);
    if (isOwner) {
      return res.status(200).json({
        permissions: ['all', 'dashboard', 'analytics', 'players', 'map', 'live-view', 'bans', 'server-panel', 'resources', 'admins', 'settings', 'activity'],
        is_owner: true,
        is_license_owner: true,
      });
    }
    try {
      const db = getPool();
      const [sRows] = await db.query('SELECT owner_email FROM servers WHERE server_id = ? LIMIT 1', [sid]);
      const isServerOwner = !!(email && sRows[0] && sRows[0].owner_email && String(sRows[0].owner_email).toLowerCase().trim() === email);
      return res.status(200).json({
        permissions: ['all', 'dashboard', 'analytics', 'players', 'map', 'live-view', 'bans', 'server-panel', 'resources', 'admins', 'settings', 'activity'],
        is_owner: isServerOwner,
        is_license_owner: isServerOwner,
      });
    } catch {
      return res.status(200).json({
        permissions: ['all'],
        is_owner: true,
        is_license_owner: true,
      });
    }
  }

  // View: Servers
  if (view === 'servers') {
    try {
      const db = getPool();
      const servers = await fetchUserServers(db, userId, email);
      return res.status(200).json(servers);
    } catch (err) {
      console.error('servers fetch error:', err);
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  // View: Profile (GET)
  if (view === 'profile' && req.method === 'GET') {
    try {
      const db = getPool();
      const [rows] = await db.query(
        'SELECT discord_id, username, display_name, avatar, bio, funds, two_factor_secret, email FROM discord_users WHERE discord_id = ? LIMIT 1',
        [userId]
      );
      const u = rows && rows[0] ? rows[0] : {};
      return res.status(200).json({
        discord_id: userId,
        username: u.username || decoded.username,
        display_name: u.display_name || decoded.display_name || decoded.username,
        avatar: u.avatar || decoded.avatar,
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
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  // View: Profile (PATCH / POST)
  if (req.method === 'PATCH' || (req.method === 'POST' && view === 'profile')) {
    try {
      const db = getPool();
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
        await db.query(`UPDATE discord_users SET ${updates.join(', ')} WHERE discord_id = ?`, values);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }



  // View: Admin Servers
  if (view === 'admin_servers') {
    const isOwner = OWNER_DISCORD_IDS.includes(userId);
    if (!isOwner) {
      const db = getPool();
      const [u] = await db.query('SELECT is_admin, admin_level FROM discord_users WHERE discord_id = ?', [userId]);
      if (!u[0] || (!u[0].is_admin && Number(u[0].admin_level) < 1)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    try {
      const db = getPool();
      const [rows] = await db.query('SELECT * FROM servers WHERE soft_deleted_at IS NULL ORDER BY created_at DESC');
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  // View: Admin Users
  if (view === 'admin_users') {
    const isOwner = OWNER_DISCORD_IDS.includes(userId);
    if (!isOwner) {
      const db = getPool();
      const [u] = await db.query('SELECT is_admin, admin_level FROM discord_users WHERE discord_id = ?', [userId]);
      if (!u[0] || (!u[0].is_admin && Number(u[0].admin_level) < 1)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }
    try {
      const db = getPool();
      const [rows] = await db.query('SELECT discord_id, username, display_name, avatar, email, connected_at, funds, is_admin, admin_level FROM discord_users ORDER BY connected_at DESC');
      return res.status(200).json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  // Default: Full Session
  const isOwnerUser = OWNER_DISCORD_IDS.includes(userId);
  const displayName = decoded.display_name || decoded.username || (decoded.email ? decoded.email.split('@')[0] : 'User');
  const avatarUrl = decoded.avatar && decoded.id
    ? `https://cdn.discordapp.com/avatars/${decoded.id}/${decoded.avatar}.png`
    : null;

  let dbBio = '';
  let dbFunds = 0;
  let servers = [];
  let isDbAdmin = false;

  try {
    const db = getPool();
    const [uRows] = await db.query(
      'SELECT bio, funds, is_admin, admin_level FROM discord_users WHERE discord_id = ? LIMIT 1',
      [userId]
    );
    if (uRows && uRows[0]) {
      dbBio = uRows[0].bio || '';
      dbFunds = parseFloat(uRows[0].funds) || 0;
      isDbAdmin = !!(uRows[0].is_admin === 1 || Number(uRows[0].admin_level) >= 1);
    }
    servers = await fetchUserServers(db, userId, email);
  } catch (err) {
    console.error('db enrich error in session:', err);
  }

  const userPayload = {
    ...decoded,
    display_name: displayName,
    avatar_url: avatarUrl,
    bio: dbBio,
    funds: dbFunds,
    servers: servers,
    is_admin: isOwnerUser || isDbAdmin,
    site_admin: isOwnerUser || isDbAdmin,
    user_metadata: {
      full_name: displayName,
      name: displayName,
      user_name: decoded.username,
      email: decoded.email,
      avatar_url: avatarUrl,
      avatar: decoded.avatar || null,
      provider_id: decoded.id,
      sub: decoded.id,
      custom_claims: {
        global_name: displayName,
      },
    },
  };

  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)(?:token|sb-aircore-token|airshield_auth_token)=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : (req.headers.authorization?.replace(/^Bearer\s+/i, ''));

  return res.status(200).json({ user: userPayload, token });
}
