// ── Config ───────────────────────────────────────
const API = 'https://yoyo-production-28ff.up.railway.app/api'; // ← Remplace par ton URL Railway

// ── State ────────────────────────────────────────
const S = {
  user:       null,
  lang:       localStorage.getItem('yoyo_lang') || 'fr',
  categories: [],
  token:      localStorage.getItem('yoyo_token') || null,
};

// ── API client ───────────────────────────────────
const api = {
  async req(method, path, body, isForm = false) {
    const opts = { method, headers: {} };
    if (S.token) opts.headers['Authorization'] = 'Bearer ' + S.token;
    if (body && !isForm) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (isForm) {
      opts.body = body; // FormData
    }
    const res  = await fetch(API + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  },
  get:    (p)    => api.req('GET',    p),
  post:   (p, b) => api.req('POST',   p, b),
  put:    (p, b) => api.req('PUT',    p, b),
  del:    (p)    => api.req('DELETE', p),
  upload: (p, f) => api.req('POST',   p, f, true),

  // Auth
  register: (d) => api.post('/auth/register', d),
  login:    (d) => api.post('/auth/login', d),
  me:       ()  => api.get('/auth/me'),

  // Quizzes
  quizzes:     (p = {}) => api.get('/quizzes?' + new URLSearchParams(p)),
  quiz:        (id)     => api.get('/quizzes/' + id),
  quizPlay:    (id)     => api.get('/quizzes/' + id + '/play'),
  result:      (id, d)  => api.post('/quizzes/' + id + '/result', d),
  like:        (id)     => api.post('/quizzes/' + id + '/like'),
  report:      (id, r)  => api.post('/quizzes/' + id + '/report', { reason: r }),
  createQuiz:  (d)      => api.post('/quizzes', d),
  publishQuiz: (id)     => api.put('/quizzes/' + id + '/publish'),
  deleteQuiz:  (id)     => api.del('/quizzes/' + id),
  random:      ()       => api.get('/quizzes/random'),
  randomQcm:   ()       => api.get('/quizzes/random-qcm'),
  uploadImage: (file)   => {
    const fd = new FormData();
    fd.append('image', file);
    return api.upload('/quizzes/upload-image', fd);
  },

  // Users
  user:         (pseudo) => api.get('/users/' + pseudo),
  flame:        (id)     => api.post('/users/' + id + '/flame'),
  flameStatus:  (id)     => api.get('/users/' + id + '/flame-status'),
  updateIcon:   (icon)   => api.put('/users/me/icon', { icon }),
  topPlayers:   (n = 50) => api.get('/users/leaderboard/players?limit=' + n),
  topCreators:  (n = 50) => api.get('/users/leaderboard/creators?limit=' + n),

  // Categories
  categories: () => api.get('/categories'),

  // Admin
  adminStats:         ()        => api.get('/admin/stats'),
  adminUsers:         (p = {})  => api.get('/admin/users?' + new URLSearchParams(p)),
  adminDelUser:       (id)      => api.del('/admin/users/' + id),
  adminQuizzes:       (p = {})  => api.get('/admin/quizzes?' + new URLSearchParams(p)),
  adminDelQuiz:       (id)      => api.del('/admin/quizzes/' + id),
  adminReport:        (id, st)  => api.put('/admin/reports/' + id, { status: st }),
  adminUnlock:        (id)      => api.put('/admin/quizzes/' + id + '/unlock'),
};

// ── Helpers ──────────────────────────────────────
const ICONS = { lion:'🦁', elephant:'🐘', leopard:'🐆', eagle:'🦅', crocodile:'🐊', flamingo:'🦩', hippo:'🦛', cheetah:'🐅' };
const ICON_LIST = Object.entries(ICONS).map(([id, emoji]) => ({ id, emoji }));

function icon(u) { return ICONS[u?.icon] || '🦁'; }

function fmt(s) {
  if (!s && s !== 0) return '0';
  if (s >= 1000) return (s/1000).toFixed(1) + 'k';
  return String(s);
}

function fmtTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}s`;
}

function norm(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ').trim()
    .replace(/\s+/g, ' ');
}

function typeTag(t) {
  const map = { saisie:'SAISIE', qcm:'QCM', image:'IMAGE', carte:'CARTE' };
  return `<span class="type-tag type-${t}">${map[t]||t}</span>`;
}

function toast(msg, type = '') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('overlay')) e.target.classList.remove('open');
  if (!e.target.closest('.hdr-user')) {
    document.querySelectorAll('.hdr-dropdown').forEach(d => d.classList.remove('open'));
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
  }
});

// ── Navigation ───────────────────────────────────
function go(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById('pg-' + pageId);
  if (p) { p.classList.add('active'); window.scrollTo(0,0); }
}

// ── Auth init ────────────────────────────────────
async function initAuth() {
  if (S.token) {
    try {
      S.user = await api.me();
    } catch {
      S.token = null;
      localStorage.removeItem('yoyo_token');
    }
  }
  renderHeader();
}

function setToken(t) {
  S.token = t;
  if (t) localStorage.setItem('yoyo_token', t);
  else   localStorage.removeItem('yoyo_token');
}

function renderHeader() {
  const u = S.user;
  document.getElementById('hdr-guest').style.display = u ? 'none' : 'flex';
  document.getElementById('hdr-user').style.display  = u ? 'block' : 'none';
  if (u) {
    document.getElementById('hdr-pseudo').textContent = u.pseudo;
    document.getElementById('hdr-icon').textContent   = icon(u);
    const adminLink = document.getElementById('admin-menu-link');
    if (adminLink) adminLink.style.display = u.is_admin ? 'block' : 'none';
  }
}

function logout() {
  S.user = null;
  setToken(null);
  renderHeader();
  loadHome();
  toast('Déconnecté');
  document.querySelectorAll('.hdr-dropdown').forEach(d => d.classList.remove('open'));
}
