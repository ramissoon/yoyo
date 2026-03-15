const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'yoyo_secret_v2';

const auth = (req, res, next) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};

const optAuth = (req, res, next) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch {}
  }
  next();
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Accès refusé' });
    next();
  });
};

module.exports = { auth, optAuth, adminAuth };
