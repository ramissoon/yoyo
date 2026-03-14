// js/utils.js - Yoyo utilities

// ===== STATE =====
const state = {
  user: null,
  lang: localStorage.getItem('yoyo_lang') || 'fr',
  categories: [],
};

// ===== ICONS =====
const ICONS = {
  lion: '🦁', elephant: '🐘', leopard: '🐆', eagle: '🦅',
  crocodile: '🐊', flamingo: '🦩', hippo: '🦛', cheetah: '🐆'
};
const ICON_LIST = [
  { id: 'lion', emoji: '🦁' }, { id: 'elephant', emoji: '🐘' },
  { id: 'leopard', emoji: '🐆' }, { id: 'eagle', emoji: '🦅' },
  { id: 'crocodile', emoji: '🐊' }, { id: 'flamingo', emoji: '🦩' },
  { id: 'hippo', emoji: '🦛' }, { id: 'cheetah', emoji: '🐅' }
];

function userIcon(u) {
  return ICONS[u?.icon] || '🦁';
}

// ===== TOAST =====
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ===== TRANSLATIONS =====
const T = {
  fr: {
    login: 'Connexion', register: "S'inscrire", logout: 'Déconnexion',
    profile: 'Mon profil', createQuiz: 'Créer un quiz',
    home: 'Accueil', categories: 'Catégories', leaderboard: 'Classement',
    popular: 'Populaires', newest: 'Nouveaux', random: '🎲 Aléatoire',
    quickQcm: '⚡ Quiz Rapide', play: 'Jouer', start: 'Commencer',
    score: 'Score', time: 'Temps', questions: 'Questions',
    players: 'Joueurs', likes: 'Likes', flames: 'Flammes',
    share: 'Partager mon score', report: 'Signaler', like: 'J\'aime',
    badges: 'Badges', quizzesPlayed: 'Quiz joués', quizzesCreated: 'Quiz créés',
    seeMore: 'Voir plus', topPlayers: 'Meilleurs joueurs', topCreators: 'Meilleurs créateurs',
    search: 'Rechercher...', noResults: 'Aucun résultat', loading: 'Chargement...',
    debutant: 'Débutant', intermediaire: 'Intermédiaire', expert: 'Expert',
    saisie: 'Saisie', qcm: 'QCM', image: 'Image', carte: 'Carte',
    admin: 'Administration',
  },
  en: {
    login: 'Login', register: 'Sign up', logout: 'Logout',
    profile: 'My profile', createQuiz: 'Create a quiz',
    home: 'Home', categories: 'Categories', leaderboard: 'Leaderboard',
    popular: 'Popular', newest: 'Newest', random: '🎲 Random',
    quickQcm: '⚡ Quick Quiz', play: 'Play', start: 'Start',
    score: 'Score', time: 'Time', questions: 'Questions',
    players: 'Players', likes: 'Likes', flames: 'Flames',
    share: 'Share my score', report: 'Report', like: 'Like',
    badges: 'Badges', quizzesPlayed: 'Quizzes played', quizzesCreated: 'Quizzes created',
    seeMore: 'See more', topPlayers: 'Top players', topCreators: 'Top creators',
    search: 'Search...', noResults: 'No results', loading: 'Loading...',
    debutant: 'Beginner', intermediaire: 'Intermediate', expert: 'Expert',
    saisie: 'Input', qcm: 'MCQ', image: 'Image', carte: 'Map',
    admin: 'Administration',
  }
};
const t = (k) => T[state.lang][k] || k;

// ===== HELPERS =====
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}s`;
}

function typeLabel(type) {
  return `<span class="type-badge type-${type}">${t(type)}</span>`;
}

function quizCardHTML(q) {
  const icon = q.category_icon || '🎯';
  return `
    <div class="card quiz-card" onclick="showQuizInfo(${q.id})">
      <div class="quiz-card-img no-img">
        ${q.image_url
          ? `<img src="${q.image_url}" style="width:100%;height:100%;object-fit:cover">`
          : `<span style="font-size:36px">${icon}</span>`}
      </div>
      <div class="quiz-card-body">
        <div class="quiz-card-category">${icon} ${state.lang === 'fr' ? q.category_fr : q.category_en}</div>
        <div class="quiz-card-title">${q.title}</div>
        <div class="quiz-card-meta">
          <span>🎮 ${q.plays_count || 0}</span>
          <span>❤️ ${q.likes_count || 0}</span>
          <span>⏱ ${formatTime(q.time_limit)}</span>
        </div>
      </div>
    </div>
  `;
}

function leaderboardRowHTML(u, rank, mode = 'player') {
  const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
  return `
    <tr>
      <td><span class="rank-badge ${rankClass}">${rank}</span></td>
      <td>
        <span style="font-size:20px;margin-right:8px">${userIcon(u)}</span>
        <a href="#" onclick="showProfile('${u.pseudo}');return false;" style="font-weight:700">${u.pseudo}</a>
      </td>
      <td style="font-weight:800;color:var(--orange)">${mode === 'player' ? u.total_score : u.flames_received}</td>
      <td style="color:var(--gray-500)">${mode === 'player' ? u.quizzes_played : u.quizzes_created}</td>
    </tr>
  `;
}

// ===== AUTH INIT =====
async function initAuth() {
  if (api.token) {
    try {
      state.user = await api.me();
      updateHeaderAuth();
    } catch {
      api.setToken(null);
    }
  }
  updateHeaderAuth();
}

function updateHeaderAuth() {
  const u = state.user;
  const loginBtns = document.getElementById('header-guest');
  const userMenu = document.getElementById('header-user');
  if (u) {
    loginBtns.style.display = 'none';
    userMenu.style.display = 'block';
    document.getElementById('user-pseudo').textContent = u.pseudo;
    document.getElementById('user-avatar-icon').textContent = userIcon(u);
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.style.display = u.is_admin ? 'block' : 'none';
  } else {
    loginBtns.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

function logout() {
  state.user = null;
  api.setToken(null);
  updateHeaderAuth();
  navigateTo('home');
  toast(state.lang === 'fr' ? 'Déconnecté' : 'Logged out');
  closeDropdown();
}

// ===== NAVIGATION =====
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.add('active');
    window.scrollTo(0, 0);
  }
}

function closeDropdown() {
  document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('show'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) closeDropdown();
});
