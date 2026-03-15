const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const SECRET  = process.env.JWT_SECRET || 'yoyo_secret_v2';

const sign = (u) => jwt.sign(
  { id: u.id, pseudo: u.pseudo, is_admin: u.is_admin },
  SECRET, { expiresIn: '30d' }
);

// POST /register
router.post('/register', async (req, res) => {
  const { email, pseudo, password, language = 'fr' } = req.body;
  if (!email || !pseudo || !password)
    return res.status(400).json({ error: 'Champs requis manquants' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (6 car. min)' });
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(pseudo))
    return res.status(400).json({ error: 'Pseudo invalide (3-20 car. alphanumériques)' });
  try {
    const [ex] = await db.query(
      'SELECT id FROM users WHERE email=? OR pseudo=?', [email, pseudo]
    );
    if (ex.length) return res.status(409).json({ error: 'Email ou pseudo déjà utilisé' });
    const hash = await bcrypt.hash(password, 12);
    const [r] = await db.query(
      'INSERT INTO users (email,pseudo,password_hash,language) VALUES (?,?,?,?)',
      [email, pseudo, hash, language]
    );
    const user = { id: r.insertId, pseudo, is_admin: 0, language, icon: 'lion', total_score: 0 };
    res.json({ token: sign(user), user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Champs requis' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects' });
    const u = rows[0];
    if (!await bcrypt.compare(password, u.password_hash))
      return res.status(401).json({ error: 'Identifiants incorrects' });
    res.json({
      token: sign(u),
      user: { id: u.id, pseudo: u.pseudo, icon: u.icon, language: u.language,
              is_admin: u.is_admin, total_score: u.total_score,
              flames_received: u.flames_received }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /me
router.get('/me', async (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const [rows] = await db.query(
      'SELECT id,pseudo,email,icon,language,is_admin,total_score,flames_received,quizzes_played,quizzes_created FROM users WHERE id=?',
      [decoded.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Introuvable' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = router;
