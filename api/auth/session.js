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
    return res.status(200).json({ user: decoded });
  } catch (e) {
    return res.status(401).json({ user: null });
  }
}
