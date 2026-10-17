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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getPool();
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const server_identifier = body.server_id || body.server_ip;
    const license_key = body.license_key;
    const command_type = body.command_type;
    const command_data = body.command_data || {};

    if (!server_identifier) {
      return res.status(400).json({ error: 'Missing server_id or server_ip' });
    }

    // Lookup server
    let [servers] = await db.query(
      'SELECT server_id, server_ip, license_key FROM servers WHERE server_id = ? OR id = ? OR server_ip = ? LIMIT 1',
      [server_identifier, server_identifier, server_identifier]
    );

    if (!servers || servers.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const server = servers[0];
    const resolvedServerId = server.server_id;

    // Coalesce request_peer_stream commands to avoid spamming duplicate commands for the same player
    if (command_type === 'request_peer_stream') {
      const playerKey = String(
        command_data?.player_id_str ?? command_data?.player_id ?? command_data?.source ?? ''
      ).trim();

      if (playerKey) {
        const [pendingRows] = await db.query(
          `SELECT id, command_data FROM dashboard_commands 
           WHERE server_id = ? AND command_type = 'request_peer_stream' AND status = 'pending'
           ORDER BY created_at DESC LIMIT 12`,
          [resolvedServerId]
        );

        const existing = (pendingRows || []).find((row) => {
          let d = {};
          try {
            d = typeof row.command_data === 'string' ? JSON.parse(row.command_data) : row.command_data || {};
          } catch (_) {}
          const k = String(d.player_id_str ?? d.player_id ?? d.source ?? '').trim();
          return k === playerKey;
        });

        if (existing) {
          await db.query(
            'UPDATE dashboard_commands SET command_data = ? WHERE id = ?',
            [JSON.stringify(command_data), existing.id]
          );
          return res.status(200).json({
            success: true,
            message: 'Stream request updated',
            coalesced: true,
            command_id: existing.id
          });
        }
      }
    }

    // Insert pending command into dashboard_commands
    const commandId = randomUUID();
    await db.query(
      `INSERT INTO dashboard_commands (id, server_id, command_type, command_data, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [commandId, resolvedServerId, command_type, JSON.stringify(command_data)]
    );

    // Non-stateful history logs
    if (command_type === 'kick') {
      try {
        await db.query(
          `INSERT INTO kicks (id, server_id, player_id, player_name, reason, kicked_by, mode, created_at)
           VALUES (?, ?, ?, ?, ?, 'Dashboard', 'Manual', NOW())`,
          [randomUUID(), resolvedServerId, command_data.player_id || '0', command_data.player_name || 'Player', command_data.reason || 'Kicked by admin']
        );
      } catch (_) {}
    } else if (command_type === 'unban') {
      try {
        const playerId = command_data?.player_id || command_data?.license;
        if (playerId) {
          await db.query('UPDATE bans SET is_active = 0 WHERE server_id = ? AND player_id = ?', [resolvedServerId, playerId]);
        }
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Command queued successfully',
      command_id: commandId
    });
  } catch (err) {
    console.error('[server-command error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
