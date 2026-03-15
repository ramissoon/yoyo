// ── Auth modal ───────────────────────────────────

function openAuth(tab = 'login') {
  document.getElementById('auth-err').textContent = '';
  switchAuthTab(tab);
  openModal('modal-auth');
}

function switchAuthTab(tab) {
  ['login','register'].forEach(t => {
    document.getElementById('auth-tab-' + t).classList.toggle('active', t === tab);
    document.getElementById('auth-pane-' + t).classList.toggle('active', t === tab);
  });
  document.getElementById('auth-err').textContent = '';
}

async function doLogin() {
  const email    = document.getElementById('l-email').value.trim();
  const password = document.getElementById('l-pass').value;
  const errEl    = document.getElementById('auth-err');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Remplissez tous les champs'; return; }
  try {
    const data = await api.login({ email, password });
    setToken(data.token);
    S.user = data.user;
    S.lang = data.user.language || 'fr';
    renderHeader();
    closeModal('modal-auth');
    toast(`Bienvenue ${data.user.pseudo} ! 🦁`, 'ok');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function doRegister() {
  const email    = document.getElementById('r-email').value.trim();
  const pseudo   = document.getElementById('r-pseudo').value.trim();
  const password = document.getElementById('r-pass').value;
  const confirm  = document.getElementById('r-confirm').value;
  const language = document.getElementById('r-lang').value;
  const errEl    = document.getElementById('auth-err');
  errEl.textContent = '';
  if (!email || !pseudo || !password || !confirm) { errEl.textContent = 'Remplissez tous les champs'; return; }
  if (password !== confirm) { errEl.textContent = 'Les mots de passe ne correspondent pas'; return; }
  if (password.length < 6)  { errEl.textContent = 'Mot de passe trop court (6 car. min)'; return; }
  try {
    const data = await api.register({ email, pseudo, password, language });
    setToken(data.token);
    S.user = data.user;
    S.lang = language;
    renderHeader();
    closeModal('modal-auth');
    toast(`Bienvenue sur Yoyo, ${pseudo} ! 🎉`, 'ok');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.querySelector('#auth-pane-login.active');
  const activeR = document.querySelector('#auth-pane-register.active');
  if (active && document.getElementById('modal-auth').classList.contains('open')) doLogin();
  if (activeR && document.getElementById('modal-auth').classList.contains('open')) doRegister();
});
