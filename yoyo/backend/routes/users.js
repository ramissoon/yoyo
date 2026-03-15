const router = require('express').Router();
const db     = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /users/leaderboard/players
router.get('/leaderboard/players', async (req, res) => {
  const { limit = 50 } = req.query;
  try {
    const [rows] = await db.query(
      'SELECT id,pseudo,icon,total_score,quizzes_played FROM users WHERE is_admin=0 ORDER BY total_score DESC LIMIT ?',
      [+limit]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// GET /users/leaderboard/creators
router.get('/leaderboard/creators', async (req, res) => {
  const { limit = 50 } = req.query;
  try {
    const [rows] = await db.query(
      'SELECT id,pseudo,icon,flames_received,quizzes_created FROM users WHERE is_admin=0 ORDER BY flames_received DESC LIMIT ?',
      [+limit]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// GET /users/:pseudo
router.get('/:pseudo', async (req, res) => {
  try {
    const [[u]] = await db.query(
      'SELECT id,pseudo,icon,language,total_score,flames_received,quizzes_played,quizzes_created,created_at FROM users WHERE pseudo=?',
      [req.params.pseudo]
    );
    if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const [badges] = await db.query(`
      SELECT b.id,b.level,b.name_fr,b.name_en,c.name_fr cat_fr,c.icon cat_icon,ub.earned_at
      FROM user_badges ub
      JOIN badges b     ON ub.badge_id    = b.id
      JOIN categories c ON b.category_id  = c.id
      WHERE ub.user_id=?
      ORDER BY ub.earned_at DESC
    `, [u.id]);
    const [quizzes] = await db.query(
      'SELECT id,title,quiz_type,plays_count,likes_count,image_url,created_at FROM quizzes WHERE creator_id=? AND is_published=1 AND is_deleted=0 ORDER BY created_at DESC LIMIT 20',
      [u.id]
    );
    res.json({ ...u, badges, quizzes });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erreur' }); }
});

// POST /users/:id/flame
router.post('/:id/flame', auth, async (req, res) => {
  const toId = +req.params.id;
  if (toId === req.user.id) return res.status(400).json({ error: 'Impossible de s\'enflammer soi-même' });
  try {
    const [[ex]] = await db.query('SELECT id FROM flames WHERE from_user_id=? AND to_user_id=?', [req.user.id, toId]);
    if (ex) {
      await db.query('DELETE FROM flames WHERE from_user_id=? AND to_user_id=?', [req.user.id, toId]);
      await db.query('UPDATE users SET flames_received=GREATEST(flames_received-1,0) WHERE id=?', [toId]);
      return res.json({ flamed: false });
    }
    await db.query('INSERT INTO flames (from_user_id,to_user_id) VALUES (?,?)', [req.user.id, toId]);
    await db.query('UPDATE users SET flames_received=flames_received+1 WHERE id=?', [toId]);
    res.json({ flamed: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// PUT /users/me/icon
router.put('/me/icon', auth, async (req, res) => {
  const VALID = ['lion','elephant','leopard','eagle','crocodile','flamingo','hippo','cheetah'];
  const { icon } = req.body;
  if (!VALID.includes(icon)) return res.status(400).json({ error: 'Icône invalide' });
  try {
    await db.query('UPDATE users SET icon=? WHERE id=?', [icon, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// GET /users/:pseudo/flame-status (check if current user flamed this user)
router.get('/:id/flame-status', auth, async (req, res) => {
  try {
    const [[ex]] = await db.query('SELECT id FROM flames WHERE from_user_id=? AND to_user_id=?', [req.user.id, req.params.id]);
    res.json({ flamed: !!ex });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

module.exports = router;
