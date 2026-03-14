// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { adminMiddleware } = require('../middleware/auth');

router.use(adminMiddleware);

// GET platform stats
router.get('/stats', async (req, res) => {
  try {
    const [[users]] = await db.query('SELECT COUNT(*) as cnt FROM users WHERE is_admin=0');
    const [[quizzes]] = await db.query('SELECT COUNT(*) as cnt FROM quizzes WHERE is_deleted=0');
    const [[published]] = await db.query('SELECT COUNT(*) as cnt FROM quizzes WHERE is_published=1 AND is_deleted=0');
    const [[plays]] = await db.query('SELECT COUNT(*) as cnt FROM quiz_plays');
    const [[reports]] = await db.query('SELECT COUNT(*) as cnt FROM quiz_reports WHERE status="pending"');
    const [recentUsers] = await db.query(
      'SELECT id, pseudo, email, created_at FROM users WHERE is_admin=0 ORDER BY created_at DESC LIMIT 5'
    );
    const [recentReports] = await db.query(`
      SELECT r.*, q.title as quiz_title, u.pseudo as reporter_pseudo
      FROM quiz_reports r
      JOIN quizzes q ON r.quiz_id = q.id
      LEFT JOIN users u ON r.reporter_id = u.id
      WHERE r.status='pending'
      ORDER BY r.created_at DESC LIMIT 10
    `);
    res.json({
      stats: {
        total_users: users.cnt,
        total_quizzes: quizzes.cnt,
        published_quizzes: published.cnt,
        total_plays: plays.cnt,
        pending_reports: reports.cnt
      },
      recent_users: recentUsers,
      pending_reports: recentReports
    });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET all users
router.get('/users', async (req, res) => {
  const { search, limit = 20, offset = 0 } = req.query;
  try {
    let where = 'WHERE is_admin=0';
    let params = [];
    if (search) { where += ' AND (pseudo LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const [rows] = await db.query(
      `SELECT id, pseudo, email, total_score, quizzes_played, quizzes_created, flames_received, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=? AND is_admin=0', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET all quizzes (including unpublished)
router.get('/quizzes', async (req, res) => {
  const { limit = 20, offset = 0, search } = req.query;
  try {
    let where = ['q.is_deleted=0'];
    let params = [];
    if (search) { where.push('q.title LIKE ?'); params.push(`%${search}%`); }
    const [rows] = await db.query(`
      SELECT q.id, q.title, q.quiz_type, q.is_published, q.plays_count, q.created_at,
             u.pseudo as creator_pseudo, c.name_fr as category
      FROM quizzes q
      JOIN users u ON q.creator_id=u.id
      JOIN categories c ON q.category_id=c.id
      WHERE ${where.join(' AND ')}
      ORDER BY q.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// DELETE quiz (hard delete from admin)
router.delete('/quizzes/:id', async (req, res) => {
  try {
    await db.query('UPDATE quizzes SET is_deleted=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// PUT dismiss/resolve report
router.put('/reports/:id', async (req, res) => {
  const { status } = req.body;
  if (!['reviewed', 'dismissed'].includes(status))
    return res.status(400).json({ error: 'Statut invalide' });
  try {
    await db.query('UPDATE quiz_reports SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET categories
router.get('/categories', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM categories');
  res.json(rows);
});

// POST add category
router.post('/categories', async (req, res) => {
  const { slug, name_fr, name_en, icon } = req.body;
  try {
    await db.query('INSERT INTO categories (slug, name_fr, name_en, icon) VALUES (?,?,?,?)', [slug, name_fr, name_en, icon]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

module.exports = router;
