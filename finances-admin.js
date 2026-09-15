(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const db = () => KORbuildAuth.client.schema('finances');

  let workspaces = [];

  function initials(n) { return String(n || 'A').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(); }

  function setupHeader(user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';
    $('user-name').textContent = name;
    $('user-email').textContent = user.email || '';
    $('user-avatar').textContent = initials(name);
    $('menu-full-name').textContent = name;
    $('menu-full-email').textContent = user.email || '';
    $('menu-avatar').textContent = initials(name);
    $('user-menu-btn')?.addEventListener('click', e => { e.stopPropagation(); $('user-menu')?.classList.toggle('hidden'); });
    document.addEventListener('click', () => $('user-menu')?.classList.add('hidden'));
    $('logout')?.addEventListener('click', async () => { await KORbuildAuth.logout(); location.replace('index.html'); });
  }

  function isAlert(w) {
    const used = w.used_this_month ?? 0, limit = w.monthly_request_limit;
    return limit <= 0 ? used > 0 : (used / limit) >= 0.8;
  }

  function renderSummary() {
    $('summary-workspaces').textContent = workspaces.length;
    $('summary-calls').textContent = workspaces.reduce((s, w) => s + (w.used_this_month || 0), 0);
    $('summary-alerts').textContent = workspaces.filter(isAlert).length;
  }

  function renderTable() {
    $('workspaces-list').innerHTML = workspaces.map(w => {
      const used = w.used_this_month ?? 0, limit = w.monthly_request_limit, alert = isAlert(w);
      return '<div class="admin-row" data-workspace="' + w.workspace_id + '">'
        + '<div class="workspace-name"><strong>' + escapeHtml(w.display_name || 'Workspace sem nome') + '</strong><small>' + escapeHtml(w.country || '') + '</small></div>'
        + '<label>Limite mensal<input class="limit-input" type="number" min="0" step="1" value="' + limit + '"></label>'
        + '<div class="usage' + (alert ? ' usage-alert' : '') + '"><small>Uso este mês</small><strong>' + (alert ? '⚠ ' : '') + used + ' / ' + limit + '</strong></div>'
        + '<label class="toggle-label"><span>Habilitado</span><input class="enabled-input" type="checkbox" ' + (w.enabled ? 'checked' : '') + '><i></i></label>'
        + '<button class="save-btn" data-id="' + w.workspace_id + '">Salvar</button>'
        + '</div>';
    }).join('') || '<p class="empty-note">Nenhum workspace encontrado.</p>';

    document.querySelectorAll('.save-btn').forEach(b => b.onclick = () => saveLimit(b.dataset.id));
  }

  function showError(msg) {
    const el = $('status');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  async function loadWorkspaces() {
    const { data, error } = await db().rpc('get_ai_limits');
    if (error) { showError('Não foi possível carregar o consumo de IA.'); return; }
    workspaces = data || [];
    renderSummary();
    renderTable();
  }

  async function saveLimit(workspaceId) {
    const row = document.querySelector('.admin-row[data-workspace="' + workspaceId + '"]');
    const limit = Number(row.querySelector('.limit-input').value || 0);
    const enabled = row.querySelector('.enabled-input').checked;
    const { error } = await db().rpc('update_ai_limit', {
      p_workspace_id: workspaceId, p_monthly_request_limit: limit, p_enabled: enabled
    });
    if (error) { showError('Não foi possível salvar.'); return; }
    await loadWorkspaces();
  }

  async function load() {
    const session = await KORbuildAuth.session();
    if (!session?.user) { location.replace('index.html'); return; }

    const { data: isAdmin, error } = await db().rpc('is_finances_admin');
    if (error || !isAdmin) { location.replace('dashboard.html'); return; }

    setupHeader(session.user);
    await loadWorkspaces();
  }

  load().catch(e => { console.error(e); showError('Não foi possível carregar a área administrativa.'); });
})();
