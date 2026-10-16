import { getPool } from '../../_db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60');

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT product_key, duration_key, price_usd, display_order FROM shop_product_prices WHERE is_active = 1 ORDER BY display_order ASC'
    );
    return res.status(200).json(rows);
  } catch (e) {
    console.error('shop/prices error:', e);
    return res.status(500).json({ error: 'Failed to fetch prices' });
  }
}
