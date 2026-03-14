// routes/quizzes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// GET all published quizzes with filters
router.get('/', optionalAuth, async (req, res) => {
  const { category, type, sort = 'popular', search, limit = 10, offset = 0 } = req.query;
  try {
    let where = ['q.is_published=1', 'q.is_deleted=0'];
    let params = [];
    if (category) { where.push('c.slug=?'); params.push(category); }
    if (type) { where.push('q.quiz_type=?'); params.push(type); }
    if (search) { where.push('q.title LIKE ?'); params.push(`%${search}%`); }

    const sortMap = {
      popular: 'q.plays_count DESC',
      likes: 'q.likes_count DESC',
      newest: 'q.created_at DESC',
      score: 'q.avg_score DESC'
    };
    const orderBy = sortMap[sort] || 'q.plays_count DESC';

    const sql = `
      SELECT q.id, q.title, q.quiz_type, q.time_limit, q.plays_count, q.likes_count,
             q.avg_score, q.success_rate, q.image_url, q.created_at,
             u.pseudo as creator_pseudo, u.icon as creator_icon, u.flames_received as creator_flames,
             c.name_fr as category_fr, c.name_en as category_en, c.icon as category_icon, c.slug as category_slug
      FROM quizzes q
      JOIN users u ON q.creator_id = u.id
      JOIN categories c ON q.category_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await db.query(sql, params);

    const [countRow] = await db.query(
      `SELECT COUNT(*) as total FROM quizzes q JOIN categories c ON q.category_id=c.id WHERE ${where.join(' AND ')}`,
      params.slice(0, -2)
    );
    res.json({ quizzes: rows, total: countRow[0].total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET single quiz info (before playing)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT q.*, u.pseudo as creator_pseudo, u.icon as creator_icon,
             u.id as creator_id, u.flames_received as creator_flames,
             c.name_fr as category_fr, c.name_en as category_en,
             c.icon as category_icon, c.slug as category_slug
      FROM quizzes q
      JOIN users u ON q.creator_id = u.id
      JOIN categories c ON q.category_id = c.id
      WHERE q.id=? AND q.is_published=1 AND q.is_deleted=0
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Quiz introuvable' });

    const quiz = rows[0];

    // Check if current user liked this quiz
    if (req.user) {
      const [liked] = await db.query(
        'SELECT id FROM quiz_likes WHERE quiz_id=? AND user_id=?',
        [quiz.id, req.user.id]
      );
      quiz.user_liked = liked.length > 0;

      const [flamed] = await db.query(
        'SELECT id FROM flames WHERE from_user_id=? AND to_user_id=?',
        [req.user.id, quiz.creator_id]
      );
      quiz.user_flamed_creator = flamed.length > 0;
    }

    res.json(quiz);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET quiz items (for playing)
router.get('/:id/play', optionalAuth, async (req, res) => {
  try {
    const [quiz] = await db.query(
      'SELECT id, title, quiz_type, time_limit FROM quizzes WHERE id=? AND is_published=1 AND is_deleted=0',
      [req.params.id]
    );
    if (!quiz.length) return res.status(404).json({ error: 'Quiz introuvable' });

    const [items] = await db.query(
      'SELECT id, question, answer, alt_answers, image_url, lat, lng, sort_order FROM quiz_items WHERE quiz_id=? ORDER BY sort_order',
      [req.params.id]
    );

    // For QCM, include options
    if (quiz[0].quiz_type === 'qcm') {
      for (let item of items) {
        const [opts] = await db.query(
          'SELECT id, option_text, is_correct FROM qcm_options WHERE item_id=?',
          [item.id]
        );
        item.options = opts;
      }
    }

    res.json({ quiz: quiz[0], items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST submit quiz result
router.post('/:id/result', optionalAuth, async (req, res) => {
  const { score, total_questions, time_taken } = req.body;
  const quiz_id = parseInt(req.params.id);
  try {
    await db.query(
      'INSERT INTO quiz_plays (quiz_id, user_id, score, total_questions, time_taken) VALUES (?,?,?,?,?)',
      [quiz_id, req.user?.id || null, score, total_questions, time_taken]
    );

    // Update quiz stats
    await db.query(`
      UPDATE quizzes SET
        plays_count = plays_count + 1,
        avg_score = (SELECT AVG(score) FROM quiz_plays WHERE quiz_id=?),
        avg_time = (SELECT AVG(time_taken) FROM quiz_plays WHERE quiz_id=?),
        success_rate = (SELECT AVG(score/total_questions)*100 FROM quiz_plays WHERE quiz_id=? AND total_questions > 0)
      WHERE id=?
    `, [quiz_id, quiz_id, quiz_id, quiz_id]);

    // Update user score and played count
    if (req.user?.id) {
      await db.query(
        'UPDATE users SET total_score = total_score + ?, quizzes_played = quizzes_played + 1 WHERE id=?',
        [score * 2, req.user.id]
      );
      // Check for badge awards
      await checkBadges(req.user.id, quiz_id);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function checkBadges(userId, quizId) {
  try {
    const [quizInfo] = await db.query('SELECT category_id FROM quizzes WHERE id=?', [quizId]);
    if (!quizInfo.length) return;
    const categoryId = quizInfo[0].category_id;

    const [totalInCat] = await db.query(
      'SELECT COUNT(*) as cnt FROM quizzes WHERE category_id=? AND is_published=1 AND is_deleted=0',
      [categoryId]
    );
    const total = totalInCat[0].cnt;

    const [playsInCat] = await db.query(`
      SELECT COUNT(DISTINCT qp.quiz_id) as played
      FROM quiz_plays qp
      JOIN quizzes q ON qp.quiz_id = q.id
      WHERE qp.user_id=? AND q.category_id=?
    `, [userId, categoryId]);
    const played = playsInCat[0].played;

    const ratio = played / total;
    let level = null;
    if (ratio >= 0.75) level = 'expert';
    else if (ratio >= 0.5) level = 'intermediaire';
    else if (ratio >= 0.25) level = 'debutant';
    if (!level) return;

    const [badge] = await db.query(
      'SELECT id FROM badges WHERE category_id=? AND level=?',
      [categoryId, level]
    );
    if (!badge.length) return;

    await db.query(
      'INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?,?)',
      [userId, badge[0].id]
    );
  } catch (e) {
    console.error('Badge check error:', e);
  }
}

// POST like a quiz
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const [exists] = await db.query(
      'SELECT id FROM quiz_likes WHERE quiz_id=? AND user_id=?',
      [req.params.id, req.user.id]
    );
    if (exists.length) {
      await db.query('DELETE FROM quiz_likes WHERE quiz_id=? AND user_id=?', [req.params.id, req.user.id]);
      await db.query('UPDATE quizzes SET likes_count = likes_count - 1 WHERE id=?', [req.params.id]);
      res.json({ liked: false });
    } else {
      await db.query('INSERT INTO quiz_likes (quiz_id, user_id) VALUES (?,?)', [req.params.id, req.user.id]);
      await db.query('UPDATE quizzes SET likes_count = likes_count + 1 WHERE id=?', [req.params.id]);
      res.json({ liked: true });
    }
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// POST report a quiz
router.post('/:id/report', optionalAuth, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Raison requise' });
  try {
    await db.query(
      'INSERT INTO quiz_reports (quiz_id, reporter_id, reason) VALUES (?,?,?)',
      [req.params.id, req.user?.id || null, reason]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// POST create quiz
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, category_id, quiz_type, time_limit, image_url, sources, items } = req.body;
  if (!title || !category_id || !quiz_type || !items?.length)
    return res.status(400).json({ error: 'Données manquantes' });

  // Must have at least 1 badge to create
  const [badges] = await db.query(
    'SELECT COUNT(*) as cnt FROM user_badges WHERE user_id=?', [req.user.id]
  );
  if (badges[0].cnt === 0 && !req.user.is_admin)
    return res.status(403).json({ error: 'Vous devez avoir au moins un badge pour créer un quiz' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO quizzes (creator_id, title, description, category_id, quiz_type, time_limit, image_url, sources, is_published)
       VALUES (?,?,?,?,?,?,?,?,0)`,
      [req.user.id, title, description, category_id, quiz_type, time_limit || 120, image_url, sources]
    );
    const quizId = result.insertId;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const [itemResult] = await conn.query(
        `INSERT INTO quiz_items (quiz_id, question, answer, alt_answers, image_url, lat, lng, sort_order)
         VALUES (?,?,?,?,?,?,?,?)`,
        [quizId, item.question, item.answer, JSON.stringify(item.alt_answers || []), item.image_url, item.lat, item.lng, i]
      );
      if (quiz_type === 'qcm' && item.options) {
        for (const opt of item.options) {
          await conn.query(
            'INSERT INTO qcm_options (item_id, option_text, is_correct) VALUES (?,?,?)',
            [itemResult.insertId, opt.text, opt.is_correct ? 1 : 0]
          );
        }
      }
    }

    await conn.commit();
    await db.query('UPDATE users SET quizzes_created = quizzes_created + 1 WHERE id=?', [req.user.id]);
    res.json({ id: quizId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création' });
  } finally {
    conn.release();
  }
});

// PUT publish/unpublish a quiz
router.put('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const [quiz] = await db.query('SELECT creator_id FROM quizzes WHERE id=?', [req.params.id]);
    if (!quiz.length) return res.status(404).json({ error: 'Quiz introuvable' });
    if (quiz[0].creator_id !== req.user.id && !req.user.is_admin)
      return res.status(403).json({ error: 'Non autorisé' });
    await db.query('UPDATE quizzes SET is_published=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// PUT update quiz
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, description, time_limit, sources } = req.body;
  try {
    const [quiz] = await db.query('SELECT creator_id FROM quizzes WHERE id=?', [req.params.id]);
    if (!quiz.length) return res.status(404).json({ error: 'Quiz introuvable' });
    if (quiz[0].creator_id !== req.user.id && !req.user.is_admin)
      return res.status(403).json({ error: 'Non autorisé' });
    await db.query(
      'UPDATE quizzes SET title=?, description=?, time_limit=?, sources=? WHERE id=?',
      [title, description, time_limit, sources, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// DELETE quiz
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [quiz] = await db.query('SELECT creator_id FROM quizzes WHERE id=?', [req.params.id]);
    if (!quiz.length) return res.status(404).json({ error: 'Quiz introuvable' });
    if (quiz[0].creator_id !== req.user.id && !req.user.is_admin)
      return res.status(403).json({ error: 'Non autorisé' });
    await db.query('UPDATE quizzes SET is_deleted=1 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// GET random quiz
router.get('/action/random', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM quizzes WHERE is_published=1 AND is_deleted=0 ORDER BY RAND() LIMIT 1'
    );
    if (!rows.length) return res.status(404).json({ error: 'Aucun quiz disponible' });
    res.json({ id: rows[0].id });
  } catch (e) {
    res.status(500).json({ error: 'Erreur' });
  }
});

module.exports = router;
