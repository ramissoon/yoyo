// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// GET user profile
router.get('/:pseudo', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, pseudo, icon, language, total_score, flames_received, quizzes_played, quizzes_created, created_at
       FROM users WHERE pseudo=? AND is_admin=0`,
      [req.params.pseudo]
    );
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const user = rows[0];

    const [badges] = await db.query(`
      SELECT b.id, b.level, b.name_fr, b.name_en, c.name_fr as cat_fr, c.icon as cat_icon
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      JOIN categories c ON b.category_id = c.id
      WHERE ub.user_id=?
    `, [user.id]);
    user.badges = badges;

    const [quizzes] = await db.query(
      `SELECT id, title, quiz_type, plays_count, likes_count, created_at
       FROM quizzes WHERE creator_id=? AND is_published=1 AND is_deleted=0
       ORDER BY created_at DESC LIMIT 10`,
      [user.id]
    );
    user.quizzes = quizzes;

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// PUT update icon
router.put('/me/icon', authMiddleware, async (req, res) => {
  const { icon } = req.body;
  const validIcons = ['lion','elephant','leopard','eagle','crocodile','flamingo','hippo','cheetah'];
  if (!validIcons.includes(icon)) return res.status(400).json({ error: 'Icône invalide' });
  try {
    await db.query('UPDATE users SET icon=? WHERE id=?', [icon, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// POST give flame to user
router.post('/:id/flame', authMiddleware, async (req, res) => {
  const toId = parseInt(req.params.id);
  if (toId === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous enflammer' });
  try {
    const [exists] = await db.query(
      'SELECT id FROM flames WHERE from_user_id=? AND to_user_id=?',
      [req.user.id, toId]
    );
    if (exists.length) {
      await db.query('DELETE FROM flames WHERE from_user_id=? AND to_user_id=?', [req.user.id, toId]);
      await db.query('UPDATE users SET flames_received = flames_received - 1 WHERE id=?', [toId]);
      res.json({ flamed: false });
    } else {
      await db.query('INSERT INTO flames (from_user_id, to_user_id) VALUES (?,?)', [req.user.id, toId]);
      await db.query('UPDATE users SET flames_received = flames_received + 1 WHERE id=?', [toId]);
      res.json({ flamed: true });
    }
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET leaderboard - top players by score
router.get('/leaderboard/players', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT id, pseudo, icon, total_score, quizzes_played
       FROM users WHERE is_admin=0
       ORDER BY total_score DESC LIMIT ?`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET leaderboard - top creators by flames
router.get('/leaderboard/creators', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT id, pseudo, icon, flames_received, quizzes_created
       FROM users WHERE is_admin=0
       ORDER BY flames_received DESC LIMIT ?`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

module.exports = router;
