import mysql from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
      connectionLimit: 10,
      maxIdle: 0,
      idleTimeout: 3000,
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

  const urlObj = new URL(req.url || '/', 'https://vexshield.site');
  const view = req.query?.view || urlObj.searchParams.get('view') || (urlObj.pathname.includes('/license') ? 'redeem_license' : null);

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

  // View: Redeem / Bind License Key to Server
  if (view === 'redeem_license' || view === 'redeem') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body;
    if (!body && typeof req.on === 'function') {
      try {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const text = Buffer.concat(buffers).toString('utf8');
        body = JSON.parse(text);
      } catch (_) {
        body = {};
      }
    } else if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    body = body || {};

    const licenseKey = String(body.license_key || '').trim().toUpperCase();
    let serverIp = String(body.server_ip || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

    if (!licenseKey) {
      return res.status(400).json({ error: 'Please enter a valid License Key' });
    }
    if (!serverIp) {
      return res.status(400).json({ error: 'Please enter a valid Server IP' });
    }

    const decodedUser = getUser(req);
    const ownerEmail = (decodedUser && decodedUser.email) ? String(decodedUser.email).trim().toLowerCase() : 'eyadlaghnimi2012@gmail.com';
    const userId = decodedUser ? String(decodedUser.id) : null;

    try {
      const db = getPool();

      const [existing] = await db.query(
        'SELECT id, server_id, license_key, owner_email, server_ip, display_name FROM servers WHERE license_key = ? LIMIT 1',
        [licenseKey]
      );

      let assignedServerId = null;

      if (existing && existing.length > 0) {
        const row = existing[0];
        assignedServerId = row.server_id;

        await db.query(
          `UPDATE servers 
           SET server_ip = ?, 
               owner_email = COALESCE(NULLIF(owner_email, ''), ?), 
               status = 'online', 
               soft_deleted_at = NULL, 
               last_update = NOW() 
           WHERE license_key = ?`,
          [serverIp, ownerEmail, licenseKey]
        );
      } else {
        let predefinedServerId = null;
        try {
          const secretPath = path.join(process.cwd(), 'public', 'licenses-secret-x8f9v2m4p1q7z3w5.json');
          if (fs.existsSync(secretPath)) {
            const secretData = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
            const found = (secretData || []).find(item => String(item.license || '').trim().toUpperCase() === licenseKey);
            if (found && found.server_id) {
              predefinedServerId = found.server_id;
            }
          }
        } catch (_) {}

        assignedServerId = predefinedServerId || `VexShield-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const newId = crypto.randomUUID();

        await db.query(
          `INSERT INTO servers (
            id, server_id, license_key, server_ip, display_name, status,
            owner_email, created_at, last_update,
            ent_airshield, ent_airscanner, ent_airpc, ent_airzeroflood
          ) VALUES (
            ?, ?, ?, ?, ?, 'online',
            ?, NOW(), NOW(),
            1, 1, 1, 1
          )`,
          [newId, assignedServerId, licenseKey, serverIp, 'VexShield Server', ownerEmail]
        );
      }

      try {
        await db.query(
          `INSERT INTO server_settings (id, server_id, settings, updated_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [crypto.randomUUID(), assignedServerId, JSON.stringify({ ServerName: 'VexShield Protected Server' })]
        );
      } catch (_) {}

      if (userId) {
        try {
          await db.query(
            `INSERT INTO server_admins (id, server_id, user_id, role, created_at)
             VALUES (?, ?, ?, 'owner', NOW())
             ON DUPLICATE KEY UPDATE role = 'owner'`,
            [crypto.randomUUID(), assignedServerId, userId]
          );
        } catch (_) {}
      }

      return res.status(200).json({
        success: true,
        message: 'License key redeemed successfully!',
        server_id: assignedServerId,
      });
    } catch (err) {
      console.error('License redeem error in session.js:', err);
      return res.status(500).json({ error: err.message || 'Database error while redeeming license key' });
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

      if (req.method === 'POST') {
        let b = req.body;
        if (typeof b === 'string') {
          try { b = JSON.parse(b); } catch { b = {}; }
        }
        const {
          server_id,
          server_ip,
          license_key,
          display_name,
          owner_email,
          status = 'offline',
          expires_at,
          ent_airshield = 1,
          ent_airscanner = 1,
          ent_airpc = 1,
          ent_airzeroflood = 1
        } = b || {};

        if (!license_key) {
          return res.status(400).json({ error: 'License key is required' });
        }

        const assignedServerId = server_id || `VexShield-${crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
        const newId = crypto.randomUUID();
        const cleanIp = server_ip ? String(server_ip).trim() : null;
        const cleanEmail = owner_email ? String(owner_email).trim() : null;
        const cleanExpires = expires_at ? new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ') : null;

        await db.query(
          `INSERT INTO servers (
            id, server_id, license_key, server_ip, display_name, status,
            owner_email, expires_at, created_at, last_update,
            ent_airshield, ent_airscanner, ent_airpc, ent_airzeroflood
          ) VALUES (
            ?, ?, ?, ?, ?, 'offline',
            ?, ?, NOW(), NULL,
            ?, ?, ?, ?
          ) ON DUPLICATE KEY UPDATE
            server_ip = VALUES(server_ip),
            display_name = VALUES(display_name),
            owner_email = VALUES(owner_email),
            expires_at = VALUES(expires_at),
            ent_airshield = VALUES(ent_airshield)`,
          [
            newId,
            assignedServerId,
            license_key,
            cleanIp,
            display_name || 'VexShield Server',
            cleanEmail,
            cleanExpires,
            ent_airshield ? 1 : 0,
            ent_airscanner ? 1 : 0,
            ent_airpc ? 1 : 0,
            ent_airzeroflood ? 1 : 0
          ]
        );

        return res.status(200).json({
          success: true,
          server_id: assignedServerId,
          license_key,
          expires_at: cleanExpires,
          status: 'offline'
        });
      }

      if (req.method === 'PATCH') {
        let b = req.body;
        if (typeof b === 'string') {
          try { b = JSON.parse(b); } catch { b = {}; }
        }
        const targetServerId = req.query.server_id || req.query.subpath || b.server_id;
        if (!targetServerId) {
          return res.status(400).json({ error: 'server_id required for PATCH' });
        }
        const updates = [];
        const params = [];
        if (b.expires_at !== undefined) {
          updates.push('expires_at = ?');
          params.push(b.expires_at ? new Date(b.expires_at).toISOString().slice(0, 19).replace('T', ' ') : null);
        }
        if (b.display_name !== undefined) {
          updates.push('display_name = ?');
          params.push(b.display_name);
        }
        if (b.server_ip !== undefined) {
          updates.push('server_ip = ?');
          params.push(b.server_ip);
        }
        if (b.status !== undefined) {
          updates.push('status = ?');
          params.push(b.status);
        }
        if (updates.length > 0) {
          params.push(targetServerId);
          await db.query(`UPDATE servers SET ${updates.join(', ')} WHERE server_id = ?`, params);
        }
        return res.status(200).json({ success: true });
      }

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
