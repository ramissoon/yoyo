// ── Quiz card (list item style like JetPunk) ─────

function quizItem(q) {
  const cat  = S.lang === 'fr' ? q.cat_fr : q.cat_en;
  const icon = q.cat_icon || '🎯';
  const pct  = q.success_rate ? Math.round(q.success_rate) + '%' : '-';
  return `
    <li class="quiz-list-item" onclick="loadQuizInfo(${q.id})">
      <div class="quiz-thumb">
        ${q.image_url
          ? `<img src="${q.image_url}" alt="" onerror="this.parentElement.textContent='${icon}'">`
          : icon}
      </div>
      <div class="quiz-info">
        <span class="quiz-title">${q.title}</span>
        <div class="quiz-meta">
          <span>${icon} ${cat}</span>
          <span>${typeTag(q.quiz_type)}</span>
          <span>⏱ ${fmtTime(q.time_limit)}</span>
          <span>par <a href="#" onclick="event.stopPropagation();loadProfile('${q.creator_pseudo}')">${q.creator_pseudo}</a></span>
        </div>
      </div>
      <div class="quiz-stats">
        <span class="quiz-plays">🎮 ${fmt(q.plays_count)}</span>
        <span class="quiz-pct">${pct} réussite</span>
        <span style="font-size:11px;color:var(--gray)">❤️ ${fmt(q.likes_count)}</span>
      </div>
    </li>`;
}

function lbRow(u, rank, mode) {
  const rc = rank <= 3 ? 'r' + rank : 'rn';
  const val = mode === 'player' ? u.total_score : u.flames_received;
  const sub = mode === 'player' ? u.quizzes_played + ' joués' : u.quizzes_created + ' quiz';
  return `
    <tr>
      <td><span class="rank ${rc}">${rank}</span></td>
      <td>
        <span style="font-size:18px;margin-right:6px">${icon(u)}</span>
        <a href="#" onclick="loadProfile('${u.pseudo}');return false">${u.pseudo}</a>
      </td>
      <td style="font-weight:800;color:var(--orange)">${val}</td>
      <td style="color:var(--gray);font-size:12px">${sub}</td>
    </tr>`;
}

// ── Home ─────────────────────────────────────────

async function loadHome() {
  go('home');
  setActiveNav('home');

  // Parallel fetches
  const [pop, nw, players, creators] = await Promise.allSettled([
    api.quizzes({ sort: 'popular', limit: 10 }),
    api.quizzes({ sort: 'newest',  limit: 10 }),
    api.topPlayers(10),
    api.topCreators(10),
  ]);

  const popEl = document.getElementById('pop-list');
  if (pop.status === 'fulfilled' && pop.value.quizzes.length) {
    popEl.innerHTML = pop.value.quizzes.map(quizItem).join('');
  } else {
    popEl.innerHTML = `<div class="empty"><div class="empty-icon">🎯</div><p>Aucun quiz disponible pour l'instant</p></div>`;
  }

  const newEl = document.getElementById('new-list');
  if (nw.status === 'fulfilled' && nw.value.quizzes.length) {
    newEl.innerHTML = nw.value.quizzes.map(quizItem).join('');
  } else {
    newEl.innerHTML = `<div class="empty"><div class="empty-icon">✨</div><p>Aucun quiz récent</p></div>`;
  }

  const plEl = document.getElementById('home-players');
  if (players.status === 'fulfilled' && players.value.length) {
    plEl.innerHTML = players.value.map((u, i) => lbRow(u, i+1, 'player')).join('');
  } else {
    plEl.innerHTML = `<tr><td colspan="4" class="empty">Aucun joueur</td></tr>`;
  }

  const crEl = document.getElementById('home-creators');
  if (creators.status === 'fulfilled' && creators.value.length) {
    crEl.innerHTML = creators.value.map((u, i) => lbRow(u, i+1, 'creator')).join('');
  } else {
    crEl.innerHTML = `<tr><td colspan="4" class="empty">Aucun créateur</td></tr>`;
  }
}

// ── Search ───────────────────────────────────────

async function doSearch(q) {
  if (!q.trim()) return;
  go('search');
  document.getElementById('search-query').textContent = `"${q}"`;
  const el = document.getElementById('search-list');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await api.quizzes({ search: q, limit: 50 });
    el.innerHTML = data.quizzes.length
      ? `<ul class="quiz-list">${data.quizzes.map(quizItem).join('')}</ul>`
      : `<div class="empty"><div class="empty-icon">🔍</div><p>Aucun résultat</p></div>`;
  } catch {
    el.innerHTML = `<div class="empty">Erreur de recherche</div>`;
  }
}

// ── Category page ────────────────────────────────

async function loadCategory(slug) {
  go('category');
  closeCatBar();
  const cat = S.categories.find(c => c.slug === slug);
  document.getElementById('cat-title').textContent = `${cat?.icon || ''} ${S.lang==='fr' ? cat?.name_fr : cat?.name_en}`;
  const el = document.getElementById('cat-list');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await api.quizzes({ category: slug, limit: 60 });
    el.innerHTML = data.quizzes.length
      ? `<ul class="quiz-list">${data.quizzes.map(quizItem).join('')}</ul>`
      : `<div class="empty"><div class="empty-icon">${cat?.icon||'🎯'}</div><p>Aucun quiz dans cette catégorie</p></div>`;
  } catch {
    el.innerHTML = `<div class="empty">Erreur</div>`;
  }
}

// ── Leaderboard ──────────────────────────────────

async function loadLeaderboard() {
  go('leaderboard');
  setActiveNav('leaderboard');
  const [p, c] = await Promise.allSettled([api.topPlayers(100), api.topCreators(100)]);
  if (p.status === 'fulfilled') {
    document.getElementById('lb-players').innerHTML = p.value.map((u,i) => lbRow(u,i+1,'player')).join('');
  }
  if (c.status === 'fulfilled') {
    document.getElementById('lb-creators').innerHTML = c.value.map((u,i) => lbRow(u,i+1,'creator')).join('');
  }
}

function switchLbTab(tab, btn) {
  document.querySelectorAll('#pg-leaderboard .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#pg-leaderboard .tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('lb-pane-' + tab).classList.add('active');
}

// ── Nav helpers ──────────────────────────────────

function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('nav-' + id);
  if (el) el.classList.add('active');
}

function toggleCatBar() {
  document.getElementById('cat-bar').classList.toggle('open');
}
function closeCatBar() {
  document.getElementById('cat-bar').classList.remove('open');
}

async function initCatBar() {
  try {
    S.categories = await api.categories();
    const el = document.getElementById('cat-pills');
    el.innerHTML = S.categories.map(c =>
      `<div class="cat-pill" onclick="loadCategory('${c.slug}')">
         ${c.icon} ${S.lang==='fr' ? c.name_fr : c.name_en}
       </div>`
    ).join('');
    // Also populate create quiz select
    const sel = document.getElementById('create-category');
    if (sel) sel.innerHTML = S.categories.map(c =>
      `<option value="${c.id}">${c.icon} ${S.lang==='fr' ? c.name_fr : c.name_en}</option>`
    ).join('');
  } catch {}
}

async function goRandom() {
  try {
    const d = await api.random();
    loadQuizInfo(d.id);
  } catch { toast('Aucun quiz disponible', 'err'); }
}

async function goQuickQcm() {
  try {
    const d = await api.randomQcm();
    startQuiz(d.id);
  } catch { toast('Aucun QCM disponible', 'err'); }
}
