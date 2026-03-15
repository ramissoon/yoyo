// js/api.js - Yoyo API client
const API_BASE = 'yoyo-production-28ff.up.railway.app/api';

const api = {
  token: localStorage.getItem('yoyo_token'),

  setToken(t) {
    this.token = t;
    if (t) localStorage.setItem('yoyo_token', t);
    else localStorage.removeItem('yoyo_token');
  },

  async req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
  },

  get: (p) => api.req('GET', p),
  post: (p, b) => api.req('POST', p, b),
  put: (p, b) => api.req('PUT', p, b),
  delete: (p) => api.req('DELETE', p),

  // Auth
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),

  // Quizzes
  getQuizzes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get('/quizzes' + (qs ? '?' + qs : ''));
  },
  getQuiz: (id) => api.get('/quizzes/' + id),
  getQuizPlay: (id) => api.get('/quizzes/' + id + '/play'),
  submitResult: (id, d) => api.post('/quizzes/' + id + '/result', d),
  likeQuiz: (id) => api.post('/quizzes/' + id + '/like'),
  reportQuiz: (id, reason) => api.post('/quizzes/' + id + '/report', { reason }),
  createQuiz: (d) => api.post('/quizzes', d),
  updateQuiz: (id, d) => api.put('/quizzes/' + id, d),
  deleteQuiz: (id) => api.delete('/quizzes/' + id),
  publishQuiz: (id) => api.put('/quizzes/' + id + '/publish'),
  randomQuiz: () => api.get('/quizzes/action/random'),

  // Users
  getUser: (pseudo) => api.get('/users/' + pseudo),
  flameUser: (id) => api.post('/users/' + id + '/flame'),
  topPlayers: (n = 10) => api.get('/users/leaderboard/players?limit=' + n),
  topCreators: (n = 10) => api.get('/users/leaderboard/creators?limit=' + n),
  updateIcon: (icon) => api.put('/users/me/icon', { icon }),

  // Categories
  getCategories: () => api.get('/categories'),

  // Admin
  adminStats: () => api.get('/admin/stats'),
  adminUsers: (p = {}) => api.get('/admin/users?' + new URLSearchParams(p)),
  adminDeleteUser: (id) => api.delete('/admin/users/' + id),
  adminQuizzes: (p = {}) => api.get('/admin/quizzes?' + new URLSearchParams(p)),
  adminDeleteQuiz: (id) => api.delete('/admin/quizzes/' + id),
  adminResolveReport: (id, status) => api.put('/admin/reports/' + id, { status }),
};
