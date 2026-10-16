import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

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
      connectionLimit: 1,
      maxIdle: 0,
      idleTimeout: 3000,
      queueLimit: 0,
    });
  }
  return pool;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, *');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const serverId = String(req.query?.serverId || '').trim();
  if (!serverId) {
    return res.status(400).json({ error: 'Missing serverId parameter' });
  }

  const db = getPool();

  if (req.method === 'GET') {
    try {
      const [rows] = await db.query(
        'SELECT settings FROM server_settings WHERE server_id = ? LIMIT 1',
        [serverId]
      );
      let settings = {};
      if (rows.length && rows[0].settings) {
        settings = typeof rows[0].settings === 'object' ? rows[0].settings : JSON.parse(rows[0].settings);
      }
      return res.status(200).json({ config: settings });
    } catch (err) {
      console.error('[servers-airshield-config] GET error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    try {
      let incoming = req.body;
      if (typeof incoming === 'string') {
        try {
          incoming = JSON.parse(incoming);
        } catch (_) {
          incoming = {};
        }
      }

      const settingsStr = JSON.stringify(incoming || {});

      await db.query(
        `INSERT INTO server_settings (id, server_id, settings, anti_objects, anti_blackwords, discord_webhook, updated_at)
         VALUES (?, ?, ?, '[]', '[]', NULL, NOW())
         ON DUPLICATE KEY UPDATE settings = VALUES(settings), updated_at = NOW()`,
        [randomUUID(), serverId, settingsStr]
      );

      // Queue live reload command
      try {
        const [pending] = await db.query(
          "SELECT id FROM dashboard_commands WHERE server_id = ? AND command_type = 'update_settings' AND status = 'pending' LIMIT 1",
          [serverId]
        );
        if (!pending || pending.length === 0) {
          await db.query(
            "INSERT INTO dashboard_commands (id, server_id, command_type, command_data, status) VALUES (?, ?, 'update_settings', ?, 'pending')",
            [randomUUID(), serverId, JSON.stringify({ fetch_settings: true })]
          );
        }
      } catch (_) {}

      return res.status(200).json({ success: true, message: 'Settings saved and queued for live synchronization' });
    } catch (err) {
      console.error('[servers-airshield-config] PUT error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
