const router = require('express').Router();
const db     = require('../config/db');
const { auth, optAuth } = require('../middleware/auth');
const multer = require('multer');
const axios  = require('axios');
const fs     = require('fs');

// ImgBB upload helper
async function uploadToImgBB(fileBuffer, filename) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) return null;
  const base64 = fileBuffer.toString('base64');
  const form   = new URLSearchParams();
  form.append('image', base64);
  form.append('name', filename);
  const { data } = await axios.post(
    `https://api.imgbb.com/1/upload?key=${key}`, form
  );
  return data.data.url;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Fichier image requis'));
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function updateQuizStats(quizId) {
  await db.query(`
    UPDATE quizzes SET
      plays_count  = (SELECT COUNT(*)              FROM quiz_plays WHERE quiz_id=?),
      avg_score    = (SELECT IFNULL(AVG(score),0)  FROM quiz_plays WHERE quiz_id=?),
      avg_time     = (SELECT IFNULL(AVG(time_taken),0) FROM quiz_plays WHERE quiz_id=?),
      success_rate = (SELECT IFNULL(AVG(score/NULLIF(total_questions,0))*100,0) FROM quiz_plays WHERE quiz_id=?)
    WHERE id=?
  `, [quizId, quizId, quizId, quizId, quizId]);
}

async function awardBadges(userId) {
  const [cats] = await db.query('SELECT id FROM categories');
  for (const cat of cats) {
    const [[total]] = await db.query(
      'SELECT COUNT(*) as cnt FROM quizzes WHERE category_id=? AND is_published=1 AND is_deleted=0',
      [cat.id]
    );
    if (total.cnt === 0) continue;
    const [[played]] = await db.query(`
      SELECT COUNT(DISTINCT qp.quiz_id) as cnt
      FROM quiz_plays qp JOIN quizzes q ON qp.quiz_id=q.id
      WHERE qp.user_id=? AND q.category_id=?
    `, [userId, cat.id]);
    const ratio = played.cnt / total.cnt;
    const levels = [];
    if (ratio >= 0.25) levels.push('debutant');
    if (ratio >= 0.50) levels.push('intermediaire');
    if (ratio >= 0.75) levels.push('expert');
    for (const level of levels) {
      const [[badge]] = await db.query(
        'SELECT id FROM badges WHERE category_id=? AND level=?', [cat.id, level]
      );
      if (badge) {
        await db.query(
          'INSERT IGNORE INTO user_badges (user_id,badge_id) VALUES (?,?)',
          [userId, badge.id]
        );
      }
    }
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /quizzes
router.get('/', optAuth, async (req, res) => {
  const { category, type, sort = 'popular', search, limit = 12, offset = 0 } = req.query;
  try {
    const where  = ['q.is_published=1', 'q.is_deleted=0'];
    const params = [];
    if (category) { where.push('c.slug=?');      params.push(category); }
    if (type)     { where.push('q.quiz_type=?'); params.push(type); }
    if (search)   { where.push('q.title LIKE ?'); params.push(`%${search}%`); }
    const orderMap = { popular:'q.plays_count DESC', likes:'q.likes_count DESC', newest:'q.created_at DESC' };
    const order = orderMap[sort] || 'q.plays_count DESC';
    const [rows] = await db.query(`
      SELECT q.id, q.title, q.quiz_type, q.time_limit, q.plays_count, q.likes_count,
             q.success_rate, q.image_url, q.created_at,
             u.pseudo creator_pseudo, u.icon creator_icon, u.id creator_id,
             c.name_fr cat_fr, c.name_en cat_en, c.icon cat_icon, c.slug cat_slug
      FROM quizzes q
      JOIN users u      ON q.creator_id  = u.id
      JOIN categories c ON q.category_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `, [...params, +limit, +offset]);
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) total FROM quizzes q JOIN categories c ON q.category_id=c.id WHERE ${where.join(' AND ')}`,
      params
    );
    res.json({ quizzes: rows, total });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erreur serveur' }); }
});

// GET /quizzes/random
router.get('/random', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM quizzes WHERE is_published=1 AND is_deleted=0 ORDER BY RAND() LIMIT 1'
    );
    if (!rows.length) return res.status(404).json({ error: 'Aucun quiz' });
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// GET /quizzes/random-qcm
router.get('/random-qcm', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id FROM quizzes WHERE is_published=1 AND is_deleted=0 AND quiz_type='qcm' ORDER BY RAND() LIMIT 1"
    );
    if (!rows.length) return res.status(404).json({ error: 'Aucun QCM disponible' });
    res.json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// GET /quizzes/:id  (info page)
router.get('/:id', optAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT q.*, u.pseudo creator_pseudo, u.icon creator_icon, u.id creator_uid,
             u.flames_received creator_flames,
             c.name_fr cat_fr, c.name_en cat_en, c.icon cat_icon, c.slug cat_slug
      FROM quizzes q
      JOIN users u      ON q.creator_id  = u.id
      JOIN categories c ON q.category_id = c.id
      WHERE q.id=? AND q.is_deleted=0
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Quiz introuvable' });
    const q = rows[0];
    if (req.user) {
      const [[like]]  = await db.query('SELECT id FROM quiz_likes WHERE quiz_id=? AND user_id=?', [q.id, req.user.id]);
      const [[flame]] = await db.query('SELECT id FROM flames WHERE from_user_id=? AND to_user_id=?', [req.user.id, q.creator_uid]);
      q.user_liked          = !!like;
      q.user_flamed_creator = !!flame;
    }
    // Reports count for admin
    if (req.user?.is_admin) {
      const [[rep]] = await db.query("SELECT COUNT(*) cnt FROM quiz_reports WHERE quiz_id=? AND status='pending'", [q.id]);
      q.pending_reports = rep.cnt;
    }
    res.json(q);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erreur' }); }
});

// GET /quizzes/:id/play
router.get('/:id/play', optAuth, async (req, res) => {
  try {
    const [[quiz]] = await db.query(
      'SELECT id,title,quiz_type,time_limit FROM quizzes WHERE id=? AND is_published=1 AND is_deleted=0',
      [req.params.id]
    );
    if (!quiz) return res.status(404).json({ error: 'Quiz introuvable' });
    const [items] = await db.query(
      'SELECT id,question,answer,alt_answers,image_url,region_id,sort_order FROM quiz_items WHERE quiz_id=? ORDER BY sort_order',
      [req.params.id]
    );
    for (const item of items) {
      item.alt_answers = JSON.parse(item.alt_answers || '[]');
      if (quiz.quiz_type === 'qcm') {
        const [opts] = await db.query(
          'SELECT id,option_text,is_correct FROM qcm_options WHERE item_id=?', [item.id]
        );
        // Shuffle options
        item.options = opts.sort(() => Math.random() - 0.5);
      }
    }
    // Shuffle items for variety (except saisie which has fixed grid)
    if (quiz.quiz_type !== 'saisie') {
      items.sort(() => Math.random() - 0.5);
    }
    res.json({ quiz, items });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erreur' }); }
});

// POST /quizzes/:id/result
router.post('/:id/result', optAuth, async (req, res) => {
  const { score, total_questions, time_taken } = req.body;
  const qid = +req.params.id;
  try {
    await db.query(
      'INSERT INTO quiz_plays (quiz_id,user_id,score,total_questions,time_taken) VALUES (?,?,?,?,?)',
      [qid, req.user?.id || null, score, total_questions, time_taken]
    );
    await updateQuizStats(qid);
    if (req.user?.id) {
      await db.query(
        'UPDATE users SET total_score=total_score+?, quizzes_played=quizzes_played+1 WHERE id=?',
        [score * 2, req.user.id]
      );
      await awardBadges(req.user.id);
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erreur' }); }
});

// POST /quizzes/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const [[ex]] = await db.query('SELECT id FROM quiz_likes WHERE quiz_id=? AND user_id=?', [req.params.id, req.user.id]);
    if (ex) {
      await db.query('DELETE FROM quiz_likes WHERE quiz_id=? AND user_id=?', [req.params.id, req.user.id]);
      await db.query('UPDATE quizzes SET likes_count=likes_count-1 WHERE id=? AND likes_count>0', [req.params.id]);
      return res.json({ liked: false });
    }
    await db.query('INSERT INTO quiz_likes (quiz_id,user_id) VALUES (?,?)', [req.params.id, req.user.id]);
    await db.query('UPDATE quizzes SET likes_count=likes_count+1 WHERE id=?', [req.params.id]);
    res.json({ liked: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// POST /quizzes/:id/report
router.post('/:id/report', optAuth, async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Raison requise' });
  try {
    await db.query(
      'INSERT INTO quiz_reports (quiz_id,reporter_id,reason) VALUES (?,?,?)',
      [req.params.id, req.user?.id || null, reason]
    );
    // Lock quiz pending review
    await db.query('UPDATE quizzes SET is_locked=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// POST /quizzes  (create)
router.post('/', auth, async (req, res) => {
  const { title, description, category_id, quiz_type, time_limit, image_url, sources, items } = req.body;
  if (!title || !category_id || !quiz_type || !items?.length)
    return res.status(400).json({ error: 'Données manquantes' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO quizzes (creator_id,title,description,category_id,quiz_type,time_limit,image_url,sources,is_published) VALUES (?,?,?,?,?,?,?,?,0)',
      [req.user.id, title, description, category_id, quiz_type, time_limit || 120, image_url || null, sources || null]
    );
    const qid = r.insertId;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const [ir] = await conn.query(
        'INSERT INTO quiz_items (quiz_id,question,answer,alt_answers,image_url,region_id,sort_order) VALUES (?,?,?,?,?,?,?)',
        [qid, it.question || '', it.answer || '', JSON.stringify(it.alt_answers || []), it.image_url || null, it.region_id || null, i]
      );
      if (quiz_type === 'qcm' && it.options?.length) {
        for (const opt of it.options) {
          await conn.query(
            'INSERT INTO qcm_options (item_id,option_text,is_correct) VALUES (?,?,?)',
            [ir.insertId, opt.text, opt.correct ? 1 : 0]
          );
        }
      }
    }
    await conn.commit();
    await db.query('UPDATE users SET quizzes_created=quizzes_created+1 WHERE id=?', [req.user.id]);
    res.json({ id: qid });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Erreur création quiz' });
  } finally { conn.release(); }
});

// PUT /quizzes/:id/publish
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const [[q]] = await db.query('SELECT creator_id,is_locked FROM quizzes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Introuvable' });
    if (q.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Non autorisé' });
    await db.query('UPDATE quizzes SET is_published=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// PUT /quizzes/:id  (update - only if not locked, unless admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const [[q]] = await db.query('SELECT creator_id,is_locked FROM quizzes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Introuvable' });
    if (q.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Non autorisé' });
    if (q.is_locked && !req.user.is_admin) return res.status(403).json({ error: 'Quiz verrouillé suite à un signalement' });
    const { title, description, time_limit, sources } = req.body;
    await db.query('UPDATE quizzes SET title=?,description=?,time_limit=?,sources=? WHERE id=?',
      [title, description, time_limit, sources, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// DELETE /quizzes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [[q]] = await db.query('SELECT creator_id FROM quizzes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Introuvable' });
    if (q.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Non autorisé' });
    await db.query('UPDATE quizzes SET is_deleted=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

// POST /quizzes/upload-image  (ImgBB)
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Image manquante' });
  try {
    const url = await uploadToImgBB(req.file.buffer, req.file.originalname);
    if (!url) return res.status(500).json({ error: 'Clé ImgBB manquante' });
    res.json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur upload image" });
  }
});

module.exports = router;
