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

  function renderAccess(access) {
    const status = String(access?.status || 'UNKNOWN').toUpperCase();
    const days = Math.max(0, Number(access?.days_remaining || 0));
    const showContact = status === 'GRACE_PERIOD' || status === 'BLOCKED' || status === 'SUSPENDED' || status === 'CANCELLED';
    $('contact-note').classList.toggle('hidden', !showContact);

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
  }

  function showError(msg) {
    const el = $('status');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  async function load() {
    const session = await KORbuildAuth.session();
    if (!session?.user) { location.replace('index.html'); return; }

    setupHeader(session.user);

    const { data: access, error } = await db().rpc('get_workspace_access_status');
    if (error) { showError('Não foi possível carregar o status da sua assinatura.'); return; }
    renderAccess(access);
  }

  load().catch(e => { console.error(e); showError('Não foi possível carregar a página de assinatura.'); });
})();
