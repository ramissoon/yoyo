// js/quiz.js - Quiz play logic

let currentQuiz = null;
let currentItems = [];
let quizTimer = null;
let quizTimeLeft = 0;
let quizScore = 0;
let answeredCount = 0;
let quizStartTime = 0;

// ===== QUIZ INFO PAGE =====
async function showQuizInfo(id) {
  navigateTo('quiz-info');
  document.getElementById('quiz-info-content').innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const quiz = await api.getQuiz(id);
    renderQuizInfo(quiz);
  } catch (e) {
    document.getElementById('quiz-info-content').innerHTML = `<div class="empty-state"><p>Quiz introuvable</p></div>`;
  }
}

function renderQuizInfo(quiz) {
  const lang = state.lang;
  const catName = lang === 'fr' ? quiz.category_fr : quiz.category_en;
  document.getElementById('quiz-info-content').innerHTML = `
    <div class="quiz-info-card">
      <div class="quiz-info-img">
        ${quiz.image_url
          ? `<img src="${quiz.image_url}" style="width:100%;height:100%;object-fit:cover">`
          : `<span>${quiz.category_icon || '🎯'}</span>`}
      </div>
      <div class="quiz-info-body">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          <span class="badge badge-orange">${quiz.category_icon} ${catName}</span>
          ${typeLabel(quiz.quiz_type)}
        </div>
        <h1 class="quiz-info-title">${quiz.title}</h1>
        ${quiz.description ? `<p style="color:var(--gray-500);margin-bottom:8px">${quiz.description}</p>` : ''}
        ${quiz.sources ? `<p style="font-size:12px;color:var(--gray-400)">Sources: ${quiz.sources}</p>` : ''}
        
        <div class="quiz-stats-row">
          <div class="quiz-stat-item"><span class="quiz-stat-val">🎮 ${quiz.plays_count}</span><span class="quiz-stat-label">Joueurs</span></div>
          <div class="quiz-stat-item"><span class="quiz-stat-val">❤️ ${quiz.likes_count}</span><span class="quiz-stat-label">Likes</span></div>
          <div class="quiz-stat-item"><span class="quiz-stat-val">⏱ ${formatTime(quiz.time_limit)}</span><span class="quiz-stat-label">Durée</span></div>
          ${quiz.plays_count > 0 ? `
          <div class="quiz-stat-item"><span class="quiz-stat-val">${Math.round(quiz.success_rate || 0)}%</span><span class="quiz-stat-label">Réussite</span></div>
          ` : ''}
        </div>

        <div class="creator-row">
          <span style="font-size:28px">${ICONS[quiz.creator_icon] || '🦁'}</span>
          <div>
            <a href="#" onclick="showProfile('${quiz.creator_pseudo}');return false;" style="font-weight:800;font-size:15px">${quiz.creator_pseudo}</a>
            <div style="font-size:12px;color:var(--gray-500)">🔥 ${quiz.creator_flames} flammes</div>
          </div>
          ${state.user && state.user.id !== quiz.creator_id ? `
          <button class="btn btn-sm ${quiz.user_flamed_creator ? 'btn-secondary' : 'btn-outline'}" 
                  onclick="toggleFlame(${quiz.creator_id}, this)" style="margin-left:auto">
            🔥 ${quiz.user_flamed_creator ? 'Retiré' : 'Enflammer'}
          </button>` : ''}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button class="btn btn-primary btn-lg" onclick="startQuiz(${quiz.id})">
            ▶ ${t('play')}
          </button>
          ${state.user ? `
          <button class="btn ${quiz.user_liked ? 'btn-secondary' : 'btn-outline'}" onclick="toggleLike(${quiz.id}, this)">
            ❤️ ${quiz.user_liked ? 'Aimé' : t('like')} (${quiz.likes_count})
          </button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="showReportModal(${quiz.id})" style="margin-left:auto">
            ⚠️ ${t('report')}
          </button>
        </div>
      </div>
    </div>
  `;
  currentQuiz = quiz;
}

async function toggleLike(id, btn) {
  if (!state.user) { openLoginModal(); return; }
  try {
    const r = await api.likeQuiz(id);
    btn.className = `btn ${r.liked ? 'btn-secondary' : 'btn-outline'}`;
    const quiz = await api.getQuiz(id);
    btn.textContent = `❤️ ${r.liked ? 'Aimé' : t('like')} (${quiz.likes_count})`;
  } catch {}
}

async function toggleFlame(userId, btn) {
  if (!state.user) { openLoginModal(); return; }
  try {
    const r = await api.flameUser(userId);
    btn.textContent = r.flamed ? '🔥 Retiré' : '🔥 Enflammer';
    btn.className = `btn btn-sm ${r.flamed ? 'btn-secondary' : 'btn-outline'}`;
  } catch {}
}

function showReportModal(id) {
  document.getElementById('report-quiz-id').value = id;
  document.getElementById('report-reason').value = '';
  openModal('modal-report');
}

async function submitReport() {
  const id = document.getElementById('report-quiz-id').value;
  const reason = document.getElementById('report-reason').value.trim();
  if (!reason) { toast('Veuillez décrire le problème', 'error'); return; }
  try {
    await api.reportQuiz(id, reason);
    closeModal('modal-report');
    toast('Signalement envoyé. Merci !', 'success');
  } catch {
    toast('Erreur lors du signalement', 'error');
  }
}

// ===== START QUIZ =====
async function startQuiz(id) {
  try {
    const data = await api.getQuizPlay(id);
    currentQuiz = data.quiz;
    currentItems = data.items;
    quizScore = 0;
    answeredCount = 0;
    quizTimeLeft = currentQuiz.time_limit;
    quizStartTime = Date.now();
    navigateTo('quiz-play');
    renderQuizPlay();
    startTimer();
  } catch (e) {
    toast('Impossible de charger le quiz', 'error');
  }
}

function renderQuizPlay() {
  const container = document.getElementById('quiz-play-area');
  document.getElementById('quiz-play-title').textContent = currentQuiz.title;
  updateScoreDisplay();
  updateTimerDisplay();

  if (currentQuiz.quiz_type === 'saisie') renderSaisie(container);
  else if (currentQuiz.quiz_type === 'qcm') renderQCM(container);
  else if (currentQuiz.quiz_type === 'image') renderImage(container);
  else if (currentQuiz.quiz_type === 'carte') renderCarte(container);
}

// ===== SAISIE QUIZ =====
function renderSaisie(container) {
  const total = currentItems.length;
  const cols = total <= 10 ? 1 : total <= 20 ? 2 : total <= 40 ? 3 : 4;
  container.innerHTML = `
    <div class="answer-input-wrap">
      <input type="text" id="saisie-input" class="answer-input" 
             placeholder="${state.lang === 'fr' ? 'Tapez une réponse...' : 'Type an answer...'}"
             autocomplete="off" autofocus>
      <button class="btn btn-secondary btn-sm" onclick="clearSaisieInput()">✕</button>
    </div>
    <div class="answer-grid" id="answer-grid" style="grid-template-columns:repeat(${cols},1fr)">
      ${currentItems.map((_, i) => `<div class="answer-cell" id="cell-${i}"></div>`).join('')}
    </div>
  `;
  const input = document.getElementById('saisie-input');
  input.addEventListener('input', () => checkSaisieAnswer(input.value));
}

function clearSaisieInput() {
  const inp = document.getElementById('saisie-input');
  if (inp) { inp.value = ''; inp.focus(); }
}

function normalize(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function checkSaisieAnswer(val) {
  const norm = normalize(val);
  if (!norm) return;
  for (let i = 0; i < currentItems.length; i++) {
    const item = currentItems[i];
    const cell = document.getElementById('cell-' + i);
    if (cell.classList.contains('filled')) continue;
    const correctAnswers = [item.answer, ...(JSON.parse(item.alt_answers || '[]'))];
    const isMatch = correctAnswers.some(a => normalize(a) === norm);
    if (isMatch) {
      cell.textContent = item.answer;
      cell.classList.add('filled');
      quizScore++;
      answeredCount++;
      updateScoreDisplay();
      document.getElementById('saisie-input').value = '';
      if (answeredCount === currentItems.length) endQuiz();
      return;
    }
  }
}

// ===== QCM QUIZ =====
let qcmIndex = 0;
let qcmAnswers = [];

function renderQCM(container) {
  qcmIndex = 0;
  qcmAnswers = [];
  renderQCMQuestion(container);
}

function renderQCMQuestion(container) {
  if (qcmIndex >= currentItems.length) { endQuiz(); return; }
  const item = currentItems[qcmIndex];
  const progress = currentItems.map((_, i) => {
    const cls = i < qcmIndex ? (qcmAnswers[i] ? 'done correct' : 'done') : '';
    return `<div class="qcm-progress-dot ${cls}"></div>`;
  }).join('');

  container.innerHTML = `
    <div class="qcm-progress">${progress}</div>
    <div class="qcm-question-bar">
      ${item.image_url ? `<img src="${item.image_url}" style="max-height:160px;margin-bottom:12px;border-radius:8px">` : ''}
      <div class="qcm-question-text">${item.question}</div>
      <div style="font-size:12px;color:var(--orange-dark);margin-top:4px">${qcmIndex+1}/${currentItems.length}</div>
    </div>
    <div class="qcm-options">
      ${item.options.map(opt => `
        <div class="qcm-opt" onclick="selectQCMOption(this, ${opt.is_correct}, '${container.id}')">
          ${opt.option_text}
        </div>
      `).join('')}
    </div>
  `;
}

function selectQCMOption(el, isCorrect, containerId) {
  if (el.classList.contains('correct') || el.classList.contains('wrong')) return;
  const container = document.getElementById(containerId) || document.getElementById('quiz-play-area');
  
  // Show result
  document.querySelectorAll('.qcm-opt').forEach(opt => {
    opt.style.pointerEvents = 'none';
  });
  if (isCorrect) {
    el.classList.add('correct');
    quizScore++;
    updateScoreDisplay();
  } else {
    el.classList.add('wrong');
    // Highlight correct
    document.querySelectorAll('.qcm-opt').forEach(opt => {
      if (opt.textContent.trim() === currentItems[qcmIndex].options.find(o => o.is_correct)?.option_text) {
        opt.classList.add('correct');
      }
    });
  }
  qcmAnswers[qcmIndex] = isCorrect;
  qcmIndex++;
  answeredCount++;

  setTimeout(() => renderQCMQuestion(container), 1200);
}

// ===== IMAGE QUIZ =====
let imageIndex = 0;

function renderImage(container) {
  imageIndex = 0;
  renderImageQuestion(container);
}

function renderImageQuestion(container) {
  if (imageIndex >= currentItems.length) { endQuiz(); return; }
  const item = currentItems[imageIndex];
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:8px">${imageIndex+1}/${currentItems.length}</div>
      ${item.image_url
        ? `<img src="${item.image_url}" style="max-height:220px;max-width:100%;border-radius:var(--radius-lg);border:2px solid var(--gray-200)">`
        : `<div style="height:160px;background:var(--gray-100);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;font-size:48px">🖼️</div>`}
      ${item.question ? `<p style="margin-top:8px;font-weight:700">${item.question}</p>` : ''}
    </div>
    <div class="answer-input-wrap">
      <input type="text" id="img-input" class="answer-input" placeholder="Votre réponse..." autocomplete="off" autofocus>
      <button class="btn btn-primary" onclick="checkImageAnswer()">✓</button>
      <button class="btn btn-secondary" onclick="skipImageQuestion()">→</button>
    </div>
    <div id="img-feedback"></div>
  `;
  document.getElementById('img-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkImageAnswer();
  });
}

function checkImageAnswer() {
  const input = document.getElementById('img-input');
  const val = normalize(input.value);
  const item = currentItems[imageIndex];
  const correctAnswers = [item.answer, ...(JSON.parse(item.alt_answers || '[]'))];
  const isMatch = correctAnswers.some(a => normalize(a) === val);
  const fb = document.getElementById('img-feedback');
  if (isMatch) {
    fb.innerHTML = `<div class="alert alert-success">✅ Correct ! ${item.answer}</div>`;
    quizScore++;
    answeredCount++;
    updateScoreDisplay();
    imageIndex++;
    setTimeout(() => renderImageQuestion(document.getElementById('quiz-play-area')), 900);
  } else if (val) {
    fb.innerHTML = `<div class="alert alert-error">❌ Incorrect</div>`;
    setTimeout(() => { if (fb) fb.innerHTML = ''; }, 1000);
  }
}

function skipImageQuestion() {
  const item = currentItems[imageIndex];
  document.getElementById('img-feedback').innerHTML = `<div class="alert alert-error">Réponse : ${item.answer}</div>`;
  imageIndex++;
  answeredCount++;
  setTimeout(() => renderImageQuestion(document.getElementById('quiz-play-area')), 1200);
}

// ===== CARTE QUIZ =====
let carteIndex = 0;

function renderCarte(container) {
  carteIndex = 0;
  container.innerHTML = `
    <div id="map-container">
      <div id="ci-map-svg-wrap" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:8px">
        <div style="text-align:center;color:var(--gray-500)">
          <div style="font-size:48px">🗺️</div>
          <p style="font-size:14px;font-weight:700">Carte de la Côte d'Ivoire</p>
          <p style="font-size:12px">Mode carte - Cliquez sur la zone demandée</p>
        </div>
      </div>
      <div class="map-question-overlay" id="carte-question">Chargement...</div>
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn btn-secondary" onclick="skipCarteQuestion()">Passer →</button>
    </div>
    <div id="carte-result" style="margin-top:12px"></div>
    <div class="answer-grid" id="carte-answer-grid" style="grid-template-columns:repeat(3,1fr);margin-top:16px">
      ${currentItems.map((_, i) => `<div class="answer-cell" id="carte-cell-${i}"></div>`).join('')}
    </div>
  `;
  showCarteQuestion();
}

function showCarteQuestion() {
  if (carteIndex >= currentItems.length) { endQuiz(); return; }
  const item = currentItems[carteIndex];
  const q = document.getElementById('carte-question');
  if (q) q.textContent = `Où se trouve : ${item.question || item.answer} ?`;
}

function skipCarteQuestion() {
  const item = currentItems[carteIndex];
  document.getElementById('carte-result').innerHTML = `<div class="alert alert-error">Réponse : ${item.answer}</div>`;
  carteIndex++;
  answeredCount++;
  setTimeout(() => {
    document.getElementById('carte-result').innerHTML = '';
    showCarteQuestion();
  }, 1500);
}

// ===== TIMER =====
function startTimer() {
  clearInterval(quizTimer);
  updateTimerDisplay();
  quizTimer = setInterval(() => {
    quizTimeLeft--;
    updateTimerDisplay();
    if (quizTimeLeft <= 0) {
      clearInterval(quizTimer);
      endQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('quiz-timer');
  if (!el) return;
  el.textContent = formatTime(quizTimeLeft);
  el.className = 'timer-display' + (quizTimeLeft <= 10 ? ' urgent' : '');
}

function updateScoreDisplay() {
  const el = document.getElementById('quiz-score');
  if (el) el.textContent = `${quizScore}/${currentItems.length}`;
}

// ===== END QUIZ =====
async function endQuiz() {
  clearInterval(quizTimer);
  const timeTaken = Math.floor((Date.now() - quizStartTime) / 1000);
  const total = currentItems.length;

  // Submit result
  try {
    await api.submitResult(currentQuiz.id, {
      score: quizScore,
      total_questions: total,
      time_taken: timeTaken
    });
  } catch {}

  // Show results
  const pct = total > 0 ? Math.round((quizScore / total) * 100) : 0;
  const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 60 ? '⭐⭐' : '⭐';
  const msgs = {
    fr: pct >= 90 ? 'Excellent !' : pct >= 60 ? 'Bien joué !' : 'Continue d\'apprendre !',
    en: pct >= 90 ? 'Excellent!' : pct >= 60 ? 'Well played!' : 'Keep learning!'
  };

  document.getElementById('quiz-play-area').innerHTML = `
    <div class="results-screen">
      <div class="results-stars">${stars}</div>
      <div class="results-score">${quizScore}/${total}</div>
      <div class="results-label">${msgs[state.lang]} (${pct}%)</div>
      <p style="color:var(--gray-500);font-size:14px;margin-bottom:24px">⏱ ${formatTime(timeTaken)}</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="startQuiz(${currentQuiz.id})">🔄 Rejouer</button>
        <button class="share-btn" onclick="shareScore(${quizScore}, ${total}, '${currentQuiz.title}')">📤 ${t('share')}</button>
        <button class="btn btn-secondary" onclick="loadHome()">🏠 Accueil</button>
      </div>
    </div>
  `;
  document.getElementById('quiz-timer').textContent = '0';
}

function shareScore(score, total, title) {
  const text = `🎯 J'ai fait ${score}/${total} au quiz "${title}" sur Yoyo 🌍🇨🇮\nTente ta chance sur yoyo225.ci !`;
  if (navigator.share) {
    navigator.share({ text });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      toast('Score copié ! Partage-le sur les réseaux 🎉', 'success');
    });
  }
}

// ===== QUICK QCM =====
async function loadQuickQCM() {
  navigateTo('quiz-play');
  try {
    const data = await api.getQuizzes({ type: 'qcm', sort: 'popular', limit: 1 });
    if (data.quizzes.length) {
      await startQuiz(data.quizzes[0].id);
    } else {
      toast('Aucun QCM disponible', 'error');
      loadHome();
    }
  } catch {
    toast('Erreur', 'error');
    loadHome();
  }
}
