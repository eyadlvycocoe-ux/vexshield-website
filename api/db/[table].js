import { getPool, getUserFromReq, OWNER_DISCORD_IDS } from '../_db.js';

const ALLOWED_TABLES = new Set([
  'servers',
  'server_admins',
  'discord_users',
  'profiles',
  'pricing_plans',
  'partnerships',
  'feedbacks',
  'bans',
  'api_keys',
  'reports',
  'promotions',
  'redeem_codes',
  'coupon_codes',
  'shop_product_prices',
  'site_settings',
  'user_sessions',
]);

function isValidIdentifier(str) {
  return /^[a-zA-Z0-9_]+$/.test(str);
}

function parsePair(str) {
  if (!str || typeof str !== 'string') return null;
  const idx = str.indexOf(':');
  if (idx === -1) return null;
  const field = str.substring(0, idx).trim();
  const value = str.substring(idx + 1).trim();
  return isValidIdentifier(field) ? { field, value } : null;
}

export default async function handler(req, res) {
  const { table } = req.query;
  if (!table || !ALLOWED_TABLES.has(String(table).toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden table' });
  }

  const pool = getPool();
  const tableName = String(table).toLowerCase();

  if (req.method === 'GET') {
    try {
      const { select, eq, neq, in: inVal, order, limit, offset, count, head } = req.query;
      const isCountHead = count === 'exact' && (head === 'true' || head === true);

      let selectCols = '*';
      if (select && select !== '*') {
        const parts = select.split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.every((p) => isValidIdentifier(p))) {
          selectCols = parts.map((p) => `\`${p}\``).join(', ');
        }
      }

      const whereClauses = [];
      const params = [];

      if (eq) {
        const pairs = Array.isArray(eq) ? eq : [eq];
        for (const p of pairs) {
          const parsed = parsePair(p);
          if (parsed && parsed.value !== 'undefined') {
            whereClauses.push(`\`${parsed.field}\` = ?`);
            params.push(parsed.value === 'true' ? 1 : parsed.value === 'false' ? 0 : parsed.value);
          }
        }
      }

      if (neq) {
        const pairs = Array.isArray(neq) ? neq : [neq];
        for (const p of pairs) {
          const parsed = parsePair(p);
          if (parsed && parsed.value !== 'undefined') {
            whereClauses.push(`\`${parsed.field}\` != ?`);
            params.push(parsed.value);
          }
        }
      }

      if (inVal) {
        const parsed = parsePair(inVal);
        if (parsed) {
          const vals = parsed.value.split(',').map((v) => v.trim());
          if (vals.length > 0) {
            whereClauses.push(`\`${parsed.field}\` IN (${vals.map(() => '?').join(',')})`);
            params.push(...vals);
          }
        }
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      if (isCountHead) {
        const [cntRows] = await pool.query(
          `SELECT COUNT(*) as cnt FROM \`${tableName}\` ${whereSql}`,
          params
        );
        return res.status(200).json({ count: cntRows[0]?.cnt || 0 });
      }

      let orderSql = '';
      if (order) {
        const parsed = parsePair(order);
        if (parsed) {
          const dir = parsed.value.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderSql = `ORDER BY \`${parsed.field}\` ${dir}`;
        }
      }

      let limitSql = 'LIMIT 200';
      if (limit) {
        const n = parseInt(String(limit), 10);
        if (Number.isFinite(n) && n > 0) {
          limitSql = `LIMIT ${Math.min(200, n)}`;
        }
      }

      let offsetSql = '';
      if (offset) {
        const o = parseInt(String(offset), 10);
        if (Number.isFinite(o) && o >= 0) {
          offsetSql = `OFFSET ${o}`;
        }
      }

      const querySql = `SELECT ${selectCols} FROM \`${tableName}\` ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
      const [rows] = await pool.query(querySql, params);
      return res.status(200).json(rows);
    } catch (e) {
      console.error(`GET /api/db/${tableName} error:`, e);
      return res.status(500).json({ error: e.message || 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const user = getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid body' });
      }

      const keys = Object.keys(data).filter(isValidIdentifier);
      if (keys.length === 0) return res.status(400).json({ error: 'No valid columns' });

      const values = keys.map((k) => data[k]);
      const sql = `INSERT INTO \`${tableName}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
      await pool.query(sql, values);
      return res.status(200).json({ success: true, data });
    } catch (e) {
      console.error(`POST /api/db/${tableName} error:`, e);
      return res.status(500).json({ error: e.message || 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
