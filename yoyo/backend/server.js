require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/quizzes',    require('./routes/quizzes'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/admin',      require('./routes/admin'));

app.get('/api/health', (_, res) => res.json({ ok: true, v: 2 }));
app.use('*', (_, res) => res.status(404).json({ error: 'Route inconnue' }));

app.listen(PORT, () => console.log(`🟢 Yoyo v2 API :${PORT}`));
