export default function handler(req, res) {
  const token = 'csrf-' + Math.random().toString(36).substring(2);
  res.setHeader('Set-Cookie', `csrf_token=${token}; Path=/; SameSite=Lax; Secure`);
  res.status(200).json({ csrf_token: token });
}
