// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'yoyo_secret_key_2024';

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const optionalAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {}
  }
  next();
};

const adminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    next();
  });
};

module.exports = { authMiddleware, optionalAuth, adminMiddleware };
