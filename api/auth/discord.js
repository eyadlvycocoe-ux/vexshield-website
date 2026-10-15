export default function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID || "1558602808511561758";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "vexshield-website.vercel.app";
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${proto}://${host}/api/auth/discord/callback`;
  
  const redirectTo = req.query.redirectTo || `${proto}://${host}/my-servers`;
  const state = encodeURIComponent(String(redirectTo));
  
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email%20guilds%20guilds.join&state=${state}`;
  
  res.writeHead(302, { Location: url });
  res.end();
}
