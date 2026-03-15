const router = require('express').Router();
const db     = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: 'Erreur' }); }
});

module.exports = router;
