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

function cleanIp(ip) {
  if (!ip) return null;
  return String(ip).replace(/:\d+$/, '').trim();
}

async function resolveServer(db, body) {
  const license_key = body.license_key ? String(body.license_key).trim() : null;
  const server_id = body.server_id ? String(body.server_id).trim() : null;
  const rawIp = body.server_ip ? cleanIp(body.server_ip) : null;

  if (!license_key && !server_id && !rawIp) {
    return { error: 'Missing license_key or server_id', status: 400 };
  }

  let rows = [];
  if (license_key) {
    [rows] = await db.query('SELECT * FROM servers WHERE license_key = ? LIMIT 1', [license_key]);
  }
  if ((!rows || rows.length === 0) && server_id) {
    [rows] = await db.query('SELECT * FROM servers WHERE server_id = ? LIMIT 1', [server_id]);
  }
  if ((!rows || rows.length === 0) && rawIp && rawIp !== '127.0.0.1' && rawIp !== 'localhost') {
    [rows] = await db.query('SELECT * FROM servers WHERE server_ip = ? OR server_ip LIKE ? LIMIT 1', [rawIp, `${rawIp}:%`]);
  }

  if (!rows || rows.length === 0) {
    return { error: 'Server not found', status: 404 };
  }

  const server = rows[0];
  if (license_key && server.license_key && server.license_key !== license_key) {
    return { error: 'Invalid license key', status: 403 };
  }

  if (server.status === 'disabled' || server.status === 'revoked') {
    return { error: 'Server license is disabled or revoked', status: 403 };
  }

  return { server, server_id: server.server_id };
}

async function markOnline(db, server_id, server_ip) {
  const clean = cleanIp(server_ip);
  if (clean && clean !== '127.0.0.1' && clean !== 'localhost' && clean !== 'Unknown') {
    await db.query(
      'UPDATE servers SET status = ?, last_update = NOW(), server_ip = ? WHERE server_id = ?',
      ['online', clean, server_id]
    );
  } else {
    await db.query(
      'UPDATE servers SET status = ?, last_update = NOW() WHERE server_id = ?',
      ['online', server_id]
    );
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = getPool();

  if (req.method === 'GET') {
    const action = req.query.action || '';
    if (action === 'monitoring' || action === 'live-monitoring') {
      return res.json({ status: 'ok', streams: [] });
    }
    return res.json({ status: 'ok', message: 'VexShield Ingest API Active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const route = String(req.query.route || '').toLowerCase();
  if (route === 'server-command') {
    const server_identifier = body.server_id || body.server_ip;
    const command_type = body.command_type;
    const command_data = body.command_data || {};
    if (!server_identifier) {
      return res.status(400).json({ error: 'Missing server_id or server_ip' });
    }
    try {
      const [servers] = await db.query(
        'SELECT server_id, server_ip, license_key FROM servers WHERE server_id = ? OR id = ? OR server_ip = ? LIMIT 1',
        [server_identifier, server_identifier, server_identifier]
      );
      if (!servers || servers.length === 0) {
        return res.status(404).json({ error: 'Server not found' });
      }
      const resolvedServerId = servers[0].server_id;
      const commandId = randomUUID();
      await db.query(
        `INSERT INTO dashboard_commands (id, server_id, command_type, command_data, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [commandId, resolvedServerId, command_type, JSON.stringify(command_data)]
      );
      if (command_type === 'unban') {
        const playerId = command_data.player_id || command_data.license;
        const playerName = command_data.player_name;
        const banId = command_data.ban_id;
        try {
          if (playerId) {
            await db.query(
              'UPDATE bans SET is_active = 0 WHERE server_id = ? AND (player_id = ? OR JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.license")) = ?)',
              [resolvedServerId, playerId, playerId]
            );
          }
          if (playerName) {
            await db.query(
              'UPDATE bans SET is_active = 0 WHERE server_id = ? AND player_name = ?',
              [resolvedServerId, playerName]
            );
          }
          if (banId) {
            await db.query(
              'UPDATE bans SET is_active = 0 WHERE server_id = ? AND (id = ? OR JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.id")) = ? OR JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.ban_json_id")) = ?)',
              [resolvedServerId, banId, String(banId), String(banId)]
            );
          }
        } catch (unbanDbErr) {
          console.warn('[server-command:unban] Error deactivating ban in DB:', unbanDbErr);
        }
      }
      return res.status(200).json({ success: true, message: 'Command queued successfully', command_id: commandId });
    } catch (cmdErr) {
      return res.status(500).json({ error: cmdErr.message || 'Internal error' });
    }
  }

  try {
    const resolved = await resolveServer(db, body);
    if (resolved.error) {
      return res.status(resolved.status || 400).json({ error: resolved.error });
    }

    const { server, server_id } = resolved;
    const report_type = String(body.report_type || '').toLowerCase();
    const event = String(body.event || '').toLowerCase();

    // 1. SERVER STATUS
    if (report_type === 'server_status') {
      if (event === 'started') {
        await markOnline(db, server_id, body.server_ip);
        const logLine = JSON.stringify([{ ts: Date.now(), message: '🟢 Server started & authenticated with VexShield' }]);
        try {
          await db.query(
            `INSERT INTO consoles (id, server_id, logs, updated_at) VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE logs = VALUES(logs), updated_at = NOW()`,
            [randomUUID(), server_id, logLine]
          );
        } catch (_) {}
        return res.json({ status: 'ok', server_id, status: 'online' });
      } else if (event === 'stopped') {
        await db.query('UPDATE servers SET status = ?, last_update = NOW() WHERE server_id = ?', ['offline', server_id]);
        try {
          await db.query(
            `INSERT INTO players_snapshots (id, server_id, snapshot, total_players, updated_at)
             VALUES (?, ?, '[]', 0, NOW())
             ON DUPLICATE KEY UPDATE snapshot = '[]', total_players = 0, updated_at = NOW()`,
            [randomUUID(), server_id]
          );
          const logLine = JSON.stringify([{ ts: Date.now(), message: '🛑 Server stopped' }]);
          await db.query(
            `INSERT INTO consoles (id, server_id, logs, updated_at) VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE logs = VALUES(logs), updated_at = NOW()`,
            [randomUUID(), server_id, logLine]
          );
        } catch (_) {}
        return res.json({ status: 'ok', server_id, status: 'offline' });
      } else if (event === 'heartbeat') {
        await markOnline(db, server_id, body.server_ip);
        return res.json({ status: 'ok', status: 'online' });
      }
      await markOnline(db, server_id, body.server_ip);
      return res.json({ status: 'ok', status: 'online' });
    }

    // 2. PLAYERS SNAPSHOT
    if (report_type === 'players_snapshot') {
      await markOnline(db, server_id, body.server_ip);
      const snapshot = Array.isArray(body.snapshot) ? body.snapshot : [];
      const total_players = typeof body.total_players === 'number' ? body.total_players : snapshot.length;
      const max_players = Number(body.max_players || body.metadata?.max_players || 32);
      const server_name = String(body.server_name || body.metadata?.server_name || '').trim();

      const meta = {
        max_players,
        maxClients: max_players,
        slots: max_players,
        server_name: server_name || undefined
      };

      try {
        await db.query(
          `INSERT INTO players_snapshots (id, server_id, snapshot, total_players, metadata, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
             snapshot = VALUES(snapshot), 
             total_players = VALUES(total_players), 
             metadata = VALUES(metadata), 
             updated_at = NOW()`,
          [randomUUID(), server_id, JSON.stringify(snapshot), total_players, JSON.stringify(meta)]
        );

        if (server_name && server_name !== 'Onbekend' && server_name !== 'Unknown') {
          await db.query(
            'UPDATE servers SET display_name = ? WHERE server_id = ? AND (display_name IS NULL OR display_name = "" OR display_name = "VexShield Server")',
            [server_name, server_id]
          );
        }
      } catch (err) {
        console.error('[report.js] Error updating snapshot:', err);
      }

      return res.json({ status: 'ok', inserted: 1 });
    }

    // 3. CONSOLE LOGS
    if (report_type === 'console_logs') {
      await markOnline(db, server_id, body.server_ip);
      const incoming = Array.isArray(body.console_logs) ? body.console_logs : [];
      if (incoming.length > 0) {
        try {
          const [rows] = await db.query('SELECT logs FROM consoles WHERE server_id = ? LIMIT 1', [server_id]);
          let existing = [];
          if (rows && rows[0] && rows[0].logs) {
            try {
              existing = Array.isArray(rows[0].logs) ? rows[0].logs : JSON.parse(rows[0].logs);
            } catch (_) {}
          }
          const seen = new Set(existing.map(l => `${l.ts}|${l.message}`));
          const toAdd = incoming.filter(l => !seen.has(`${l.ts}|${l.message}`));
          const merged = existing.concat(toAdd).slice(-1000);
          await db.query(
            `INSERT INTO consoles (id, server_id, logs, updated_at) VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE logs = VALUES(logs), updated_at = NOW()`,
            [randomUUID(), server_id, JSON.stringify(merged)]
          );
        } catch (err) {
          console.error('[report.js] Error updating console logs:', err);
        }
      }
      return res.json({ status: 'ok' });
    }

    // 4. POLL COMMANDS
    if (report_type === 'poll_commands') {
      await markOnline(db, server_id, body.server_ip);
      let commands = [];
      try {
        const [rows] = await db.query(
          `SELECT * FROM dashboard_commands WHERE server_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 10`,
          [server_id]
        );
        commands = rows || [];
      } catch (_) {}
      return res.json({ status: 'ok', commands });
    }

    // 5. COMMAND RESULT
    if (report_type === 'command_result') {
      await markOnline(db, server_id, body.server_ip);
      if (body.command_id) {
        try {
          await db.query(
            `UPDATE dashboard_commands SET status = ?, result = ?, executed_at = NOW() WHERE id = ?`,
            [body.success ? 'completed' : 'failed', JSON.stringify(body.result || {}), String(body.command_id)]
          );
        } catch (_) {}
      }
      return res.json({ status: 'ok' });
    }

    // 6. SYNC BANS FROM ANTICHEAT
    if (report_type === 'sync_bans_from_anticheat') {
      await markOnline(db, server_id, body.server_ip);
      const bans = Array.isArray(body.bans) ? body.bans : [];
      for (const ban of bans) {
        const pId = ban.player_id || ban.license || ban.steam || `ban_${Date.now()}`;
        const pName = ban.player_name || ban.name || 'Unknown';
        const reason = ban.reason || 'Anticheat Ban';
        const bannedBy = ban.banned_by || 'Anticheat';
        try {
          await db.query(
            `INSERT INTO bans (id, server_id, player_id, player_name, reason, banned_by, is_active, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW())
             ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_active = 1`,
            [randomUUID(), server_id, pId, pName, reason, bannedBy, JSON.stringify(ban)]
          );
        } catch (_) {}
      }
      return res.json({ status: 'ok', synced: bans.length });
    }

    // 7. GET ACTIVE BANS
    if (report_type === 'sync_bans') {
      await markOnline(db, server_id, body.server_ip);
      try {
        const [bans] = await db.query('SELECT * FROM bans WHERE server_id = ? AND is_active = 1', [server_id]);
        return res.json({ status: 'ok', bans: bans || [] });
      } catch (_) {
        return res.json({ status: 'ok', bans: [] });
      }
    }

    // 8. UNBAN
    if (report_type === 'unban_from_anticheat') {
      await markOnline(db, server_id, body.server_ip);
      const { player_id, player_name } = body;
      if (player_id) {
        await db.query('UPDATE bans SET is_active = 0 WHERE server_id = ? AND player_id = ?', [server_id, player_id]);
      } else if (player_name) {
        await db.query('UPDATE bans SET is_active = 0 WHERE server_id = ? AND player_name = ?', [server_id, player_name]);
      }
      return res.json({ status: 'ok' });
    }

    // 9. ACTIVITY LOGS
    if (report_type === 'sync_activity_logs') {
      await markOnline(db, server_id, body.server_ip);
      const logs = Array.isArray(body.activity_logs) ? body.activity_logs : [];
      for (const l of logs) {
        const t = (l.type || '').toUpperCase();
        if (t === 'KICK_PLAYER' || t === 'KICK') {
          try {
            await db.query(
              `INSERT INTO kicks (id, server_id, player_id, player_name, reason, kicked_by, mode, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'Anticheat', NOW())`,
              [randomUUID(), server_id, `ac_${Date.now()}`, l.player || 'Unknown', l.details || '', l.admin || 'Anticheat']
            );
          } catch (_) {}
        } else if (t === 'WARN_PLAYER' || t === 'WARN') {
          try {
            await db.query(
              `INSERT INTO warns (id, server_id, player_id, player_name, message, warned_by, mode, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 'Anticheat', NOW())`,
              [randomUUID(), server_id, `ac_${Date.now()}`, l.player || 'Unknown', l.details || '', l.admin || 'Anticheat']
            );
          } catch (_) {}
        }
      }
      return res.json({ status: 'ok', synced: logs.length });
    }

    // 10. SYNC SETTINGS
    if (report_type === 'sync_settings') {
      await markOnline(db, server_id, body.server_ip);
      const settings = body.settings || {};
      try {
        await db.query(
          `INSERT INTO server_settings (id, server_id, settings, updated_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE settings = VALUES(settings), updated_at = NOW()`,
          [randomUUID(), server_id, JSON.stringify(settings)]
        );
      } catch (_) {}
      return res.json({ status: 'ok' });
    }

    // 11. GET SETTINGS
    if (report_type === 'get_settings') {
      await markOnline(db, server_id, body.server_ip);
      let settings = {};
      try {
        const [rows] = await db.query('SELECT settings FROM server_settings WHERE server_id = ? LIMIT 1', [server_id]);
        if (rows && rows[0] && rows[0].settings) {
          settings = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
        }
      } catch (_) {}
      return res.json({ status: 'ok', settings, server_id });
    }

    // 12. SYNC RESOURCES
    if (report_type === 'sync_resources') {
      await markOnline(db, server_id, body.server_ip);
      const resources = Array.isArray(body.resources) ? body.resources : [];
      try {
        await db.query(
          `INSERT INTO server_resources (id, server_id, resources, total_count, updated_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE resources = VALUES(resources), total_count = VALUES(total_count), updated_at = NOW()`,
          [randomUUID(), server_id, JSON.stringify(resources), resources.length]
        );
      } catch (_) {}
      return res.json({ status: 'ok', synced: resources.length });
    }

    // Fallback default: keep server online
    await markOnline(db, server_id, body.server_ip);
    return res.json({ status: 'ok', server_id, status: 'online' });
  } catch (err) {
    console.error('[report.js] Uncaught error:', err);
    return res.status(500).json({ error: 'Internal report ingest error', details: err.message });
  }
}
