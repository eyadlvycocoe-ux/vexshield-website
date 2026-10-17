import mysql from 'mysql2/promise';
import crypto, { randomUUID } from 'crypto';
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
      queueLimit: 0,
      connectTimeout: 7000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, *');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
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

  const user = getUser(req);
  const ownerEmail = (user && user.email) ? String(user.email).trim().toLowerCase() : 'eyadlaghnimi2012@gmail.com';
  const userId = user ? user.id : null;

  try {
    const db = getPool();

    // Check if server with this license key already exists in MySQL
    const [existing] = await db.query(
      'SELECT id, server_id, license_key, owner_email, server_ip, display_name FROM servers WHERE license_key = ? LIMIT 1',
      [licenseKey]
    );

    let assignedServerId = null;

    if (existing && existing.length > 0) {
      const row = existing[0];
      assignedServerId = row.server_id;

      // Update server record with IP, owner and status
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
      // Check static licenses.json to see if a predefined server_id is associated
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

      // If no predefined ID, create a branded server_id
      assignedServerId = predefinedServerId || `VexShield-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const newId = randomUUID();
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

    // Ensure default settings exist for this server
    try {
      await db.query(
        `INSERT INTO server_settings (id, server_id, settings, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [randomUUID(), assignedServerId, JSON.stringify({ ServerName: 'VexShield Protected Server' })]
      );
    } catch (_) {}

    // Link user in server_admins if user is logged in
    if (userId) {
      try {
        await db.query(
          `INSERT INTO server_admins (id, server_id, user_id, role, created_at)
           VALUES (?, ?, ?, 'owner', NOW())
           ON DUPLICATE KEY UPDATE role = 'owner'`,
          [randomUUID(), assignedServerId, userId]
        );
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'License key redeemed successfully!',
      server_id: assignedServerId,
    });
  } catch (err) {
    console.error('License redeem error:', err);
    return res.status(500).json({ error: err.message || 'Database error while redeeming license key' });
  }
}
