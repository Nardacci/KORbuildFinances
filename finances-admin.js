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

  // ---- Preço padrão -------------------------------------------------------

  async function loadPricing() {
    const { data, error } = await db().rpc('get_commercial_settings');
    if (error) { showError('Não foi possível carregar o preço padrão.'); return; }
    const row = (data || [])[0] || {};
    $('pricing-monthly-price').value = row.monthly_price ?? '';
    $('pricing-currency').value = row.currency || 'USD';
  }

  $('pricing-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const raw = $('pricing-monthly-price').value;
    const { error } = await db().rpc('update_commercial_pricing', {
      p_monthly_price: raw === '' ? null : Number(raw),
      p_currency: $('pricing-currency').value
    });
    if (error) { showError('Não foi possível salvar o preço padrão.'); return; }
    await loadPricing();
  });

  // ---- Instruções de pagamento --------------------------------------------

  async function loadPaymentInstructions() {
    const { data, error } = await db().rpc('get_payment_instructions');
    if (error) { showError('Não foi possível carregar as instruções de pagamento.'); return; }
    const row = (data || [])[0] || {};
    $('payment-method').value = row.method || 'PIX';
    $('payment-account-holder').value = row.account_holder || '';
    $('payment-pix-key').value = row.pix_key || '';
    $('payment-bank-name').value = row.bank_name || '';
    $('payment-contact').value = row.payment_contact || '';
    $('payment-instructions-text').value = row.instructions || '';
  }

  $('payment-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db().rpc('update_payment_instructions', {
      p_method: $('payment-method').value,
      p_account_holder: $('payment-account-holder').value || null,
      p_pix_key: $('payment-pix-key').value || null,
      p_bank_name: $('payment-bank-name').value || null,
      p_payment_contact: $('payment-contact').value || null,
      p_instructions: $('payment-instructions-text').value || null
    });
    if (error) { showError('Não foi possível salvar as instruções de pagamento.'); return; }
    await loadPaymentInstructions();
  });

  // ---- Configuração de trial -----------------------------------------------

  async function loadTrialSettings() {
    const { data, error } = await db().rpc('get_trial_settings');
    if (error) { showError('Não foi possível carregar a configuração de trial.'); return; }
    const row = (data || [])[0] || {};
    $('trial-days').value = row.trial_days ?? '';
    $('trial-grace-days').value = row.grace_days ?? '';
  }

  $('trial-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const trialDays = Number($('trial-days').value || 0);
    const graceDays = Number($('trial-grace-days').value || 0);
    const { error } = await db().rpc('update_trial_settings', {
      p_trial_days: trialDays,
      p_grace_days: graceDays
    });
    if (error) { showError(error.message || 'Não foi possível salvar a configuração de trial.'); return; }
    await loadTrialSettings();
  });

  // ---- Ajuste de preço por workspace ---------------------------------------

  let commercialTerms = [];

  function renderTerms() {
    $('terms-list').innerHTML = commercialTerms.map(t => {
      return '<div class="admin-row terms-row" data-workspace="' + t.workspace_id + '">'
        + '<div class="workspace-name"><strong>' + escapeHtml(t.display_name || 'Workspace sem nome') + '</strong><small>' + escapeHtml(t.country || '') + '</small></div>'
        + '<label>Ajuste (%)<input class="percent-input" type="number" step="0.01" value="' + (t.price_adjustment_percent ?? 0) + '"></label>'
        + '<label>Observações<input class="notes-input" type="text" value="' + escapeHtml(t.notes || '') + '"></label>'
        + '<button class="save-btn save-term-btn" data-id="' + t.workspace_id + '">Salvar</button>'
        + '</div>';
    }).join('') || '<p class="empty-note">Nenhum workspace encontrado.</p>';

    document.querySelectorAll('.save-term-btn').forEach(b => b.onclick = () => saveTerm(b.dataset.id));
  }

  async function loadTerms() {
    const { data, error } = await db().rpc('get_workspace_commercial_terms');
    if (error) { showError('Não foi possível carregar os ajustes de preço.'); return; }
    commercialTerms = data || [];
    renderTerms();
  }

  async function saveTerm(workspaceId) {
    const row = document.querySelector('.terms-row[data-workspace="' + workspaceId + '"]');
    const percent = Number(row.querySelector('.percent-input').value || 0);
    const notes = row.querySelector('.notes-input').value || null;
    const { error } = await db().rpc('update_workspace_commercial_terms', {
      p_workspace_id: workspaceId, p_price_adjustment_percent: percent, p_notes: notes
    });
    if (error) { showError('Não foi possível salvar o ajuste de preço.'); return; }
    await loadTerms();
  }

  // ---- Controle de acesso e assinatura ------------------------------------

  let accessControl = [];

  function effectiveBadgeClass(status) {
    if (status === 'ACTIVE') return 'badge-active';
    if (status === 'TRIALING') return 'badge-trialing';
    if (status === 'GRACE_PERIOD') return 'badge-grace';
    if (status === 'BLOCKED' || status === 'SUSPENDED' || status === 'CANCELLED') return 'badge-blocked';
    return 'badge-muted';
  }

  function fmtDate(v) {
    if (!v) return '—';
    return new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function renderAccessControl() {
    $('access-list').innerHTML = accessControl.map(a => {
      const badgeClass = effectiveBadgeClass(a.effective_status);
      const canStartTrial = !a.trial_started_at && a.status === 'TRIALING';
      return '<div class="access-card" data-workspace="' + a.workspace_id + '">'
        + '<div class="access-card-head">'
        + '<div class="workspace-name"><strong>' + escapeHtml(a.display_name || 'Workspace sem nome') + '</strong><small>' + escapeHtml(a.country || '') + '</small></div>'
        + '<span class="effective-badge ' + badgeClass + '">' + escapeHtml(a.effective_status || '—') + '</span>'
        + '</div>'
        + '<div class="access-card-grid">'
        + '<label>Status<select class="status-input">'
        + ['TRIALING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].map(s => '<option value="' + s + '"' + (a.status === s ? ' selected' : '') + '>' + s + '</option>').join('')
        + '</select></label>'
        + '<label class="toggle-label"><span>Trial habilitado</span><input type="checkbox" class="trial-enabled-input" ' + (a.trial_enabled ? 'checked' : '') + '><i></i></label>'
        + '<label>Origem da ativação<select class="activation-source-input">'
        + ['', 'TRIAL', 'MANUAL', 'OTHER'].map(s => '<option value="' + s + '"' + ((a.activation_source || '') === s ? ' selected' : '') + '>' + (s || '—') + '</option>').join('')
        + '</select></label>'
        + '<label class="full-width">Motivo<input type="text" class="activation-reason-input" value="' + escapeHtml(a.activation_reason || '') + '"></label>'
        + '</div>'
        + '<div class="access-card-meta"><small>Trial: ' + fmtDate(a.trial_started_at) + ' → ' + fmtDate(a.trial_ends_at) + '</small><small>Grace até: ' + fmtDate(a.grace_ends_at) + '</small></div>'
        + '<div class="access-card-actions">'
        + (canStartTrial ? '<button class="start-trial-btn" data-id="' + a.workspace_id + '">Iniciar trial</button>' : '')
        + '<button class="save-access-btn" data-id="' + a.workspace_id + '">Salvar</button>'
        + '</div>'
        + '</div>';
    }).join('') || '<p class="empty-note">Nenhum workspace encontrado.</p>';

    document.querySelectorAll('.save-access-btn').forEach(b => b.onclick = () => saveAccessControl(b.dataset.id));
    document.querySelectorAll('.start-trial-btn').forEach(b => b.onclick = () => startTrial(b.dataset.id));
  }

  async function loadAccessControl() {
    const { data, error } = await db().rpc('get_workspace_access_control');
    if (error) { showError('Não foi possível carregar o controle de acesso.'); return; }
    accessControl = data || [];
    renderAccessControl();
  }

  async function saveAccessControl(workspaceId) {
    const card = document.querySelector('.access-card[data-workspace="' + workspaceId + '"]');
    const status = card.querySelector('.status-input').value;
    const trialEnabled = card.querySelector('.trial-enabled-input').checked;
    const activationSource = card.querySelector('.activation-source-input').value || null;
    const activationReason = card.querySelector('.activation-reason-input').value || null;
    const { error } = await db().rpc('update_workspace_access_control', {
      p_workspace_id: workspaceId, p_status: status, p_trial_enabled: trialEnabled,
      p_activation_source: activationSource, p_activation_reason: activationReason
    });
    if (error) { showError('Não foi possível salvar o controle de acesso.'); return; }
    await loadAccessControl();
  }

  async function startTrial(workspaceId) {
    const { error } = await db().rpc('admin_activate_workspace_trial', { p_workspace_id: workspaceId });
    if (error) { showError(error.message || 'Não foi possível iniciar o trial.'); return; }
    await loadAccessControl();
  }

  async function load() {
    const session = await KORbuildAuth.session();
    if (!session?.user) { location.replace('index.html'); return; }

    const { data: isAdmin, error } = await db().rpc('is_finances_admin');
    if (error || !isAdmin) { location.replace('dashboard.html'); return; }

    setupHeader(session.user);
    await Promise.all([loadWorkspaces(), loadPricing(), loadTrialSettings(), loadPaymentInstructions(), loadTerms(), loadAccessControl()]);
  }

  load().catch(e => { console.error(e); showError('Não foi possível carregar a área administrativa.'); });
})();
