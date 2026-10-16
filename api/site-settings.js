export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    currency: 'EUR',
    currency_symbol: '€',
    brand_name: 'VexShield',
    support_discord: 'https://discord.gg/5WgtMWbtgD',
  });
}
