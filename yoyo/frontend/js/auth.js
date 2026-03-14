// js/auth.js - Authentication modals

function openLoginModal() {
  document.getElementById('auth-error').textContent = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  openModal('modal-auth');
  switchAuthTab('login');
}

function switchAuthTab(tab) {
  document.getElementById('auth-login-tab').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-tab').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('auth-tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('auth-tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('auth-error').textContent = '';
}

async function submitLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Veuillez remplir tous les champs'; return; }
  try {
    const data = await api.login({ email, password });
    api.setToken(data.token);
    state.user = data.user;
    state.lang = data.user.language || 'fr';
    updateHeaderAuth();
    closeModal('modal-auth');
    toast(`Bienvenue, ${data.user.pseudo} ! 🦁`, 'success');
    if (data.user.is_admin) {
      // offer to go to admin
    }
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function submitRegister() {
  const email = document.getElementById('reg-email').value.trim();
  const pseudo = document.getElementById('reg-pseudo').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm').value;
  const language = document.getElementById('reg-lang').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';

  if (!email || !pseudo || !password || !confirmPassword)
    { errEl.textContent = 'Veuillez remplir tous les champs'; return; }
  if (password !== confirmPassword)
    { errEl.textContent = 'Les mots de passe ne correspondent pas'; return; }
  if (password.length < 6)
    { errEl.textContent = 'Mot de passe trop court (6 caractères minimum)'; return; }

  try {
    const data = await api.register({ email, pseudo, password, language });
    api.setToken(data.token);
    state.user = data.user;
    state.lang = language;
    updateHeaderAuth();
    closeModal('modal-auth');
    toast(`Bienvenue sur Yoyo, ${pseudo} ! 🎉`, 'success');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

// ===== MODAL UTILS =====
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('show');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
  }
});
