// js/admin.js - Admin dashboard

async function loadAdmin() {
  if (!state.user?.is_admin) { loadHome(); return; }
  navigateTo('admin');
  loadAdminStats();
}

async function loadAdminStats() {
  try {
    const data = await api.adminStats();
    document.getElementById('admin-stat-users').textContent = data.stats.total_users;
    document.getElementById('admin-stat-quizzes').textContent = data.stats.total_quizzes;
    document.getElementById('admin-stat-published').textContent = data.stats.published_quizzes;
    document.getElementById('admin-stat-plays').textContent = data.stats.total_plays;
    document.getElementById('admin-stat-reports').textContent = data.stats.pending_reports;

    // Recent users
    const uBody = document.getElementById('admin-recent-users');
    if (data.recent_users.length) {
      uBody.innerHTML = data.recent_users.map(u => `
        <tr>
          <td style="font-weight:700">${u.pseudo}</td>
          <td style="color:var(--gray-500)">${u.email}</td>
          <td style="color:var(--gray-500)">${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
          <td>
            <button class="btn btn-sm" style="background:#FEF2F2;color:#DC2626;border:none;cursor:pointer"
                    onclick="adminDeleteUser(${u.id}, '${u.pseudo}')">Supprimer</button>
          </td>
        </tr>
      `).join('');
    } else {
      uBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-500)">Aucun utilisateur récent</td></tr>`;
    }

    // Pending reports
    const rBody = document.getElementById('admin-reports');
    if (data.pending_reports.length) {
      rBody.innerHTML = data.pending_reports.map(r => `
        <tr>
          <td><a href="#" onclick="showQuizInfo(${r.quiz_id});return false;" style="font-weight:700">${r.quiz_title}</a></td>
          <td style="color:var(--gray-500)">${r.reporter_pseudo || 'Anonyme'}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${r.reason}</td>
          <td>
            <button class="btn btn-sm btn-green" onclick="resolveReport(${r.id},'reviewed')">✓ Traité</button>
            <button class="btn btn-sm btn-secondary" onclick="resolveReport(${r.id},'dismissed')">✗ Ignorer</button>
          </td>
        </tr>
      `).join('');
    } else {
      rBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray-500)">Aucun signalement en attente 🎉</td></tr>`;
    }
  } catch (e) {
    toast('Erreur chargement stats admin', 'error');
  }
}

async function loadAdminUsers(search = '') {
  const body = document.getElementById('admin-users-table');
  body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
  try {
    const rows = await api.adminUsers({ search, limit: 50 });
    if (rows.length) {
      body.innerHTML = rows.map(u => `
        <tr>
          <td style="font-weight:700">${u.pseudo}</td>
          <td style="color:var(--gray-500)">${u.email}</td>
          <td>${u.total_score}</td>
          <td>${u.quizzes_played}</td>
          <td>${u.quizzes_created}</td>
          <td>
            <button class="btn btn-sm" style="background:#FEF2F2;color:#DC2626;border:none;cursor:pointer"
                    onclick="adminDeleteUser(${u.id}, '${u.pseudo}')">Supprimer</button>
          </td>
        </tr>
      `).join('');
    } else {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-500)">Aucun utilisateur trouvé</td></tr>`;
    }
  } catch (e) {
    toast('Erreur', 'error');
  }
}

async function adminDeleteUser(id, pseudo) {
  if (!confirm(`Supprimer le compte de ${pseudo} ?`)) return;
  try {
    await api.adminDeleteUser(id);
    toast(`Compte de ${pseudo} supprimé`, 'success');
    loadAdminUsers();
    loadAdminStats();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function loadAdminQuizzes(search = '') {
  const body = document.getElementById('admin-quizzes-table');
  body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
  try {
    const rows = await api.adminQuizzes({ search, limit: 50 });
    if (rows.length) {
      body.innerHTML = rows.map(q => `
        <tr>
          <td style="font-weight:700">${q.title}</td>
          <td>${q.creator_pseudo}</td>
          <td>${q.category}</td>
          <td>${typeLabel(q.quiz_type)}</td>
          <td>
            <span class="badge ${q.is_published ? 'badge-green' : 'badge-gray'}">
              ${q.is_published ? 'Publié' : 'Brouillon'}
            </span>
          </td>
          <td>
            <button class="btn btn-sm" style="background:#FEF2F2;color:#DC2626;border:none;cursor:pointer"
                    onclick="adminDeleteQuiz(${q.id}, '${q.title.replace(/'/g,"\\'")}')">Supprimer</button>
          </td>
        </tr>
      `).join('');
    } else {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-500)">Aucun quiz trouvé</td></tr>`;
    }
  } catch {
    toast('Erreur', 'error');
  }
}

async function adminDeleteQuiz(id, title) {
  if (!confirm(`Supprimer le quiz "${title}" ?`)) return;
  try {
    await api.adminDeleteQuiz(id);
    toast('Quiz supprimé', 'success');
    loadAdminQuizzes();
    loadAdminStats();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function resolveReport(id, status) {
  try {
    await api.adminResolveReport(id, status);
    toast('Signalement traité', 'success');
    loadAdminStats();
  } catch {
    toast('Erreur', 'error');
  }
}

function switchAdminTab(tab) {
  document.querySelectorAll('#admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#admin .tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('admin-tab-' + tab).classList.add('active');
  document.getElementById('admin-panel-' + tab).classList.add('active');

  if (tab === 'users') loadAdminUsers();
  if (tab === 'quizzes') loadAdminQuizzes();
}
