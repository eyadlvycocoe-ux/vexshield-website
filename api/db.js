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

const ALLOWED_TABLES = new Set([
  'servers',
  'players_snapshots',
  'server_settings',
  'anticheat_files',
  'bans',
  'ban_history',
  'kicks',
  'warns',
  'activity',
  'server_admins',
  'pricing_plans',
  'feedbacks',
  'global_bans',
  'discord_users',
  'whitelist_entries',
  'shared_configs',
  'profiles',
  'redeem_codes',
  'blacklisted_users',
  'blacklisted_proofs',
  'bot_staff_access',
  'blacklisted_discord_servers',
  'consoles',
  'dashboard_commands',
  'reports'
]);

function isValidIdentifier(val) {
  return typeof val === 'string' && /^[a-zA-Z0-9_]+$/.test(val);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, *');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract table from query string or path parameter
  const table = String(req.query?.table || '').trim();
  if (!table || !isValidIdentifier(table)) {
    return res.status(400).json({ error: 'Invalid or missing table parameter' });
  }

  if (!ALLOWED_TABLES.has(table.toLowerCase())) {
    return res.status(403).json({ error: `Table '${table}' is not accessible` });
  }

  const db = getPool();

  // ---------------------------------------------------------
  // GET: Read data with filtering, sorting, pagination & counting
  // ---------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const isCountHead = req.query.count === 'exact' && (req.query.head === 'true' || req.query.head === true);
      const limit = parseInt(req.query.limit, 10) || (isCountHead ? 1 : 100);
      const offset = parseInt(req.query.offset, 10) || 0;

      let selectStr = '*';
      if (req.query.select && typeof req.query.select === 'string' && req.query.select !== '*') {
        const parts = req.query.select.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.every(p => isValidIdentifier(p))) {
          selectStr = parts.map(p => `\`${p}\``).join(', ');
        }
      }

      const whereClauses = [];
      const params = [];

      for (const [key, val] of Object.entries(req.query)) {
        if (['table', 'select', 'order', 'limit', 'offset', 'count', 'head'].includes(key)) continue;

        if (key === 'eq') {
          const list = Array.isArray(val) ? val : [val];
          for (const item of list) {
            const sep = String(item).indexOf(':');
            if (sep > 0) {
              const col = item.slice(0, sep).trim();
              const v = item.slice(sep + 1);
              if (isValidIdentifier(col)) {
                whereClauses.push(`\`${col}\` = ?`);
                params.push(v);
              }
            }
          }
        } else if (isValidIdentifier(key)) {
          whereClauses.push(`\`${key}\` = ?`);
          params.push(val);
        }
      }

      if (table === 'servers' && !whereClauses.some(w => w.includes('soft_deleted_at'))) {
        whereClauses.push('`soft_deleted_at` IS NULL');
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      if (isCountHead) {
        const [[countRow]] = await db.query(
          `SELECT COUNT(*) as count FROM \`${table}\` ${whereSql}`,
          params
        );
        return res.status(200).json({ count: Number(countRow?.count || 0) });
      }

      let orderSql = '';
      if (req.query.order && typeof req.query.order === 'string') {
        const [ordCol, ordDir] = req.query.order.split(':');
        if (isValidIdentifier(ordCol?.trim())) {
          const dir = String(ordDir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderSql = `ORDER BY \`${ordCol.trim()}\` ${dir}`;
        }
      }

      const querySql = `SELECT ${selectStr} FROM \`${table}\` ${whereSql} ${orderSql} LIMIT ? OFFSET ?`;
      const queryParams = [...params, limit, offset];

      const [rows] = await db.query(querySql, queryParams);
      return res.status(200).json(rows);
    } catch (err) {
      console.error(`DB query error on ${table}:`, err);
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  // Parse JSON body for mutations
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') {
    body = {};
  }

  // ---------------------------------------------------------
  // POST: Insert or Upsert
  // ---------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const records = Array.isArray(body) ? body : [body];
      const results = [];

      for (const item of records) {
        const row = { ...item };
        if (!row.id && table !== 'shared_config_ratings') {
          row.id = randomUUID();
        }

        for (const k in row) {
          if (typeof row[k] === 'object' && row[k] !== null) {
            row[k] = JSON.stringify(row[k]);
          }
        }

        const keys = Object.keys(row).filter(isValidIdentifier);
        if (keys.length === 0) continue;

        const values = keys.map(k => row[k]);
        const placeholders = keys.map(() => '?').join(', ');
        const updateCols = keys.filter(k => k.toLowerCase() !== 'id' && k.toLowerCase() !== 'created_at');
        const updateClause = updateCols.length > 0
          ? updateCols.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ')
          : '`id` = `id`';

        const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')})
                     VALUES (${placeholders})
                     ON DUPLICATE KEY UPDATE ${updateClause}`;

        await db.query(sql, values);
        results.push(row);

        // If settings were updated, queue a live update command for FiveM
        if (table === 'server_settings' && row.server_id) {
          try {
            const sid = String(row.server_id).trim();
            const [pending] = await db.query(
              "SELECT id FROM dashboard_commands WHERE server_id = ? AND command_type = 'update_settings' AND status = 'pending' LIMIT 1",
              [sid]
            );
            if (!pending || pending.length === 0) {
              await db.query(
                "INSERT INTO dashboard_commands (id, server_id, command_type, command_data, status) VALUES (?, ?, 'update_settings', ?, 'pending')",
                [randomUUID(), sid, JSON.stringify({ fetch_settings: true })]
              );
            }
          } catch (cmdErr) {
            console.warn('[db:server_settings] dashboard_commands queue notice:', cmdErr.message);
          }
        }
      }

      return res.status(200).json(Array.isArray(body) ? results : (results[0] || { success: true }));
    } catch (err) {
      console.error(`DB insert/upsert error on ${table}:`, err);
      return res.status(500).json({ error: err.message || 'Database insert error' });
    }
  }

  // ---------------------------------------------------------
  // PATCH / PUT: Update existing records
  // ---------------------------------------------------------
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      let whereCol = null;
      let whereVal = null;

      if (req.query.eq) {
        const eqStr = String(req.query.eq);
        const sep = eqStr.indexOf(':');
        if (sep > 0) {
          whereCol = eqStr.slice(0, sep).trim();
          whereVal = eqStr.slice(sep + 1);
        }
      }

      if (!whereCol) {
        for (const [k, v] of Object.entries(req.query)) {
          if (!['table', 'select', 'order', 'limit', 'offset', 'count', 'head', 'eq'].includes(k) && isValidIdentifier(k)) {
            whereCol = k;
            whereVal = v;
            break;
          }
        }
      }

      // If PUT without where filter, treat as UPSERT
      if (!whereCol && req.method === 'PUT' && body && typeof body === 'object') {
        const row = { ...body };
        if (!row.id) row.id = randomUUID();
        for (const k in row) {
          if (typeof row[k] === 'object' && row[k] !== null) {
            row[k] = JSON.stringify(row[k]);
          }
        }
        const keys = Object.keys(row).filter(isValidIdentifier);
        if (keys.length > 0) {
          const values = keys.map(k => row[k]);
          const placeholders = keys.map(() => '?').join(', ');
          const updateCols = keys.filter(k => k.toLowerCase() !== 'id' && k.toLowerCase() !== 'created_at');
          const updateClause = updateCols.length > 0
            ? updateCols.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ')
            : '`id` = `id`';
          const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')})
                       VALUES (${placeholders})
                       ON DUPLICATE KEY UPDATE ${updateClause}`;
          await db.query(sql, values);
          return res.status(200).json(row);
        }
      }

      if (!whereCol || !isValidIdentifier(whereCol)) {
        return res.status(400).json({ error: 'Filter required for update' });
      }

      const updateData = { ...body };
      delete updateData.id;

      for (const k in updateData) {
        if (typeof updateData[k] === 'object' && updateData[k] !== null) {
          updateData[k] = JSON.stringify(updateData[k]);
        }
      }

      const updateKeys = Object.keys(updateData).filter(isValidIdentifier);
      if (updateKeys.length === 0) {
        return res.status(200).json({ success: true, updated: 0 });
      }

      const setClause = updateKeys.map(k => `\`${k}\` = ?`).join(', ');
      const updateValues = [...updateKeys.map(k => updateData[k]), whereVal];

      const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${whereCol}\` = ?`;
      const [result] = await db.query(sql, updateValues);

      // If server_settings or servers table was updated, queue live reload
      if ((table === 'server_settings' || table === 'servers') && whereCol === 'server_id') {
        try {
          const sid = String(whereVal).trim();
          const [pending] = await db.query(
            "SELECT id FROM dashboard_commands WHERE server_id = ? AND command_type = 'update_settings' AND status = 'pending' LIMIT 1",
            [sid]
          );
          if (!pending || pending.length === 0) {
            await db.query(
              "INSERT INTO dashboard_commands (id, server_id, command_type, command_data, status) VALUES (?, ?, 'update_settings', ?, 'pending')",
              [randomUUID(), sid, JSON.stringify({ fetch_settings: true })]
            );
          }
        } catch (_) {}
      }

      return res.status(200).json({ success: true, updated: result.affectedRows });
    } catch (err) {
      console.error(`DB update error on ${table}:`, err);
      return res.status(500).json({ error: err.message || 'Database update error' });
    }
  }

  // ---------------------------------------------------------
  // DELETE: Delete records with filter
  // ---------------------------------------------------------
  if (req.method === 'DELETE') {
    try {
      let whereCol = null;
      let whereVal = null;

      if (req.query.eq) {
        const eqStr = String(req.query.eq);
        const sep = eqStr.indexOf(':');
        if (sep > 0) {
          whereCol = eqStr.slice(0, sep).trim();
          whereVal = eqStr.slice(sep + 1);
        }
      }

      if (!whereCol || !isValidIdentifier(whereCol)) {
        return res.status(400).json({ error: 'Filter required for delete' });
      }

      const sql = `DELETE FROM \`${table}\` WHERE \`${whereCol}\` = ?`;
      const [result] = await db.query(sql, [whereVal]);

      return res.status(200).json({ success: true, deleted: result.affectedRows });
    } catch (err) {
      console.error(`DB delete error on ${table}:`, err);
      return res.status(500).json({ error: err.message || 'Database delete error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
