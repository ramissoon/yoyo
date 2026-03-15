// ── Profile ──────────────────────────────────────

async function loadProfile(pseudo) {
  go('profile');
  document.getElementById('prof-body').innerHTML = '<div class="spinner"></div>';
  try {
    const u = await api.user(pseudo);
    renderProfile(u);
  } catch {
    document.getElementById('prof-body').innerHTML = '<div class="empty">Utilisateur introuvable</div>';
  }
}

async function renderProfile(u) {
  const isMe    = S.user?.id === u.id;
  const isAdmin = S.user?.is_admin;

  // Check flame status
  let flamed = false;
  if (S.user && !isMe) {
    try { flamed = (await api.flameStatus(u.id)).flamed; } catch {}
  }

  const lvlLabel = { debutant:'Débutant', intermediaire:'Intermédiaire', expert:'Expert' };
  const lvlClass = { debutant:'badge-deb', intermediaire:'badge-int', expert:'badge-exp' };

  document.getElementById('prof-body').innerHTML = `
    <div class="prof-hd">
      <div class="prof-icon">${icon(u)}</div>
      <div class="prof-name">@${u.pseudo}</div>
      <div class="prof-stats">
        <div><span class="prof-stat-val">${u.total_score}</span><span class="prof-stat-lbl">Score total</span></div>
        <div><span class="prof-stat-val">🔥 ${u.flames_received}</span><span class="prof-stat-lbl">Flammes</span></div>
        <div><span class="prof-stat-val">${u.quizzes_played}</span><span class="prof-stat-lbl">Joués</span></div>
        <div><span class="prof-stat-val">${u.quizzes_created}</span><span class="prof-stat-lbl">Créés</span></div>
      </div>
      ${!isMe && S.user ? `
        <button class="flame-btn ${flamed ? 'on' : ''}" id="prof-flame-btn"
                onclick="toggleProfileFlame(${u.id}, this)" style="margin-top:12px;color:white;border-color:rgba(255,255,255,.5)">
          🔥 ${flamed ? 'Enflammé' : 'Enflammer ce créateur'}
        </button>` : ''}
      ${!isMe && !S.user ? `
        <button class="flame-btn" onclick="openAuth()" style="margin-top:12px;color:white;border-color:rgba(255,255,255,.5)">
          🔥 Enflammer ce créateur
        </button>` : ''}
      ${isMe ? `<button class="hdr-btn" onclick="showIconPicker()" style="margin-top:12px">${icon(S.user)} Changer d'icône</button>` : ''}
    </div>

    <div style="padding:16px">
      ${u.badges?.length ? `
        <h3 style="font-family:'Baloo 2',cursive;font-size:15px;font-weight:800;margin-bottom:10px">🏆 Badges</h3>
        <div style="margin-bottom:16px">
          ${u.badges.map(b => `
            <span class="badge-pill ${lvlClass[b.level]}">
              ${b.cat_icon} ${S.lang==='fr' ? b.name_fr : b.name_en}
              <span style="opacity:.6;font-size:10px">${lvlLabel[b.level]}</span>
            </span>`).join('')}
        </div>` : ''}

      <h3 style="font-family:'Baloo 2',cursive;font-size:15px;font-weight:800;margin-bottom:10px">📝 Quiz créés</h3>
      ${u.quizzes?.length
        ? `<ul class="quiz-list">${u.quizzes.map(q => `
            <li class="quiz-list-item" onclick="loadQuizInfo(${q.id})">
              <div class="quiz-thumb">${q.image_url ? `<img src="${q.image_url}" alt="" onerror="this.parentElement.textContent='📝'">` : '📝'}</div>
              <div class="quiz-info">
                <span class="quiz-title">${q.title}</span>
                <div class="quiz-meta">${typeTag(q.quiz_type)} <span>🎮 ${fmt(q.plays_count)}</span> <span>❤️ ${fmt(q.likes_count)}</span></div>
              </div>
            </li>`).join('')}</ul>`
        : '<p style="color:var(--gray);font-size:13px">Aucun quiz créé</p>'}
    </div>`;
}

async function toggleProfileFlame(userId, btn) {
  if (!S.user) { openAuth(); return; }
  try {
    const r = await api.flame(userId);
    btn.classList.toggle('on', r.flamed);
    btn.innerHTML = r.flamed ? '🔥 Enflammé' : '🔥 Enflammer ce créateur';
    toast(r.flamed ? '🔥 Flamme donnée !' : 'Flamme retirée', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

// ── Icon picker ──────────────────────────────────
function showIconPicker() {
  document.getElementById('icon-grid').innerHTML = ICON_LIST.map(ic =>
    `<div class="icon-opt ${S.user?.icon === ic.id ? 'selected' : ''}"
          onclick="pickIcon('${ic.id}', this)" style="cursor:pointer;padding:10px;border-radius:8px;font-size:28px;text-align:center;border:2px solid ${S.user?.icon===ic.id?'var(--orange)':'var(--border)'}">
       ${ic.emoji}
     </div>`
  ).join('');
  openModal('modal-icon');
}

async function pickIcon(id, el) {
  try {
    await api.updateIcon(id);
    S.user.icon = id;
    document.getElementById('hdr-icon').textContent = icon(S.user);
    closeModal('modal-icon');
    toast('Icône mise à jour !', 'ok');
    loadProfile(S.user.pseudo);
  } catch (e) { toast(e.message, 'err'); }
}

// ── Create Quiz ──────────────────────────────────
let CQ = {}; // create quiz state

function openCreateQuiz() {
  if (!S.user) { openAuth(); return; }
  CQ = { step: 1, items: [], type: 'saisie' };
  go('create');

  // Populate category select
  const sel = document.getElementById('create-category');
  if (sel && S.categories.length) {
    sel.innerHTML = S.categories.map(c =>
      `<option value="${c.id}">${c.icon} ${S.lang==='fr' ? c.name_fr : c.name_en}</option>`
    ).join('');
  }
  goCreateStep(1);
}

function goCreateStep(n) {
  if (n === 2) {
    const title = document.getElementById('create-title').value.trim();
    if (!title) { toast('Le titre est requis', 'err'); return; }
    CQ.title       = title;
    CQ.description = document.getElementById('create-desc').value.trim();
    CQ.category_id = document.getElementById('create-category').value;
    CQ.type        = document.getElementById('create-type').value;
    CQ.time_limit  = parseInt(document.getElementById('create-time').value) || 120;
    CQ.sources     = document.getElementById('create-sources').value.trim();
    renderItemsBuilder();
  }
  if (n === 3) {
    if (!CQ.items.length) { toast('Ajoutez au moins une question', 'err'); return; }
    document.getElementById('preview-title').textContent = CQ.title;
    document.getElementById('preview-meta').textContent  =
      `${CQ.items.length} question(s) · ${CQ.time_limit}s`;
    document.getElementById('preview-desc').textContent  = CQ.description || '';
  }
  CQ.step = n;
  ['step1','step2','step3'].forEach((id, i) => {
    document.getElementById(id + '-pane').style.display = (i + 1 === n) ? 'block' : 'none';
    document.getElementById('step-' + (i+1)).className = 'step' + (i+1 < n ? ' done' : i+1 === n ? ' active' : '');
  });
}

function renderItemsBuilder() {
  document.getElementById('items-type-label').textContent =
    { saisie:'Réponse à deviner', qcm:'Question à choix multiple', image:'Image + réponse', carte:'Localisation' }[CQ.type];
  const cont = document.getElementById('items-container');
  cont.innerHTML = '';
  CQ.items.forEach((_, i) => addItemCard(cont, i));
}

function addItemCard(cont, i) {
  const item = CQ.items[i] || {};
  const div  = document.createElement('div');
  div.className = 'item-card';
  div.id = 'ic-' + i;
  let html = `<div class="item-num">Question ${i+1}</div>`;

  if (CQ.type === 'saisie') {
    html += `
      <div class="field">
        <input class="inp" placeholder="Réponse (ex: Abidjan)" value="${item.answer||''}"
               oninput="CQ.items[${i}]=CQ.items[${i}]||{};CQ.items[${i}].answer=this.value">
      </div>
      <div class="field">
        <input class="inp" placeholder="Réponses alternatives, séparées par des virgules (optionnel)"
               value="${(item.alt_answers||[]).join(', ')}"
               oninput="CQ.items[${i}].alt_answers=this.value.split(',').map(s=>s.trim()).filter(Boolean)">
      </div>`;
  } else if (CQ.type === 'qcm') {
    const opts = item.options || [{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}];
    if (!item.options) CQ.items[i].options = opts;
    html += `
      <div class="field">
        <input class="inp" placeholder="Question" value="${item.question||''}"
               oninput="CQ.items[${i}].question=this.value">
      </div>`;
    opts.forEach((opt, oi) => {
      html += `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <input type="radio" name="correct-${i}" ${opt.correct?'checked':''} onchange="setCorrect(${i},${oi})">
          <input class="inp" placeholder="Option ${oi+1}" value="${opt.text}"
                 oninput="CQ.items[${i}].options[${oi}].text=this.value" style="flex:1">
        </div>`;
    });
  } else if (CQ.type === 'image') {
    html += `
      <div class="field">
        <label>Image</label>
        <div class="img-upload-zone" id="upload-zone-${i}" onclick="document.getElementById('img-file-${i}').click()">
          <input type="file" id="img-file-${i}" accept="image/*" onchange="handleImageUpload(${i}, this)">
          ${item.image_url
            ? `<img src="${item.image_url}" class="img-preview" alt=""><br><small style="color:var(--gray)">Cliquer pour changer</small>`
            : '📷 Cliquer pour uploader une image'}
        </div>
      </div>
      <div class="field">
        <input class="inp" placeholder="Réponse attendue (ex: Basilique de Yamoussoukro)" value="${item.answer||''}"
               oninput="CQ.items[${i}].answer=this.value">
      </div>
      <div class="field">
        <input class="inp" placeholder="Question (optionnel)" value="${item.question||''}"
               oninput="CQ.items[${i}].question=this.value">
      </div>`;
  } else if (CQ.type === 'carte') {
    html += `
      <div class="field">
        <input class="inp" placeholder="Nom à localiser (ex: Yamoussoukro)" value="${item.question||''}"
               oninput="CQ.items[${i}].question=this.value;CQ.items[${i}].answer=this.value">
      </div>
      <div class="field">
        <input class="inp" placeholder="ID de la région SVG (ex: abidjan, poro...)" value="${item.region_id||''}"
               oninput="CQ.items[${i}].region_id=this.value">
        <small style="color:var(--gray);font-size:11px">IDs disponibles : abidjan, lagunes, poro, gbeke, hambol, tchologo, bagoue, bafing, folon, kabadougou, goh, marahoue, haut-sassandra, nawa, gbokle, san-pedro, cavally, guemon, loh-djiboua, me, agnebi, sud-comoe, moronou, n-zi, iffou, belier, gontougo, bounkani, indenie-djuablin, grands-ponts, sud-bandama</small>
      </div>`;
  }

  html += `<button class="remove-item" onclick="removeItem(${i})">✕</button>`;
  div.innerHTML = html;
  cont.appendChild(div);
}

function addNewItem() {
  const newItem = CQ.type === 'qcm'
    ? { question:'', options:[{text:'',correct:true},{text:'',correct:false},{text:'',correct:false},{text:'',correct:false}] }
    : {};
  CQ.items.push(newItem);
  const cont = document.getElementById('items-container');
  addItemCard(cont, CQ.items.length - 1);
}

function removeItem(i) {
  CQ.items.splice(i, 1);
  renderItemsBuilder();
}

function setCorrect(itemIdx, optIdx) {
  if (!CQ.items[itemIdx]?.options) return;
  CQ.items[itemIdx].options.forEach((o, i) => o.correct = i === optIdx);
}

async function handleImageUpload(idx, input) {
  const file = input.files[0];
  if (!file) return;
  const zone = document.getElementById('upload-zone-' + idx);
  zone.innerHTML = '⏳ Upload en cours...';
  try {
    const r = await api.uploadImage(file);
    CQ.items[idx] = CQ.items[idx] || {};
    CQ.items[idx].image_url = r.url;
    zone.innerHTML = `<img src="${r.url}" class="img-preview" alt=""><br><small style="color:var(--gray)">Cliquer pour changer</small>`;
    toast('Image uploadée !', 'ok');
  } catch (e) {
    zone.innerHTML = '📷 Cliquer pour uploader une image';
    toast('Erreur upload: ' + e.message, 'err');
  }
}

// Upload image for quiz thumbnail
async function handleThumbUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const zone = document.getElementById('thumb-zone');
  zone.innerHTML = '⏳ Upload en cours...';
  try {
    const r = await api.uploadImage(file);
    CQ.image_url = r.url;
    zone.innerHTML = `<img src="${r.url}" class="img-preview" alt=""><br><small>Cliquer pour changer</small>`;
    toast('Image uploadée !', 'ok');
  } catch (e) {
    zone.innerHTML = '🖼️ Image de couverture (optionnel)';
    toast('Erreur: ' + e.message, 'err');
  }
}

async function publishQuiz() {
  const items = CQ.items.filter(it => {
    if (CQ.type === 'qcm') return it.question && it.options?.some(o => o.text);
    return it.answer || it.question;
  });
  if (!items.length) { toast('Ajoutez des questions valides', 'err'); return; }

  const payload = {
    title:       CQ.title,
    description: CQ.description,
    category_id: CQ.category_id,
    quiz_type:   CQ.type,
    time_limit:  CQ.time_limit,
    image_url:   CQ.image_url || null,
    sources:     CQ.sources,
    items:       items.map(it => ({
      question:    it.question || '',
      answer:      it.answer || (it.options?.find(o=>o.correct)?.text) || '',
      alt_answers: it.alt_answers || [],
      image_url:   it.image_url || null,
      region_id:   it.region_id || null,
      options:     it.options || [],
    }))
  };

  try {
    const r = await api.createQuiz(payload);
    await api.publishQuiz(r.id);
    toast('Quiz publié ! 🎉', 'ok');
    loadHome();
  } catch (e) { toast(e.message, 'err'); }
}
