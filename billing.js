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
    cta.textContent = needsPayment ? 'Assinar com Mercado Pago →' : '';
  }

  async function startMercadoPagoCheckout() {
    const btn = $('mp-checkout-btn');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Preparando pagamento…';
    $('payment-status-text').textContent = '';

    try {
      const { data, error } = await KORbuildAuth.client.functions.invoke('mp-create-subscription', {
        body: {},
      });

      if (error || !data?.init_point) {
        let code = data?.error || 'checkout_failed';
        try {
          if (!data?.error && error?.context) {
            const body = await error.context.json();
            code = body?.error || code;
          }
        } catch {}

        const messages = {
          price_not_configured: 'O valor da assinatura ainda não foi configurado para pagamento em BRL.',
          exchange_rate_not_available: 'A cotação para conversão em BRL não está disponível no momento. Tente novamente mais tarde.',
          already_subscribed: 'Já existe uma assinatura ativa ou em atraso para este workspace.',
          workspace_not_found: 'Não foi possível localizar o workspace desta conta.',
          unauthorized: 'Sua sessão expirou. Entre novamente.',
        };
        throw new Error(messages[code] || 'Não foi possível iniciar o pagamento agora.');
      }

      window.location.href = data.init_point;
    } catch (error) {
      console.error('Mercado Pago checkout:', error);
      $('payment-status-text').textContent = error.message || 'Não foi possível iniciar o pagamento agora.';
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  function renderPaymentSection(status) {
    const card = $('payment-card');
    const needsPayment = status === 'GRACE_PERIOD' || status === 'BLOCKED';
    if (!needsPayment) { card.classList.add('hidden'); return; }

    card.classList.remove('hidden');
    card.classList.toggle('urgent', status === 'BLOCKED');
    $('payment-card-title').textContent = status === 'BLOCKED'
      ? 'Regularize agora com Mercado Pago'
      : 'Regularize sua assinatura';
    $('payment-card-intro').textContent = status === 'BLOCKED'
      ? 'Seu acesso está bloqueado. Inicie a assinatura para seguir para o checkout seguro do Mercado Pago.'
      : 'Seu teste encerrou. Inicie a assinatura para seguir para o checkout seguro do Mercado Pago.';
    $('payment-status-text').textContent = '';
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

  $('mp-checkout-btn')?.addEventListener('click', startMercadoPagoCheckout);

  async function load() {
    const session = await KORbuildAuth.session();
    if (!session?.user) { location.replace('index.html'); return; }

    setupHeader(session.user);

    const { data: access, error } = await db().rpc('get_workspace_access_status');
    if (error) { showError('Não foi possível carregar o status da sua assinatura.'); return; }
    const status = renderAccess(access);
    updatePlanCta(status);
    await Promise.all([loadPlanPrice(), renderPaymentSection(status)]);
  }

  load().catch(e => { console.error(e); showError('Não foi possível carregar a página de assinatura.'); });
})();
