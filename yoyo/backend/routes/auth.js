// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const JWT_SECRET = process.env.JWT_SECRET || 'yoyo_secret_key_2024';

// Register
router.post('/register', async (req, res) => {
  const { email, pseudo, password, language = 'fr' } = req.body;
  if (!email || !pseudo || !password)
    return res.status(400).json({ error: 'Champs requis manquants' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });
  try {
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email=? OR pseudo=?', [email, pseudo]
    );
    if (existing.length) return res.status(409).json({ error: 'Email ou pseudo déjà utilisé' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (email, pseudo, password_hash, language) VALUES (?,?,?,?)',
      [email, pseudo, hash, language]
    );
    const token = jwt.sign(
      { id: result.insertId, pseudo, is_admin: 0 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: result.insertId, pseudo, language, is_admin: 0 } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Champs requis' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });
    const token = jwt.sign(
      { id: user.id, pseudo: user.pseudo, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id, pseudo: user.pseudo,
        language: user.language, is_admin: user.is_admin,
        icon: user.icon, total_score: user.total_score
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.query(
      'SELECT id, pseudo, email, icon, language, is_admin, total_score, flames_received, quizzes_played, quizzes_created FROM users WHERE id=?',
      [decoded.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
});

module.exports = router;
