import mysql from 'mysql2/promise';

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
  'whitelist_entries'
]);

function isValidIdentifier(val) {
  return typeof val === 'string' && /^[a-zA-Z0-9_]+$/.test(val);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  // Extract table from query string or path parameter
  const table = String(req.query?.table || '').trim();
  if (!table || !isValidIdentifier(table)) {
    return res.status(400).json({ error: 'Invalid or missing table parameter' });
  }

  if (!ALLOWED_TABLES.has(table.toLowerCase())) {
    return res.status(403).json({ error: `Table '${table}' is not accessible` });
  }

  const db = getPool();

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

  return res.status(405).json({ error: 'Method not allowed' });
}
