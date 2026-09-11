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
      'incomes.html':'incomes','income-new.html':'incomes','income-edit.html':'incomes',
      'transfers.html':'transfers','transfer-new.html':'transfers','transfer-edit.html':'transfers',
      'accounts.html':'accounts','account-new.html':'accounts','account-edit.html':'accounts',
      'investments.html':'investments','investment-new.html':'investments','investment-edit.html':'investments','investment-detail.html':'investments','investment-launches.html':'investments','investment-launch-new.html':'investments',
      'expenses.html':'expenses','expense-new.html':'expenses','expense-edit.html':'expenses',
      'planning.html':'planning','wealth-goal.html':'wealth',
      'cadastros.html':'config','settings.html':'config','investment-types.html':'config','investment-type-new.html':'config'
    };
    const activeKey = activeMap[file] || '';
    const item = (key, href, icon, label) => `<a class="nav-item${activeKey === key ? ' active' : ''}" href="${href}"><span>${icon}</span><span>${label}</span></a>`;
    const navigation = [
      item('dashboard','dashboard.html','⌂','Dashboard'),
      item('incomes','incomes.html','💵','Receitas'),
      item('transfers','transfers.html','↔','Transferências'),
      item('accounts','accounts.html','🏦','Contas'),
      item('investments','investments.html','📈','Investimentos'),
      item('expenses','expenses.html','💸','Despesas'),
      item('planning','planning.html','📅','Planejamento'),
      item('wealth','wealth-goal.html','🎯','Patrimônio &amp; Sonho'),
      item('config','cadastros.html','⚙','Configurações financeiras')
    ].join('');
    sidebars.forEach(sidebar => {
      sidebar.innerHTML = `<a class="side-brand" href="dashboard.html"><div class="mini-mark">K</div><div>KOR<span>build</span></div><span class="demo-badge">FINANCES</span></a><nav class="nav" aria-label="Navegação principal">${navigation}</nav><div class="side-bottom"></div>`;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true }); else render();
})();