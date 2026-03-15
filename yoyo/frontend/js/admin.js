// ── Admin ────────────────────────────────────────

async function loadAdmin() {
  if (!S.user?.is_admin) { loadHome(); return; }
  go('admin');
  loadAdminDashboard();
}

async function loadAdminDashboard() {
  try {
    const d = await api.adminStats();
    document.getElementById('a-users').textContent    = d.stats.users;
    document.getElementById('a-quizzes').textContent  = d.stats.quizzes;
    document.getElementById('a-published').textContent= d.stats.published;
    document.getElementById('a-plays').textContent    = d.stats.plays;
    document.getElementById('a-reports').textContent  = d.stats.reports;

    // Recent users
    const ru = document.getElementById('a-recent-users');
    ru.innerHTML = d.recent_users.length
      ? d.recent_users.map(u => `
          <tr>
            <td><a href="#" onclick="loadProfile('${u.pseudo}');return false" style="font-weight:700">${u.pseudo}</a></td>
            <td style="color:var(--gray)">${u.email}</td>
            <td style="color:var(--gray);font-size:12px">${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
            <td><button class="btn btn-red btn-sm" onclick="adminDelUser(${u.id},'${u.pseudo}')">Supprimer</button></td>
          </tr>`).join('')
      : `<tr><td colspan="4" class="empty">Aucun utilisateur récent</td></tr>`;

    // Pending reports
    const rp = document.getElementById('a-reports-table');
    rp.innerHTML = d.pending_reports.length
      ? d.pending_reports.map(r => `
          <tr>
            <td><a href="#" onclick="loadQuizInfo(${r.quiz_id});return false" style="font-weight:700">${r.quiz_title}</a></td>
            <td>${r.reporter_pseudo || 'Anonyme'}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.reason}</td>
            <td>
              <button class="btn btn-green btn-sm" onclick="resolveReport(${r.id},'reviewed')">✓ Traité</button>
              <button class="btn btn-gray btn-sm"  onclick="resolveReport(${r.id},'dismissed')">✗ Ignorer</button>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="4" class="empty">Aucun signalement en attente 🎉</td></tr>`;
  } catch (e) { toast('Erreur admin: ' + e.message, 'err'); }
}

async function loadAdminUsers(search = '') {
  const tb = document.getElementById('a-users-tb');
  tb.innerHTML = `<tr><td colspan="6"><div class="spinner"></div></td></tr>`;
  try {
    const rows = await api.adminUsers({ search, limit: 50 });
    tb.innerHTML = rows.length
      ? rows.map(u => `
          <tr>
            <td><a href="#" onclick="loadProfile('${u.pseudo}');return false" style="font-weight:700">${u.pseudo}</a></td>
            <td style="color:var(--gray)">${u.email}</td>
            <td>${u.total_score}</td>
            <td>${u.quizzes_played}</td>
            <td>${u.quizzes_created}</td>
            <td><button class="btn btn-red btn-sm" onclick="adminDelUser(${u.id},'${u.pseudo}')">Supprimer</button></td>
          </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Aucun utilisateur trouvé</td></tr>`;
  } catch { toast('Erreur', 'err'); }
}

async function loadAdminQuizzes(search = '') {
  const tb = document.getElementById('a-quizzes-tb');
  tb.innerHTML = `<tr><td colspan="6"><div class="spinner"></div></td></tr>`;
  try {
    const rows = await api.adminQuizzes({ search, limit: 50 });
    tb.innerHTML = rows.length
      ? rows.map(q => `
          <tr>
            <td><a href="#" onclick="loadQuizInfo(${q.id});return false" style="font-weight:700">${q.title}</a></td>
            <td>${q.creator_pseudo}</td>
            <td>${q.category}</td>
            <td>${typeTag(q.quiz_type)}</td>
            <td>
              <span style="padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;background:${q.is_published?'#E8F5E9':'#FFF3E8'};color:${q.is_published?'#2E7D32':'#E65100'}">
                ${q.is_published ? 'Publié' : 'Brouillon'}
              </span>
              ${q.is_locked ? '<span style="padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;background:#FFF3CD;color:#856404">🔒</span>' : ''}
            </td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              ${q.is_locked ? `<button class="btn btn-green btn-sm" onclick="adminUnlock(${q.id})">🔓</button>` : ''}
              <button class="btn btn-red btn-sm" onclick="adminDelQuizConfirm(${q.id},'${q.title.replace(/'/g,"\\'")}')">Supprimer</button>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="6" class="empty">Aucun quiz trouvé</td></tr>`;
  } catch { toast('Erreur', 'err'); }
}

async function adminDelUser(id, pseudo) {
  if (!confirm(`Supprimer le compte "${pseudo}" ?`)) return;
  try {
    await api.adminDelUser(id);
    toast(`Compte "${pseudo}" supprimé`, 'ok');
    loadAdminDashboard();
    loadAdminUsers();
  } catch (e) { toast(e.message, 'err'); }
}

async function adminDelQuizConfirm(id, title) {
  if (!confirm(`Supprimer le quiz "${title}" ?`)) return;
  try {
    await api.adminDelQuiz(id);
    toast('Quiz supprimé', 'ok');
    loadAdminQuizzes();
    loadAdminDashboard();
  } catch (e) { toast(e.message, 'err'); }
}

async function resolveReport(id, status) {
  try {
    await api.adminReport(id, status);
    toast('Signalement traité', 'ok');
    loadAdminDashboard();
  } catch (e) { toast(e.message, 'err'); }
}

function switchAdminTab(tab, btn) {
  document.querySelectorAll('#pg-admin .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#pg-admin .tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('a-pane-' + tab).classList.add('active');
  if (tab === 'users')   loadAdminUsers();
  if (tab === 'quizzes') loadAdminQuizzes();
}
