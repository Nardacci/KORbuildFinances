window.KORbuildAuth = (() => {
  const SUPABASE_URL = 'https://nowbohxeqwlddbfnukva.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OTGYzEhQxckBa_8Xqu4Uog_Dm3RmTtD';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  async function session() { const { data, error } = await client.auth.getSession(); if (error) throw error; return data.session; }
  async function login(email, password) { return client.auth.signInWithPassword({ email, password }); }
  async function signup(email, password) { return client.auth.signUp({ email, password }); }
  async function logout() { return client.auth.signOut(); }
  return { client, session, login, signup, logout };
})();

/* KORbuild Finances — navegação global padronizada */
(function standardizeSidebar() {
  function render() {
    const sidebars = document.querySelectorAll('.sidebar');
    if (!sidebars.length) return;
    const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const activeMap = {
      'dashboard.html':'dashboard',
      'planning.html':'planning',
      'dashboard-movements.html':'management',
      'transfers.html':'transfers','transfer-new.html':'transfers',
      'incomes.html':'incomes','income-new.html':'incomes','income-edit.html':'incomes',
      'expenses.html':'expenses','expense-new.html':'expenses','expense-edit.html':'expenses',
      'investments.html':'investments','investment-new.html':'investments','investment-edit.html':'investments','investment-detail.html':'investments','investment-launches.html':'investments','investment-launch-new.html':'investments',
      'accounts.html':'accounts','account-new.html':'accounts','account-edit.html':'accounts',
      'wealth-goal.html':'wealth',
      'cadastros.html':'config','settings.html':'config','investment-types.html':'config','investment-type-new.html':'config'
    };
    const activeKey = activeMap[file] || '';
    const item = (key, href, icon, label) => `<a class="nav-item${activeKey === key ? ' active' : ''}" href="${href}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`;
    const navigation = [
      item('dashboard','dashboard.html','⌂','Dashboard'),
      item('planning','planning.html','◉','Planejamento'),
      item('management','dashboard-movements.html','▥','Visão Gerencial'),
      item('transactions','dashboard-movements.html','↔','Transações'),
      item('incomes','incomes.html','↓','Receitas'),
      item('expenses','expenses.html','↑','Despesas'),
      item('investments','investments.html','⌁','Investimentos'),
      item('transfers','transfers.html','↔','Transferências'),
      item('accounts','accounts.html','♜','Contas'),
      item('wealth','wealth-goal.html','◔','Patrimônio &amp; Sonho'),
      item('reports','dashboard-movements.html','▤','Relatórios'),
      item('config','cadastros.html','⚙','Configurações')
    ].join('');
    sidebars.forEach(sidebar => {
      sidebar.innerHTML = `<a class="side-brand" href="dashboard.html"><span class="brand-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand-text">KORbuild<br>Finances</span></a><nav class="nav" aria-label="Navegação principal">${navigation}</nav><div class="side-bottom"><div class="side-rule"></div><small>v1.0.0</small><span>KORbuild Finances</span></div>`;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true }); else render();
})();