// js/home.js - Home page logic

async function loadHome() {
  navigateTo('home');
  document.getElementById('search-input').placeholder = t('search');

  // Load in parallel
  const [popularData, newestData, playersData, creatorsData] = await Promise.allSettled([
    api.getQuizzes({ sort: 'popular', limit: 10 }),
    api.getQuizzes({ sort: 'newest', limit: 10 }),
    api.topPlayers(10),
    api.topCreators(10),
  ]);

  // Popular quizzes
  const popGrid = document.getElementById('popular-grid');
  if (popularData.status === 'fulfilled' && popularData.value.quizzes.length) {
    popGrid.innerHTML = popularData.value.quizzes.map(quizCardHTML).join('');
  } else {
    popGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎯</div><p>Aucun quiz disponible pour l'instant</p></div>`;
  }

  // Newest
  const newGrid = document.getElementById('newest-grid');
  if (newestData.status === 'fulfilled' && newestData.value.quizzes.length) {
    newGrid.innerHTML = newestData.value.quizzes.map(quizCardHTML).join('');
  } else {
    newGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">✨</div><p>Aucun nouveau quiz</p></div>`;
  }

  // Players leaderboard
  const playersTable = document.getElementById('players-table-body');
  if (playersData.status === 'fulfilled' && playersData.value.length) {
    playersTable.innerHTML = playersData.value.map((u, i) => leaderboardRowHTML(u, i + 1, 'player')).join('');
  } else {
    playersTable.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-500)">Aucun joueur encore</td></tr>`;
  }

  // Creators leaderboard
  const creatorsTable = document.getElementById('creators-table-body');
  if (creatorsData.status === 'fulfilled' && creatorsData.value.length) {
    creatorsTable.innerHTML = creatorsData.value.map((u, i) => leaderboardRowHTML(u, i + 1, 'creator')).join('');
  } else {
    creatorsTable.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-500)">Aucun créateur encore</td></tr>`;
  }
}

async function randomQuiz() {
  try {
    const data = await api.randomQuiz();
    showQuizInfo(data.id);
  } catch {
    toast(state.lang === 'fr' ? 'Aucun quiz disponible' : 'No quiz available', 'error');
  }
}

async function searchQuizzes(query) {
  if (!query.trim()) { loadHome(); return; }
  navigateTo('search');
  document.getElementById('search-title').textContent = `"${query}"`;
  document.getElementById('search-results-grid').innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const data = await api.getQuizzes({ search: query, limit: 50 });
    const grid = document.getElementById('search-results-grid');
    if (data.quizzes.length) {
      grid.innerHTML = data.quizzes.map(quizCardHTML).join('');
    } else {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>${t('noResults')}</p></div>`;
    }
  } catch {
    document.getElementById('search-results-grid').innerHTML = `<div class="empty-state"><p>Erreur de recherche</p></div>`;
  }
}

async function loadCategoryPage(slug) {
  navigateTo('category');
  const cat = state.categories.find(c => c.slug === slug);
  document.getElementById('category-title').textContent = `${cat?.icon || ''} ${state.lang === 'fr' ? cat?.name_fr : cat?.name_en}`;
  document.getElementById('category-grid').innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const data = await api.getQuizzes({ category: slug, limit: 50 });
    const grid = document.getElementById('category-grid');
    if (data.quizzes.length) {
      grid.innerHTML = data.quizzes.map(quizCardHTML).join('');
    } else {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">${cat?.icon || '🎯'}</div><p>Aucun quiz dans cette catégorie</p></div>`;
    }
  } catch {
    document.getElementById('category-grid').innerHTML = `<div class="empty-state"><p>Erreur</p></div>`;
  }
}

async function loadLeaderboard() {
  navigateTo('leaderboard');
  const [p, c] = await Promise.allSettled([api.topPlayers(50), api.topCreators(50)]);
  const pt = document.getElementById('lb-players-body');
  if (p.status === 'fulfilled' && p.value.length) {
    pt.innerHTML = p.value.map((u, i) => leaderboardRowHTML(u, i + 1, 'player')).join('');
  }
  const ct = document.getElementById('lb-creators-body');
  if (c.status === 'fulfilled' && c.value.length) {
    ct.innerHTML = c.value.map((u, i) => leaderboardRowHTML(u, i + 1, 'creator')).join('');
  }
}
