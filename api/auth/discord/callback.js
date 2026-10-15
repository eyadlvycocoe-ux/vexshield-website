const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

let pool = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'mysql-2c01ccb3-eyadlaghnimi2012-de61.i.aivencloud.com',
      port: Number(process.env.DB_PORT || 21202),
      user: process.env.DB_USER || 'avnadmin',
      password: process.env.DB_PASSWORD || Buffer.from('QVZOU19hNHpiZTIzdVBCWWZaUVlTZ0lQ', 'base64').toString('ascii'),
      database: process.env.DB_NAME || 'defaultdb',
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

module.exports = async (req, res) => {
  const { code, state, error } = req.query;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'vexshield-website.vercel.app';
  const baseClientUrl = `${proto}://${host}`;

  if (error || !code) {
    res.writeHead(302, { Location: `${baseClientUrl}/auth?error=${encodeURIComponent(error || 'no_code')}` });
    return res.end();
  }

  const clientId = process.env.DISCORD_CLIENT_ID || '1387345521768665199';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || Buffer.from('Sl94TGpnZG1EMWlNZEw1alkySnlTRDJsTVdSM3MwNm0=', 'base64').toString('ascii');
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${baseClientUrl}/api/auth/discord/callback`;

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Discord token exchange failed:', errText);
      res.writeHead(302, { Location: `${baseClientUrl}/auth?error=token_exchange_failed` });
      return res.end();
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      res.writeHead(302, { Location: `${baseClientUrl}/auth?error=user_fetch_failed` });
      return res.end();
    }

    const discordUser = await userRes.json();
    const userId = discordUser.id;

    // Connect to Aiven Cloud MySQL
    const db = getPool();
    const displayName = discordUser.global_name || discordUser.username;

    await db.query(
      `INSERT INTO discord_users (discord_id, username, display_name, avatar, email, connected_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE username = VALUES(username), display_name = VALUES(display_name), avatar = VALUES(avatar), email = VALUES(email)`,
      [userId, discordUser.username, displayName, discordUser.avatar, discordUser.email || '']
    );

    const [rows] = await db.query('SELECT * FROM discord_users WHERE discord_id = ?', [userId]);
    const dbUser = rows[0] || {};

    const jwtSecret = process.env.JWT_SECRET || '014ba23d46efe965d33ff86030be6e71ad8fbe06b96ff813bdd769d0190a9d1c';
    const token = jwt.sign(
      {
        id: userId,
        username: discordUser.username,
        email: discordUser.email,
        display_name: displayName,
        bio: dbUser.bio || '',
        funds: parseFloat(dbUser.funds) || 0,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const targetUrl = state ? decodeURIComponent(String(state)) : `${baseClientUrl}/my-servers`;

    res.setHeader('Set-Cookie', [
      `token=${token}; Path=/; Max-Age=604800; Secure; SameSite=Lax`,
      `airshield_auth_token=${token}; Path=/; Max-Age=604800; Secure; SameSite=Lax`,
      `sb-aircore-token=${token}; Path=/; Max-Age=604800; Secure; SameSite=Lax`,
      `csrf_token=${userId}-${Date.now()}; Path=/; Max-Age=604800; Secure; SameSite=Lax`
    ]);

    res.writeHead(302, { Location: targetUrl });
    res.end();
  } catch (err) {
    console.error('Discord callback error:', err);
    res.writeHead(302, { Location: `${baseClientUrl}/auth?error=server_error` });
    res.end();
  }
};
