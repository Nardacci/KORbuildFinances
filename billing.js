(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const db = () => KORbuildAuth.client.schema('finances');

  function initials(n) { return String(n || 'A').trim().split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(); }

  function setupHeader(user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
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

  function setStatusCard({ cardClass, icon, eyebrow, title, message, metric, metricLabel }) {
    const card = $('status-card');
    card.className = 'status-card' + (cardClass ? ' ' + cardClass : '');
    $('status-icon').textContent = icon;
    $('status-eyebrow').textContent = eyebrow;
    $('status-title').textContent = title;
    $('status-message').textContent = message;
    $('status-days').textContent = metric;
    $('status-days-label').textContent = metricLabel;
  }

  function fmtMoney(v, currency) {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'USD' }).format(Number(v)); }
    catch { return (currency || 'USD') + ' ' + Number(v || 0).toFixed(2); }
  }

  function renderPlanPrice(price) {
    const base = price?.base_monthly_price;
    const adjustment = Number(price?.price_adjustment_percent || 0);
    const final = price?.monthly_price;
    const currency = price?.currency || 'USD';

    if (base == null) {
      $('plan-price').textContent = 'Valor a definir';
      $('plan-price-suffix').textContent = '';
      $('plan-price-note').textContent = adjustment !== 0
        ? 'Quando o preço padrão for definido, um ajuste de ' + (adjustment > 0 ? '+' : '') + adjustment + '% será aplicado ao seu workspace.'
        : 'O preço ainda não foi definido pela equipe do KORbuild Finances.';
      return;
    }

    $('plan-price').textContent = fmtMoney(final, currency);
    $('plan-price-suffix').textContent = '/ mês';
    $('plan-price-note').textContent = adjustment !== 0
      ? 'Ajuste de ' + (adjustment > 0 ? '+' : '') + adjustment + '% aplicado sobre ' + fmtMoney(base, currency) + '.'
      : '';
  }

  async function loadPlanPrice() {
    const { data, error } = await db().rpc('get_own_commercial_price');
    if (error) { console.error(error); return; }
    renderPlanPrice((data || [])[0] || {});
  }

  function updatePlanCta(status) {
    const cta = $('plan-cta');
    if (!cta) return;
    const needsPayment = status === 'GRACE_PERIOD' || status === 'BLOCKED';
    cta.classList.toggle('hidden', !needsPayment);
    cta.textContent = status === 'BLOCKED' ? 'Ver instruções de pagamento →' : 'Regularizar assinatura →';
  }

  function renderPaymentInstructions(instr) {
    $('payment-method-value').textContent = instr?.method || '—';
    $('payment-account-holder-value').textContent = instr?.account_holder || '—';
    $('payment-bank-value').textContent = instr?.bank_name || '—';
    $('payment-key-value').textContent = instr?.pix_key || '—';
    $('payment-instructions-text').textContent = instr?.instructions || '';
    $('payment-contact-value').textContent = instr?.payment_contact ? 'Confirmação: ' + instr.payment_contact : '';
  }

  async function loadPaymentSection(status) {
    const card = $('payment-card');
    const needsPayment = status === 'GRACE_PERIOD' || status === 'BLOCKED';
    if (!needsPayment) { card.classList.add('hidden'); return; }

    card.classList.remove('hidden');
    card.classList.toggle('urgent', status === 'BLOCKED');
    $('payment-card-title').textContent = status === 'BLOCKED'
      ? 'Regularize agora para restaurar o acesso'
      : 'Regularize sua assinatura';
    $('payment-card-intro').textContent = status === 'BLOCKED'
      ? 'Seu acesso está bloqueado. Use as informações abaixo para concluir o pagamento e restaurar o acesso.'
      : 'Seu teste encerrou, mas seu acesso continua por enquanto. Use as informações abaixo para regularizar antes que o acesso seja bloqueado.';

    const { data: instrRows, error: instrError } = await db().rpc('get_own_payment_instructions');
    if (instrError) { showError('Não foi possível carregar as instruções de pagamento.'); return; }
    renderPaymentInstructions((instrRows || [])[0] || {});
  }

  function renderAccess(access) {
    const status = String(access?.status || 'UNKNOWN').toUpperCase();
    const days = Math.max(0, Number(access?.days_remaining || 0));

    if (status === 'ACTIVE') {
      $('billing-subtitle').textContent = 'Seu workspace está com acesso completo.';
      setStatusCard({ cardClass: 'active', icon: '✓', eyebrow: 'ASSINATURA ATIVA', title: 'Sua assinatura está ativa', message: 'Seu workspace tem acesso completo ao KORbuild Finances.', metric: '✓', metricLabel: 'ativo' });
    } else if (status === 'TRIALING') {
      $('billing-subtitle').textContent = 'Você está no período de teste gratuito.';
      setStatusCard({ cardClass: '', icon: '✦', eyebrow: 'SEU TESTE GRATUITO DE 14 DIAS', title: 'Seu período de teste está ativo', message: 'Você tem acesso completo durante o teste.', metric: days, metricLabel: days === 1 ? 'dia restante' : 'dias restantes' });
    } else if (status === 'GRACE_PERIOD') {
      $('billing-subtitle').textContent = 'Seu teste encerrou.';
      setStatusCard({ cardClass: 'grace', icon: '!', eyebrow: 'TESTE ENCERRADO · PERÍODO DE TOLERÂNCIA', title: 'Seu teste encerrou, mas seu acesso continua por enquanto', message: 'Regularize sua assinatura para não perder o acesso.', metric: days, metricLabel: days === 1 ? 'dia restante' : 'dias restantes' });
    } else if (status === 'SUSPENDED' || status === 'CANCELLED') {
      $('billing-subtitle').textContent = 'Seu acesso está bloqueado.';
      setStatusCard({ cardClass: 'blocked', icon: '🔒', eyebrow: status === 'SUSPENDED' ? 'ASSINATURA SUSPENSA' : 'ASSINATURA CANCELADA', title: 'Seu acesso está bloqueado', message: 'Regularize sua assinatura para restaurar o acesso.', metric: '—', metricLabel: 'bloqueado' });
    } else if (status === 'BLOCKED') {
      $('billing-subtitle').textContent = 'Seu teste expirou.';
      setStatusCard({ cardClass: 'blocked', icon: '🔒', eyebrow: 'TESTE EXPIRADO', title: 'Seu acesso está bloqueado', message: 'Regularize sua assinatura para restaurar o acesso.', metric: '0', metricLabel: 'dias restantes' });
    } else if (status === 'TRIAL_DISABLED') {
      $('billing-subtitle').textContent = 'Seu workspace está liberado.';
      setStatusCard({ cardClass: 'active', icon: '✓', eyebrow: 'SEM TESTE', title: 'Seu workspace está liberado', message: 'O período de teste está desativado para este workspace.', metric: '—', metricLabel: '' });
    } else if (status === 'SETUP_REQUIRED' || status === 'NO_WORKSPACE') {
      $('billing-subtitle').textContent = 'Finalize a configuração do seu workspace.';
      setStatusCard({ cardClass: '', icon: '◷', eyebrow: 'CONFIGURAÇÃO PENDENTE', title: 'Finalize a configuração do seu workspace', message: 'Complete o assistente de configuração para continuar.', metric: '—', metricLabel: '' });
    } else {
      $('billing-subtitle').textContent = 'Não foi possível determinar o status da sua assinatura.';
      setStatusCard({ cardClass: '', icon: '?', eyebrow: 'STATUS DESCONHECIDO', title: 'Não foi possível determinar o status da sua assinatura', message: 'Atualize a página ou entre em contato com o suporte.', metric: '—', metricLabel: '' });
    }
    return status;
  }

  function showError(msg) {
    const el = $('status');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  $('plan-cta')?.addEventListener('click', () => {
    $('payment-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('copy-payment-key')?.addEventListener('click', async () => {
    const key = $('payment-key-value').textContent;
    if (!key || key === '—') return;
    try {
      await navigator.clipboard.writeText(key);
      const btn = $('copy-payment-key');
      const old = btn.textContent;
      btn.textContent = 'Copiado ✓';
      setTimeout(() => { btn.textContent = old; }, 1800);
    } catch (e) { console.error(e); }
  });

  async function load() {
    const session = await KORbuildAuth.session();
    if (!session?.user) { location.replace('index.html'); return; }

    setupHeader(session.user);

    const { data: access, error } = await db().rpc('get_workspace_access_status');
    if (error) { showError('Não foi possível carregar o status da sua assinatura.'); return; }
    const status = renderAccess(access);
    updatePlanCta(status);
    await Promise.all([loadPlanPrice(), loadPaymentSection(status)]);
  }

  load().catch(e => { console.error(e); showError('Não foi possível carregar a página de assinatura.'); });
})();
