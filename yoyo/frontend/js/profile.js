// js/profile.js - Profile and create quiz

async function showProfile(pseudo) {
  navigateTo('profile');
  document.getElementById('profile-content').innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const user = await api.getUser(pseudo);
    renderProfile(user);
  } catch {
    document.getElementById('profile-content').innerHTML = `<div class="empty-state"><p>Utilisateur introuvable</p></div>`;
  }
}

function renderProfile(user) {
  const isOwn = state.user?.id === user.id;
  const badgeLevels = { debutant: 'Débutant', intermediaire: 'Intermédiaire', expert: 'Expert' };
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-header">
      <div class="profile-icon">${userIcon(user)}</div>
      <div class="profile-name">@${user.pseudo}</div>
      <div class="profile-stats">
        <div class="profile-stat"><div class="profile-stat-val">${user.total_score}</div><div class="profile-stat-label">Score total</div></div>
        <div class="profile-stat"><div class="profile-stat-val">🔥 ${user.flames_received}</div><div class="profile-stat-label">Flammes</div></div>
        <div class="profile-stat"><div class="profile-stat-val">${user.quizzes_played}</div><div class="profile-stat-label">Quiz joués</div></div>
        <div class="profile-stat"><div class="profile-stat-val">${user.quizzes_created}</div><div class="profile-stat-label">Quiz créés</div></div>
      </div>
    </div>
    <div style="padding:20px 24px">
      ${user.badges?.length ? `
        <h3 class="section-title" style="margin-bottom:12px">🏆 Badges</h3>
        <div class="badges-grid" style="margin-bottom:20px">
          ${user.badges.map(b => `
            <div class="badge-item ${b.level}">
              <span>${b.cat_icon}</span>
              <div>
                <div>${state.lang === 'fr' ? b.name_fr : b.name_en}</div>
                <div style="font-size:10px;opacity:0.7">${badgeLevels[b.level]}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${user.quizzes?.length ? `
        <h3 class="section-title" style="margin-bottom:12px">📝 Quiz créés</h3>
        <div class="quiz-grid">
          ${user.quizzes.map(q => `
            <div class="card quiz-card" onclick="showQuizInfo(${q.id})">
              <div class="quiz-card-img no-img"><span style="font-size:28px">📝</span></div>
              <div class="quiz-card-body">
                <div class="quiz-card-title">${q.title}</div>
                <div class="quiz-card-meta"><span>🎮 ${q.plays_count}</span><span>❤️ ${q.likes_count}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `<p style="color:var(--gray-500)">Aucun quiz créé</p>`}

      ${isOwn ? `
        <div style="margin-top:24px">
          <button class="btn btn-secondary" onclick="showIconPicker()">
            ${userIcon(state.user)} Changer d'icône
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function showIconPicker() {
  document.getElementById('icon-picker-content').innerHTML = ICON_LIST.map(icon => `
    <div class="icon-opt ${state.user?.icon === icon.id ? 'selected' : ''}" 
         onclick="selectIcon('${icon.id}', this)">
      ${icon.emoji}
    </div>
  `).join('');
  openModal('modal-icon-picker');
}

async function selectIcon(iconId, el) {
  document.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  try {
    await api.updateIcon(iconId);
    state.user.icon = iconId;
    document.getElementById('user-avatar-icon').textContent = userIcon(state.user);
    closeModal('modal-icon-picker');
    toast('Icône mise à jour !', 'success');
    showProfile(state.user.pseudo);
  } catch {
    toast('Erreur', 'error');
  }
}

// ===== CREATE QUIZ =====
let createQuizData = { step: 1, items: [], quiz_type: 'saisie' };

function openCreateQuiz() {
  if (!state.user) { openLoginModal(); return; }
  createQuizData = { step: 1, items: [], quiz_type: 'saisie' };
  navigateTo('create-quiz');
  loadCategoriesForCreate();
  renderCreateStep();
}

async function loadCategoriesForCreate() {
  if (!state.categories.length) {
    try { state.categories = await api.getCategories(); } catch {}
  }
  const sel = document.getElementById('create-category');
  if (sel) {
    sel.innerHTML = state.categories.map(c =>
      `<option value="${c.id}">${c.icon} ${state.lang === 'fr' ? c.name_fr : c.name_en}</option>`
    ).join('');
  }
}

function renderCreateStep() {
  const steps = document.querySelectorAll('.step');
  steps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < createQuizData.step) s.classList.add('done');
    if (i + 1 === createQuizData.step) s.classList.add('active');
  });

  ['step1-content', 'step2-content', 'step3-content'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (i + 1 === createQuizData.step) ? 'block' : 'none';
  });
}

function goToStep(n) {
  if (n === 2) {
    const title = document.getElementById('create-title').value.trim();
    if (!title) { toast('Le titre est requis', 'error'); return; }
    createQuizData.title = title;
    createQuizData.description = document.getElementById('create-description').value.trim();
    createQuizData.category_id = document.getElementById('create-category').value;
    createQuizData.quiz_type = document.getElementById('create-type').value;
    createQuizData.time_limit = parseInt(document.getElementById('create-time').value) || 120;
    createQuizData.sources = document.getElementById('create-sources').value.trim();
    renderItemsBuilder();
  }
  if (n === 3) {
    if (!createQuizData.items.length) { toast('Ajoutez au moins une question', 'error'); return; }
  }
  createQuizData.step = n;
  renderCreateStep();
}

function renderItemsBuilder() {
  const type = createQuizData.quiz_type;
  const container = document.getElementById('items-builder');
  container.innerHTML = '';
  createQuizData.items.forEach((_, i) => renderItemBuilder(container, i));
  document.getElementById('items-type-label').textContent = 
    type === 'saisie' ? 'Réponse à deviner' :
    type === 'qcm' ? 'Question à choix multiple' :
    type === 'image' ? 'Image + réponse' : 'Localisation';
}

function renderItemBuilder(container, index) {
  const item = createQuizData.items[index] || {};
  const type = createQuizData.quiz_type;
  const div = document.createElement('div');
  div.className = 'item-builder';
  div.id = `item-${index}`;
  let html = `<div class="item-builder-header">Question ${index + 1}</div>`;
  
  if (type === 'saisie') {
    html += `<input class="form-control" placeholder="Réponse (ex: Abidjan)" value="${item.answer || ''}" 
              oninput="updateItem(${index},'answer',this.value)">
             <input class="form-control" style="margin-top:8px" placeholder="Réponses alternatives (séparées par des virgules)" 
              value="${item.alt || ''}" oninput="updateItem(${index},'alt',this.value)">`;
  } else if (type === 'qcm') {
    html += `<input class="form-control" placeholder="Question" value="${item.question || ''}" 
              oninput="updateItem(${index},'question',this.value)" style="margin-bottom:8px">`;
    html += `<div id="qcm-opts-${index}">`;
    const opts = item.options || [{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}];
    opts.forEach((opt, oi) => {
      html += `<div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
        <input type="radio" name="correct-${index}" ${opt.correct ? 'checked' : ''} onchange="setCorrectOpt(${index},${oi})">
        <input class="form-control" placeholder="Option ${oi+1}" value="${opt.text}" 
               oninput="updateQCMOpt(${index},${oi},this.value)" style="flex:1">
      </div>`;
    });
    html += '</div>';
  } else if (type === 'image') {
    html += `<input class="form-control" placeholder="URL de l'image" value="${item.image_url || ''}" 
              oninput="updateItem(${index},'image_url',this.value)" style="margin-bottom:8px">
             <input class="form-control" placeholder="Réponse attendue" value="${item.answer || ''}"
              oninput="updateItem(${index},'answer',this.value)" style="margin-bottom:8px">
             <input class="form-control" placeholder="Question (optionnel)" value="${item.question || ''}"
              oninput="updateItem(${index},'question',this.value)">`;
  } else if (type === 'carte') {
    html += `<input class="form-control" placeholder="Nom de la zone à localiser (ex: Yamoussoukro)" 
              value="${item.question || ''}" oninput="updateItem(${index},'question',this.value)" style="margin-bottom:8px">
             <input class="form-control" placeholder="Réponse" value="${item.answer || ''}"
              oninput="updateItem(${index},'answer',this.value)">`;
  }

  html += `<button class="remove-item" onclick="removeItem(${index})">✕</button>`;
  div.innerHTML = html;
  container.appendChild(div);
}

function updateItem(index, key, val) {
  if (!createQuizData.items[index]) createQuizData.items[index] = {};
  createQuizData.items[index][key] = val;
}

function updateQCMOpt(itemIndex, optIndex, val) {
  if (!createQuizData.items[itemIndex]) createQuizData.items[itemIndex] = {};
  if (!createQuizData.items[itemIndex].options) createQuizData.items[itemIndex].options = [{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}];
  createQuizData.items[itemIndex].options[optIndex].text = val;
}

function setCorrectOpt(itemIndex, optIndex) {
  if (!createQuizData.items[itemIndex]?.options) return;
  createQuizData.items[itemIndex].options.forEach((o, i) => o.correct = i === optIndex);
}

function addItem() {
  const type = createQuizData.quiz_type;
  const newItem = type === 'qcm' 
    ? { options: [{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}] }
    : {};
  createQuizData.items.push(newItem);
  const container = document.getElementById('items-builder');
  renderItemBuilder(container, createQuizData.items.length - 1);
}

function removeItem(index) {
  createQuizData.items.splice(index, 1);
  renderItemsBuilder();
}

async function publishQuiz() {
  const items = createQuizData.items.filter(it => it.answer || (it.options && it.options.some(o => o.text)));
  if (!items.length) { toast('Ajoutez des questions', 'error'); return; }

  const payload = {
    title: createQuizData.title,
    description: createQuizData.description,
    category_id: createQuizData.category_id,
    quiz_type: createQuizData.quiz_type,
    time_limit: createQuizData.time_limit,
    sources: createQuizData.sources,
    items: items.map(it => ({
      question: it.question || '',
      answer: it.answer || (it.options?.find(o=>o.correct)?.text) || '',
      alt_answers: it.alt ? it.alt.split(',').map(s=>s.trim()) : [],
      image_url: it.image_url || null,
      lat: it.lat || null,
      lng: it.lng || null,
      options: it.options || []
    }))
  };

  try {
    const result = await api.createQuiz(payload);
    await api.publishQuiz(result.id);
    toast('Quiz publié avec succès ! 🎉', 'success');
    loadHome();
  } catch (e) {
    toast(e.message, 'error');
  }
}
