import mysql from 'mysql2/promise';
import crypto, { randomUUID } from 'crypto';

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
  const cookieHeader = req.headers?.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)(?:token|sb-aircore-token|airshield_auth_token)=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : (req.headers?.authorization?.replace(/^Bearer\s+/i, ''));
  if (!token) return null;
  return verifyJwt(token, JWT_SECRET);
}

// In-memory microcache (TTL: 4s) for high-frequency reads
const memoryCache = new Map();
const CACHE_TTL_MS = 4000;

function getCached(key) {
  const item = memoryCache.get(key);
  if (item && Date.now() < item.exp) {
    return item.data;
  }
  if (item) memoryCache.delete(key);
  return null;
}

function setCached(key, data) {
  if (memoryCache.size > 800) {
    memoryCache.clear();
  }
  memoryCache.set(key, { data, exp: Date.now() + CACHE_TTL_MS });
}

function clearCache() {
  memoryCache.clear();
}

/** Robust query executor with auto-retry for transient connection hiccups / pool saturation */
async function executeQueryWithRetry(db, sql, params = [], retries = 2) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    const isConnErr =
      err.message?.includes('Too many connections') ||
      err.message?.includes('ECONNRESET') ||
      err.code === 'PROTOCOL_CONNECTION_LOST' ||
      err.code === 'ER_CON_COUNT_ERROR';

    if (retries > 0 && isConnErr) {
      await new Promise(r => setTimeout(r, 200 * (3 - retries)));
      return executeQueryWithRetry(db, sql, params, retries - 1);
    }
    throw err;
  }
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
  'reports',
  'dashboard_summary',
  'license_redeem',
  'redeem_license'
]);

function isValidIdentifier(val) {
  return typeof val === 'string' && /^[a-zA-Z0-9_]+$/.test(val);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, *');

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
  // GET: Fast Read with Edge CDN & In-Memory Microcache
  // ---------------------------------------------------------
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=2, stale-while-revalidate=8');

    const cacheKey = req.url || `${table}:${JSON.stringify(req.query)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    try {
      // -------------------------------------------------------
      // Special Accelerated Consolidated Dashboard Summary
      // -------------------------------------------------------
      if (table.toLowerCase() === 'dashboard_summary') {
        let sid = String(req.query.server_id || req.query.sid || '').trim();
        if (!sid && req.query.eq) {
          const list = Array.isArray(req.query.eq) ? req.query.eq : [req.query.eq];
          for (const item of list) {
            const sep = String(item).indexOf(':');
            if (sep > 0 && item.slice(0, sep).trim() === 'server_id') {
              sid = item.slice(sep + 1).trim();
              break;
            }
          }
        }
        if (!sid) {
          return res.status(400).json({ error: 'server_id required for dashboard_summary' });
        }

        const [
          [serverRows],
          [snapshotRows],
          [settingsRows],
          [acRows],
          [[bansCountRow]],
          [[kicksCountRow]],
          [[warnsCountRow]],
          [recentBansRows],
          [recentKicksRows]
        ] = await Promise.all([
          executeQueryWithRetry(db, 'SELECT * FROM `servers` WHERE `server_id` = ? AND `soft_deleted_at` IS NULL LIMIT 1', [sid]),
          executeQueryWithRetry(db, 'SELECT * FROM `players_snapshots` WHERE `server_id` = ? LIMIT 1', [sid]),
          executeQueryWithRetry(db, 'SELECT `settings` FROM `server_settings` WHERE `server_id` = ? LIMIT 1', [sid]),
          executeQueryWithRetry(db, 'SELECT `version`, `is_active` FROM `anticheat_files` ORDER BY `uploaded_at` DESC LIMIT 5'),
          executeQueryWithRetry(db, 'SELECT COUNT(*) as count FROM `bans` WHERE `server_id` = ?', [sid]),
          executeQueryWithRetry(db, 'SELECT COUNT(*) as count FROM `kicks` WHERE `server_id` = ?', [sid]),
          executeQueryWithRetry(db, 'SELECT COUNT(*) as count FROM `warns` WHERE `server_id` = ?', [sid]),
          executeQueryWithRetry(db, 'SELECT `player_name`, `reason`, `created_at` FROM `bans` WHERE `server_id` = ? ORDER BY `created_at` DESC LIMIT 150', [sid]),
          executeQueryWithRetry(db, 'SELECT `player_name`, `reason`, `created_at` FROM `kicks` WHERE `server_id` = ? ORDER BY `created_at` DESC LIMIT 2', [sid]),
        ]);

        const summaryResult = {
          server: serverRows?.[0] || null,
          snapshot: snapshotRows?.[0] || null,
          settings: settingsRows?.[0]?.settings || null,
          anticheat: acRows?.find(r => r.is_active)?.version || acRows?.[0]?.version || 'vBeta',
          bansCount: Number(bansCountRow?.count || 0),
          kicksCount: Number(kicksCountRow?.count || 0),
          warnsCount: Number(warnsCountRow?.count || 0),
          recentBans: recentBansRows || [],
          recentKicks: recentKicksRows || [],
        };

        setCached(cacheKey, summaryResult);
        return res.status(200).json(summaryResult);
      }

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

      const FILTER_KEYS = new Set(['eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'in', 'is']);

      for (const [key, val] of Object.entries(req.query)) {
        if (['table', 'select', 'order', 'limit', 'offset', 'count', 'head'].includes(key)) continue;

        if (FILTER_KEYS.has(key)) {
          const list = Array.isArray(val) ? val : [val];
          for (const item of list) {
            const sep = String(item).indexOf(':');
            if (sep > 0) {
              const col = item.slice(0, sep).trim();
              const rawVal = item.slice(sep + 1);
              if (isValidIdentifier(col)) {
                if (key === 'eq') {
                  if (rawVal === 'true' || rawVal === '1') {
                    whereClauses.push(`(\`${col}\` = 1 OR \`${col}\` = 'true')`);
                  } else if (rawVal === 'false' || rawVal === '0') {
                    whereClauses.push(`(\`${col}\` = 0 OR \`${col}\` = 'false')`);
                  } else {
                    whereClauses.push(`\`${col}\` = ?`);
                    params.push(rawVal);
                  }
                } else if (key === 'neq') {
                  if (rawVal === 'true' || rawVal === '1') {
                    whereClauses.push(`(\`${col}\` = 0 OR \`${col}\` != 'true' OR \`${col}\` IS NULL)`);
                  } else if (rawVal === 'false' || rawVal === '0') {
                    whereClauses.push(`(\`${col}\` = 1 OR \`${col}\` != 'false' OR \`${col}\` IS NULL)`);
                  } else {
                    whereClauses.push(`(\`${col}\` != ? OR \`${col}\` IS NULL)`);
                    params.push(rawVal);
                  }
                } else if (key === 'gte') {
                  whereClauses.push(`\`${col}\` >= ?`);
                  params.push(rawVal);
                } else if (key === 'lte') {
                  whereClauses.push(`\`${col}\` <= ?`);
                  params.push(rawVal);
                } else if (key === 'gt') {
                  whereClauses.push(`\`${col}\` > ?`);
                  params.push(rawVal);
                } else if (key === 'lt') {
                  whereClauses.push(`\`${col}\` < ?`);
                  params.push(rawVal);
                } else if (key === 'like') {
                  whereClauses.push(`\`${col}\` LIKE ?`);
                  try { params.push(decodeURIComponent(rawVal)); } catch (_) { params.push(rawVal); }
                } else if (key === 'ilike') {
                  whereClauses.push(`LOWER(\`${col}\`) LIKE LOWER(?)`);
                  try { params.push(decodeURIComponent(rawVal)); } catch (_) { params.push(rawVal); }
                } else if (key === 'in') {
                  const inVals = rawVal.split(',').map(s => s.trim()).filter(Boolean);
                  if (inVals.length > 0) {
                    whereClauses.push(`\`${col}\` IN (${inVals.map(() => '?').join(', ')})`);
                    params.push(...inVals);
                  }
                } else if (key === 'is') {
                  if (rawVal === 'null') {
                    whereClauses.push(`\`${col}\` IS NULL`);
                  } else if (rawVal === 'not.null' || rawVal === 'not null') {
                    whereClauses.push(`\`${col}\` IS NOT NULL`);
                  }
                }
              }
            }
          }
        } else if (isValidIdentifier(key)) {
          if (val === 'true' || val === '1' || val === 1 || val === true) {
            whereClauses.push(`(\`${key}\` = 1 OR \`${key}\` = 'true')`);
          } else if (val === 'false' || val === '0' || val === 0 || val === false) {
            whereClauses.push(`(\`${key}\` = 0 OR \`${key}\` = 'false')`);
          } else {
            whereClauses.push(`\`${key}\` = ?`);
            params.push(val);
          }
        }
      }

      if (table === 'servers' && !whereClauses.some(w => w.includes('soft_deleted_at'))) {
        whereClauses.push('`soft_deleted_at` IS NULL');
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      if (isCountHead) {
        const [[countRow]] = await executeQueryWithRetry(
          db,
          `SELECT COUNT(*) as count FROM \`${table}\` ${whereSql}`,
          params
        );
        const countRes = { count: Number(countRow?.count || 0) };
        setCached(cacheKey, countRes);
        return res.status(200).json(countRes);
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

      const [rows] = await executeQueryWithRetry(db, querySql, queryParams);
      setCached(cacheKey, rows);
      return res.status(200).json(rows);
    } catch (err) {
      console.error(`DB query error on ${table}:`, err);
      return res.status(500).json({ error: err.message || 'Database error' });
    }
  }

  // Mutations invalidate caches and must not be cached by Edge
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  clearCache();

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
      if (table.toLowerCase() === 'license_redeem' || table.toLowerCase() === 'redeem_license') {
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

        const [existing] = await executeQueryWithRetry(
          db,
          'SELECT id, server_id, license_key, owner_email, server_ip, display_name FROM servers WHERE license_key = ? LIMIT 1',
          [licenseKey]
        );

        let assignedServerId = null;

        const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString().slice(0, 19).replace('T', ' ') : null;

        if (existing && existing.length > 0) {
          const row = existing[0];
          assignedServerId = row.server_id;

          await executeQueryWithRetry(
            db,
            `UPDATE servers 
             SET server_ip = ?, 
                 owner_email = COALESCE(NULLIF(owner_email, ''), ?), 
                 status = 'offline', 
                 soft_deleted_at = NULL
             WHERE license_key = ?`,
            [serverIp, ownerEmail, licenseKey]
          );
        } else {
          assignedServerId = `VexShield-${randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
          const newId = randomUUID();

          await executeQueryWithRetry(
            db,
            `INSERT INTO servers (
              id, server_id, license_key, server_ip, display_name, status,
              owner_email, expires_at, created_at, last_update,
              ent_airshield, ent_airscanner, ent_airpc, ent_airzeroflood
            ) VALUES (
              ?, ?, ?, ?, ?, 'offline',
              ?, ?, NOW(), NULL,
              1, 1, 1, 1
            )`,
            [newId, assignedServerId, licenseKey, serverIp, 'VexShield Server', ownerEmail, expiresAt]
          );
        }

        try {
          await executeQueryWithRetry(
            db,
            `INSERT INTO server_settings (id, server_id, settings, updated_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE updated_at = NOW()`,
            [randomUUID(), assignedServerId, JSON.stringify({ ServerName: 'VexShield Protected Server' })]
          );
        } catch (_) {}

        if (userId) {
          try {
            await executeQueryWithRetry(
              db,
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
      }
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

        await executeQueryWithRetry(db, sql, values);
        results.push(row);

        // If settings were updated, queue a live update command for FiveM
        if (table === 'server_settings' && row.server_id) {
          try {
            const sid = String(row.server_id).trim();
            const [pending] = await executeQueryWithRetry(
              db,
              "SELECT id FROM dashboard_commands WHERE server_id = ? AND command_type = 'update_settings' AND status = 'pending' LIMIT 1",
              [sid]
            );
            if (!pending || pending.length === 0) {
              await executeQueryWithRetry(
                db,
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
      const updateWhereClauses = [];
      const updateWhereParams = [];

      if (req.query.eq) {
        const list = Array.isArray(req.query.eq) ? req.query.eq : [req.query.eq];
        for (const item of list) {
          const sep = String(item).indexOf(':');
          if (sep > 0) {
            const col = item.slice(0, sep).trim();
            const val = item.slice(sep + 1);
            if (isValidIdentifier(col)) {
              updateWhereClauses.push(`\`${col}\` = ?`);
              updateWhereParams.push(val);
            }
          }
        }
      }

      for (const [k, v] of Object.entries(req.query)) {
        if (!['table', 'select', 'order', 'limit', 'offset', 'count', 'head', 'eq'].includes(k) && isValidIdentifier(k)) {
          updateWhereClauses.push(`\`${k}\` = ?`);
          updateWhereParams.push(v);
        }
      }

      // If PUT without where filter, treat as UPSERT
      if (updateWhereClauses.length === 0 && req.method === 'PUT' && body && typeof body === 'object') {
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
          await executeQueryWithRetry(db, sql, values);
          return res.status(200).json(row);
        }
      }

      if (updateWhereClauses.length === 0) {
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
      const updateValues = [...updateKeys.map(k => updateData[k]), ...updateWhereParams];

      const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${updateWhereClauses.join(' AND ')}`;
      const [result] = await executeQueryWithRetry(db, sql, updateValues);

      // If server_settings or servers table was updated, queue live reload
      if (table === 'server_settings' || table === 'servers') {
        try {
          const sid = String(body.server_id || updateWhereParams[0] || '').trim();
          if (sid) {
            const [pending] = await executeQueryWithRetry(
              db,
              "SELECT id FROM dashboard_commands WHERE server_id = ? AND command_type = 'update_settings' AND status = 'pending' LIMIT 1",
              [sid]
            );
            if (!pending || pending.length === 0) {
              await executeQueryWithRetry(
                db,
                "INSERT INTO dashboard_commands (id, server_id, command_type, command_data, status) VALUES (?, ?, 'update_settings', ?, 'pending')",
                [randomUUID(), sid, JSON.stringify({ fetch_settings: true })]
              );
            }
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
  // DELETE: Delete records with filter & Cascading Cleanup
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

      // If deleting a server, cascade delete all child references first to avoid FK constraint failures
      if (table === 'servers') {
        try {
          const [targetRows] = await executeQueryWithRetry(
            db,
            `SELECT id, server_id FROM servers WHERE \`${whereCol}\` = ? OR id = ? OR server_id = ? LIMIT 1`,
            [whereVal, whereVal, whereVal]
          );
          const sid = targetRows?.[0]?.server_id;
          const targetId = targetRows?.[0]?.id;

          if (sid || targetId) {
            const childTables = [
              'server_admins',
              'server_settings',
              'server_resources',
              'bans',
              'kicks',
              'warns',
              'reports',
              'dashboard_commands',
              'consoles',
              'live_monitor_frames',
              'players_snapshots'
            ];
            for (const ct of childTables) {
              try {
                if (sid) await executeQueryWithRetry(db, `DELETE FROM \`${ct}\` WHERE server_id = ?`, [sid]);
              } catch (_) {}
            }
            const [delRes] = await executeQueryWithRetry(db, 'DELETE FROM servers WHERE id = ? OR server_id = ?', [targetId || whereVal, sid || whereVal]);
            return res.status(200).json({ success: true, deleted: delRes.affectedRows });
          }
        } catch (serverDelErr) {
          console.error('[db:servers] cascade delete failed:', serverDelErr);
        }
      }

      const sql = `DELETE FROM \`${table}\` WHERE \`${whereCol}\` = ?`;
      const [result] = await executeQueryWithRetry(db, sql, [whereVal]);

      return res.status(200).json({ success: true, deleted: result.affectedRows });
    } catch (err) {
      console.error(`DB delete error on ${table}:`, err);
      return res.status(500).json({ error: err.message || 'Database delete error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
