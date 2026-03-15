// ── Quiz Info Page ───────────────────────────────

async function loadQuizInfo(id) {
  go('quiz-info');
  document.getElementById('qi-body').innerHTML = '<div class="spinner"></div>';
  try {
    const q = await api.quiz(id);
    renderQuizInfo(q);
  } catch {
    document.getElementById('qi-body').innerHTML = '<div class="empty">Quiz introuvable</div>';
  }
}

function renderQuizInfo(q) {
  const cat = S.lang === 'fr' ? q.cat_fr : q.cat_en;
  const isOwner = S.user?.id === q.creator_uid;
  const isAdmin = S.user?.is_admin;
  const locked  = q.is_locked && !isAdmin;

  document.getElementById('qi-body').innerHTML = `
    <div class="qi-header">
      <div class="qi-banner">
        ${q.image_url
          ? `<img src="${q.image_url}" alt="${q.title}" onerror="this.parentElement.innerHTML='${q.cat_icon||'🎯'}'">`
          : (q.cat_icon || '🎯')}
      </div>
      <div class="qi-body">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--gray)">${q.cat_icon} ${cat}</span>
          ${typeTag(q.quiz_type)}
          ${q.is_locked ? '<span style="background:#FFF3CD;color:#856404;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700">⚠️ Signalé</span>' : ''}
        </div>
        <h1 class="qi-title">${q.title}</h1>
        ${q.description ? `<p style="color:var(--gray);font-size:13px;margin-bottom:6px">${q.description}</p>` : ''}
        ${q.sources ? `<p style="font-size:11px;color:#aaa">Sources : ${q.sources}</p>` : ''}

        <div class="qi-stats">
          <div class="qi-stat"><span class="qi-stat-val">🎮 ${fmt(q.plays_count)}</span><span class="qi-stat-lbl">Joueurs</span></div>
          <div class="qi-stat"><span class="qi-stat-val">❤️ ${fmt(q.likes_count)}</span><span class="qi-stat-lbl">Likes</span></div>
          <div class="qi-stat"><span class="qi-stat-val">⏱ ${fmtTime(q.time_limit)}</span><span class="qi-stat-lbl">Durée</span></div>
          ${q.plays_count > 0 ? `<div class="qi-stat"><span class="qi-stat-val">${Math.round(q.success_rate||0)}%</span><span class="qi-stat-lbl">Réussite</span></div>` : ''}
          ${q.plays_count > 0 ? `<div class="qi-stat"><span class="qi-stat-val">${fmtTime(Math.round(q.avg_time||0))}</span><span class="qi-stat-lbl">Temps moy.</span></div>` : ''}
        </div>

        <div class="qi-creator">
          <span style="font-size:28px">${icon({icon:q.creator_icon})}</span>
          <div style="flex:1">
            <a href="#" onclick="loadProfile('${q.creator_pseudo}');return false" style="font-weight:800;font-size:14px">${q.creator_pseudo}</a>
            <div style="font-size:12px;color:var(--gray)">🔥 ${q.creator_flames} flammes</div>
          </div>
          ${S.user && S.user.id !== q.creator_uid ? `
            <button class="flame-btn ${q.user_flamed_creator ? 'on' : ''}"
                    id="flame-creator-btn"
                    onclick="toggleFlameCreator(${q.creator_uid}, this)">
              🔥 ${q.user_flamed_creator ? 'Enflammé' : 'Enflammer'}
            </button>` : ''}
          ${!S.user ? `
            <button class="flame-btn" onclick="openAuth()">🔥 Enflammer</button>` : ''}
        </div>

        <div class="qi-actions">
          ${!locked
            ? `<button class="btn btn-primary btn-lg" onclick="startQuiz(${q.id})">▶ Jouer</button>`
            : `<button class="btn btn-gray btn-lg" disabled title="Quiz verrouillé suite à un signalement">🔒 Verrouillé</button>`}
          ${S.user
            ? `<button class="btn ${q.user_liked ? 'btn-gray' : 'btn-outline'} btn-sm" id="like-btn" onclick="toggleLike(${q.id}, this)">
                 ❤️ ${q.user_liked ? 'Aimé' : "J'aime"} (${q.likes_count})
               </button>`
            : `<button class="btn btn-outline btn-sm" onclick="openAuth()">❤️ J'aime (${q.likes_count})</button>`}
          <button class="btn btn-gray btn-sm" onclick="showReportModal(${q.id})">⚠️ Signaler</button>
          ${(isOwner || isAdmin) && !q.is_locked ? `<button class="btn btn-gray btn-sm" onclick="deleteQuizConfirm(${q.id})">🗑 Supprimer</button>` : ''}
          ${isAdmin && q.is_locked ? `<button class="btn btn-green btn-sm" onclick="adminUnlock(${q.id})">🔓 Déverrouiller</button>` : ''}
        </div>
      </div>
    </div>`;
}

async function toggleLike(id, btn) {
  if (!S.user) { openAuth(); return; }
  try {
    const r = await api.like(id);
    btn.className = `btn ${r.liked ? 'btn-gray' : 'btn-outline'} btn-sm`;
    // Refresh count
    const q = await api.quiz(id);
    btn.innerHTML = `❤️ ${r.liked ? 'Aimé' : "J'aime"} (${q.likes_count})`;
  } catch (e) { toast(e.message, 'err'); }
}

async function toggleFlameCreator(userId, btn) {
  if (!S.user) { openAuth(); return; }
  try {
    const r = await api.flame(userId);
    btn.classList.toggle('on', r.flamed);
    btn.textContent = r.flamed ? '🔥 Enflammé' : '🔥 Enflammer';
    toast(r.flamed ? 'Flamme donnée ! 🔥' : 'Flamme retirée', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

function showReportModal(id) {
  document.getElementById('report-id').value = id;
  document.getElementById('report-reason').value = '';
  openModal('modal-report');
}
async function submitReport() {
  const id     = document.getElementById('report-id').value;
  const reason = document.getElementById('report-reason').value.trim();
  if (!reason) { toast('Décrivez le problème', 'err'); return; }
  try {
    await api.report(id, reason);
    closeModal('modal-report');
    toast('Signalement envoyé. Merci !', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function deleteQuizConfirm(id) {
  if (!confirm('Supprimer ce quiz définitivement ?')) return;
  try {
    await api.deleteQuiz(id);
    toast('Quiz supprimé', 'ok');
    loadHome();
  } catch (e) { toast(e.message, 'err'); }
}

async function adminUnlock(id) {
  try {
    await api.adminUnlock(id);
    toast('Quiz déverrouillé', 'ok');
    loadQuizInfo(id);
  } catch (e) { toast(e.message, 'err'); }
}

// ── Play Engine ──────────────────────────────────

let PL = {}; // play state

async function startQuiz(id) {
  try {
    const { quiz, items } = await api.quizPlay(id);
    PL = {
      quiz, items,
      score: 0, answered: 0,
      timeLeft: quiz.time_limit,
      startTime: Date.now(),
      timer: null,
    };
    go('play');
    document.getElementById('play-title').textContent = quiz.title;
    updatePlayBar();
    renderPlayArea();
    startTimer();
  } catch (e) { toast('Impossible de charger le quiz', 'err'); }
}

function renderPlayArea() {
  const el = document.getElementById('play-area');
  if      (PL.quiz.quiz_type === 'saisie') renderSaisie(el);
  else if (PL.quiz.quiz_type === 'qcm')    renderQCM(el, 0);
  else if (PL.quiz.quiz_type === 'image')  renderImage(el, 0);
  else if (PL.quiz.quiz_type === 'carte')  renderCarte(el, 0);
}

// ── SAISIE ───────────────────────────────────────
function renderSaisie(el) {
  const total = PL.items.length;
  const cols  = total <= 10 ? 1 : total <= 24 ? 2 : total <= 40 ? 3 : 4;
  el.innerHTML = `
    <div class="ans-input-row">
      <input id="saisie-inp" class="ans-input" placeholder="Tapez une réponse..." autocomplete="off" autofocus>
      <button class="btn btn-gray btn-sm" onclick="document.getElementById('saisie-inp').value='';document.getElementById('saisie-inp').focus()">✕</button>
    </div>
    <div class="ans-grid" id="ans-grid" style="grid-template-columns:repeat(${cols},1fr)">
      ${PL.items.map((_,i) => `<div class="ans-cell" id="cell-${i}">—</div>`).join('')}
    </div>`;
  document.getElementById('saisie-inp').addEventListener('input', e => checkSaisie(e.target.value));
}

function checkSaisie(val) {
  const nv = norm(val);
  if (!nv) return;
  for (let i = 0; i < PL.items.length; i++) {
    const it   = PL.items[i];
    const cell = document.getElementById('cell-' + i);
    if (cell.classList.contains('hit')) continue;
    const accepted = [it.answer, ...(it.alt_answers || [])].map(norm);
    if (accepted.includes(nv)) {
      cell.textContent = it.answer;
      cell.classList.add('hit');
      PL.score++;
      PL.answered++;
      updatePlayBar();
      document.getElementById('saisie-inp').value = '';
      if (PL.answered === PL.items.length) endQuiz();
      return;
    }
  }
}

// ── QCM ──────────────────────────────────────────
let qcmIdx = 0, qcmResults = [];

function renderQCM(el, idx) {
  qcmIdx = idx;
  if (idx >= PL.items.length) { endQuiz(); return; }
  const it   = PL.items[idx];
  const prog = PL.items.map((_, i) => {
    let cls = '';
    if (i < idx) cls = qcmResults[i] ? 'done correct' : 'done wrong';
    return `<div class="qcm-dot ${cls}"></div>`;
  }).join('');

  // Always 2 columns if 4 options, 1 column if fewer
  const gridCols = it.options.length >= 3 ? 2 : 1;

  el.innerHTML = `
    <div class="qcm-progress">${prog}</div>
    <div class="qcm-qbox">
      ${it.image_url ? `<img src="${it.image_url}" class="qcm-qimg" alt="" onerror="this.remove()">` : ''}
      <div class="qcm-qtext">${it.question || '?'}</div>
      <div style="font-size:12px;color:var(--gray);margin-top:4px">${idx+1} / ${PL.items.length}</div>
    </div>
    <div class="qcm-opts" style="grid-template-columns:repeat(${gridCols},1fr)">
      ${it.options.map((opt, oi) =>
        `<div class="qcm-opt" data-oi="${oi}" data-correct="${opt.is_correct}"
              onclick="selectOpt(this)">${opt.option_text}</div>`
      ).join('')}
    </div>`;
}

function selectOpt(btn) {
  const el      = document.getElementById('play-area');
  const correct = btn.dataset.correct === '1' || btn.dataset.correct === true || btn.dataset.correct == 1;
  // Lock all options
  document.querySelectorAll('.qcm-opt').forEach(o => o.classList.add('locked'));
  if (correct) {
    btn.classList.add('correct');
    PL.score++;
  } else {
    btn.classList.add('wrong');
    // Show correct
    document.querySelectorAll('.qcm-opt').forEach(o => {
      if (o.dataset.correct == 1) o.classList.add('correct');
    });
  }
  PL.answered++;
  qcmResults[qcmIdx] = correct;
  updatePlayBar();
  setTimeout(() => renderQCM(el, qcmIdx + 1), 1100);
}

// ── IMAGE ─────────────────────────────────────────
let imgIdx = 0;
function renderImage(el, idx) {
  imgIdx = idx;
  if (idx >= PL.items.length) { endQuiz(); return; }
  const it = PL.items[idx];
  el.innerHTML = `
    <div class="img-qbox">
      <div style="font-size:12px;color:var(--gray);margin-bottom:6px">${idx+1} / ${PL.items.length}</div>
      ${it.image_url
        ? `<img src="${it.image_url}" alt="" onerror="this.parentElement.innerHTML='<div style=padding:40px;font-size:48px>🖼️</div>'">`
        : '<div style="padding:40px;font-size:48px;text-align:center">🖼️</div>'}
      ${it.question ? `<p style="font-weight:700;margin-top:8px">${it.question}</p>` : ''}
    </div>
    <div class="ans-input-row">
      <input id="img-inp" class="ans-input" placeholder="Votre réponse..." autocomplete="off" autofocus>
      <button class="btn btn-primary" onclick="checkImage()">✓</button>
      <button class="btn btn-gray" onclick="skipImage()">→ Passer</button>
    </div>
    <div id="img-fb"></div>`;
  document.getElementById('img-inp').addEventListener('keydown', e => { if (e.key === 'Enter') checkImage(); });
}

function checkImage() {
  const val = document.getElementById('img-inp').value;
  const it  = PL.items[imgIdx];
  const ok  = [it.answer, ...(it.alt_answers||[])].map(norm).includes(norm(val));
  const fb  = document.getElementById('img-fb');
  if (ok) {
    fb.innerHTML = `<div class="alert alert-ok">✅ Correct ! ${it.answer}</div>`;
    PL.score++;
    PL.answered++;
    updatePlayBar();
    setTimeout(() => renderImage(document.getElementById('play-area'), imgIdx + 1), 900);
  } else if (val.trim()) {
    fb.innerHTML = `<div class="alert alert-err">❌ Incorrect</div>`;
    setTimeout(() => { if (fb) fb.innerHTML = ''; }, 800);
  }
}

function skipImage() {
  const it = PL.items[imgIdx];
  PL.answered++;
  const fb = document.getElementById('img-fb');
  if (fb) fb.innerHTML = `<div class="alert alert-err">Réponse : ${it.answer}</div>`;
  setTimeout(() => renderImage(document.getElementById('play-area'), imgIdx + 1), 1100);
}

// ── CARTE ─────────────────────────────────────────
let carteIdx = 0;

function renderCarte(el, idx) {
  carteIdx = idx;
  if (idx >= PL.items.length) { endQuiz(); return; }

  // Build SVG map
  const svgPaths = CI_MAP.regions.map(r =>
    `<path id="reg-${r.id}" class="ci-region" d="${r.d}" data-name="${r.name}" data-id="${r.id}"
           onclick="clickRegion('${r.id}','${r.name}')">
       <title>${r.name}</title>
     </path>`
  ).join('');

  el.innerHTML = `
    <div class="carte-question" id="carte-q">Où se trouve : <strong>${PL.items[idx].question || PL.items[idx].answer}</strong> ?</div>
    <div id="ci-svg-container">
      <svg viewBox="${CI_MAP.viewBox}" xmlns="http://www.w3.org/2000/svg">
        ${svgPaths}
      </svg>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-gray btn-sm" onclick="skipCarte()">→ Passer</button>
    </div>
    <div id="carte-fb" style="margin-top:8px"></div>
    <div class="ans-grid" id="carte-grid" style="grid-template-columns:repeat(3,1fr);margin-top:12px">
      ${PL.items.map((_,i) => `<div class="ans-cell" id="carte-cell-${i}">—</div>`).join('')}
    </div>`;
}

function clickRegion(regionId, regionName) {
  const it = PL.items[carteIdx];
  const expected = (it.region_id || '').toLowerCase();
  const clicked  = regionId.toLowerCase();
  const nameNorm = norm(regionName);
  const ansNorm  = norm(it.answer);
  const isCorrect = expected ? clicked === expected : nameNorm === ansNorm;
  const el = document.getElementById('play-area');
  const fb = document.getElementById('carte-fb');
  const regEl = document.getElementById('reg-' + regionId);

  if (isCorrect) {
    if (regEl) regEl.classList.add('correct');
    const cell = document.getElementById('carte-cell-' + carteIdx);
    if (cell) { cell.textContent = it.answer; cell.classList.add('hit'); }
    if (fb) fb.innerHTML = `<div class="alert alert-ok">✅ Correct !</div>`;
    PL.score++;
    PL.answered++;
    updatePlayBar();
    setTimeout(() => renderCarte(el, carteIdx + 1), 900);
  } else {
    if (regEl) {
      regEl.classList.add('wrong');
      setTimeout(() => regEl.classList.remove('wrong'), 500);
    }
    if (fb) {
      fb.innerHTML = `<div class="alert alert-err">❌ Ce n'est pas ici</div>`;
      setTimeout(() => { if (fb) fb.innerHTML = ''; }, 700);
    }
  }
}

function skipCarte() {
  const it = PL.items[carteIdx];
  PL.answered++;
  const fb = document.getElementById('carte-fb');
  if (fb) fb.innerHTML = `<div class="alert alert-err">Réponse : ${it.answer}</div>`;
  setTimeout(() => renderCarte(document.getElementById('play-area'), carteIdx + 1), 1100);
}

// ── Timer ────────────────────────────────────────
function startTimer() {
  clearInterval(PL.timer);
  PL.timer = setInterval(() => {
    PL.timeLeft--;
    updatePlayBar();
    if (PL.timeLeft <= 0) { clearInterval(PL.timer); endQuiz(); }
  }, 1000);
}

function updatePlayBar() {
  const sc  = document.getElementById('play-score');
  const tim = document.getElementById('play-timer');
  if (sc)  sc.textContent  = `${PL.score} / ${PL.items.length}`;
  if (tim) {
    tim.textContent = fmtTime(PL.timeLeft);
    tim.className   = 'play-timer' + (PL.timeLeft <= 10 ? ' urgent' : '');
  }
}

// ── End quiz ─────────────────────────────────────
async function endQuiz() {
  clearInterval(PL.timer);
  const timeTaken = Math.floor((Date.now() - PL.startTime) / 1000);
  const total = PL.items.length;
  const pct   = total > 0 ? Math.round((PL.score / total) * 100) : 0;
  const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 60 ? '⭐⭐' : '⭐';
  const msg   = pct >= 90 ? 'Excellent !' : pct >= 60 ? 'Bien joué !' : 'Continue d\'apprendre !';

  // Show missed answers for saisie
  let missedHTML = '';
  if (PL.quiz.quiz_type === 'saisie') {
    const missed = PL.items.filter((_, i) => {
      const cell = document.getElementById('cell-' + i);
      return !cell?.classList.contains('hit');
    });
    if (missed.length) {
      missedHTML = `<div style="margin-top:16px;text-align:left">
        <p style="font-weight:700;font-size:13px;color:var(--gray);margin-bottom:6px">Réponses manquées :</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${missed.map(it => `<span class="ans-cell miss" style="color:var(--red)">${it.answer}</span>`).join('')}
        </div></div>`;
    }
  }

  document.getElementById('play-area').innerHTML = `
    <div class="results">
      <div class="results-stars">${stars}</div>
      <div class="results-score">${PL.score}/${total}</div>
      <div class="results-pct">${msg} (${pct}%)</div>
      <p style="color:var(--gray);font-size:13px;margin-bottom:16px">⏱ ${fmtTime(timeTaken)}</p>
      <div class="results-btns">
        <button class="btn btn-primary" onclick="startQuiz(${PL.quiz.id})">🔄 Rejouer</button>
        <button class="btn btn-gray"    onclick="shareScore(${PL.score},${total},'${PL.quiz.title.replace(/'/g,"\\'")}')">📤 Partager</button>
        <button class="btn btn-gray"    onclick="loadHome()">🏠 Accueil</button>
      </div>
      ${missedHTML}
    </div>`;
  document.getElementById('play-timer').textContent = '0';

  // Submit result
  try {
    await api.result(PL.quiz.id, { score: PL.score, total_questions: total, time_taken: timeTaken });
  } catch {}
}

function shareScore(score, total, title) {
  const text = `🎯 J'ai fait ${score}/${total} au quiz "${title}" sur Yoyo 🌍🇨🇮\nyoyo225.ci`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Score copié ! 🎉', 'ok'));
  }
}
