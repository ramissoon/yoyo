// routes/admin.js
const router = require('express').Router();
const db     = require('../config/db');
const { adminAuth } = require('../middleware/auth');

router.use(adminAuth);

router.get('/stats', async (req, res) => {
  try {
    const [[users]]    = await db.query('SELECT COUNT(*) cnt FROM users WHERE is_admin=0');
    const [[quizzes]]  = await db.query('SELECT COUNT(*) cnt FROM quizzes WHERE is_deleted=0');
    const [[published]]= await db.query('SELECT COUNT(*) cnt FROM quizzes WHERE is_published=1 AND is_deleted=0');
    const [[plays]]    = await db.query('SELECT COUNT(*) cnt FROM quiz_plays');
    const [[reports]]  = await db.query("SELECT COUNT(*) cnt FROM quiz_reports WHERE status='pending'");
    const [pending]    = await db.query(`
      SELECT r.id, r.reason, r.created_at, r.status,
             q.id quiz_id, q.title quiz_title,
             u.pseudo reporter_pseudo
      FROM quiz_reports r
      JOIN quizzes q ON r.quiz_id=q.id
      LEFT JOIN users u ON r.reporter_id=u.id
      WHERE r.status='pending'
      ORDER BY r.created_at DESC LIMIT 20
    `);
    const [recent] = await db.query(
      'SELECT id,pseudo,email,created_at FROM users WHERE is_admin=0 ORDER BY created_at DESC LIMIT 10'
    );
    res.json({
      stats: { users: users.cnt, quizzes: quizzes.cnt, published: published.cnt, plays: plays.cnt, reports: reports.cnt },
      pending_reports: pending,
      recent_users: recent
    });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

router.get('/users', async (req, res) => {
  const { search = '', limit = 30, offset = 0 } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT id,pseudo,email,total_score,quizzes_played,quizzes_created,flames_received,created_at
       FROM users WHERE is_admin=0 AND (pseudo LIKE ? OR email LIKE ?)
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, +limit, +offset]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=? AND is_admin=0', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

router.get('/quizzes', async (req, res) => {
  const { search = '', limit = 30, offset = 0 } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT q.id,q.title,q.quiz_type,q.is_published,q.is_locked,q.plays_count,q.created_at,
             u.pseudo creator_pseudo, c.name_fr category
      FROM quizzes q
      JOIN users u ON q.creator_id=u.id
      JOIN categories c ON q.category_id=c.id
      WHERE q.is_deleted=0 AND q.title LIKE ?
      ORDER BY q.created_at DESC LIMIT ? OFFSET ?
    `, [`%${search}%`, +limit, +offset]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

router.delete('/quizzes/:id', async (req, res) => {
  try {
    await db.query('UPDATE quizzes SET is_deleted=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// Resolve report + unlock quiz
router.put('/reports/:id', async (req, res) => {
  const { status } = req.body;
  if (!['reviewed','dismissed'].includes(status))
    return res.status(400).json({ error: 'Statut invalide' });
  try {
    const [[rep]] = await db.query('SELECT quiz_id FROM quiz_reports WHERE id=?', [req.params.id]);
    await db.query('UPDATE quiz_reports SET status=? WHERE id=?', [status, req.params.id]);
    // If dismissed → unlock quiz. If reviewed → keep locked until admin manually unlocks
    if (status === 'dismissed' && rep) {
      await db.query('UPDATE quizzes SET is_locked=0 WHERE id=?', [rep.quiz_id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// Unlock quiz manually
router.put('/quizzes/:id/unlock', async (req, res) => {
  try {
    await db.query('UPDATE quizzes SET is_locked=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

module.exports = router;

// ── categories.js (inline export) ────────────────────────────────────────────
// Separate file below
