import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)(?:token|sb-aircore-token|airshield_auth_token)=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : (req.headers.authorization?.replace(/^Bearer\s+/i, ''));

  if (!token) {
    return res.status(401).json({ user: null });
  }

  const jwtSecret = process.env.JWT_SECRET || '014ba23d46efe965d33ff86030be6e71ad8fbe06b96ff813bdd769d0190a9d1c';
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const displayName = decoded.display_name || decoded.username || (decoded.email ? decoded.email.split('@')[0] : 'User');
    const avatarUrl = decoded.avatar && decoded.id
      ? `https://cdn.discordapp.com/avatars/${decoded.id}/${decoded.avatar}.png`
      : null;

    const userPayload = {
      ...decoded,
      display_name: displayName,
      avatar_url: avatarUrl,
      user_metadata: {
        full_name: displayName,
        name: displayName,
        user_name: decoded.username,
        email: decoded.email,
        avatar_url: avatarUrl,
        avatar: decoded.avatar || null,
        provider_id: decoded.id,
        sub: decoded.id,
        custom_claims: {
          global_name: displayName,
        },
      },
    };

    return res.status(200).json({ user: userPayload, token });
  } catch (e) {
    return res.status(401).json({ user: null });
  }
}
