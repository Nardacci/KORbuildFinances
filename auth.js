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
      'dashboard.html':{group:'dashboard'},
      'planning.html':{group:'planning'},
      'investments.html':{group:'investments'},'investment-new.html':{group:'investments'},'investment-edit.html':{group:'investments'},'investment-detail.html':{group:'investments'},'investment-launches.html':{group:'investments'},'investment-launch-new.html':{group:'investments'},'investment-launch-edit.html':{group:'investments'},
      'expenses.html':{group:'expenses'},'expense-new.html':{group:'expenses'},'expense-edit.html':{group:'expenses'},
      'incomes.html':{group:'incomes'},'income-new.html':{group:'incomes'},'income-edit.html':{group:'incomes'},
      'accounts.html':{group:'accounts',child:'accounts'},'account-new.html':{group:'accounts',child:'accounts'},'account-edit.html':{group:'accounts',child:'accounts'},
      'transfers.html':{group:'accounts',child:'transfers'},'transfer-new.html':{group:'accounts',child:'transfers'},'transfer-edit.html':{group:'accounts',child:'transfers'},
      'dashboard-movements.html':{group:'accounts',child:'transactions'},
      'cadastros.html':{group:'config'},'settings.html':{group:'config'},'investment-types.html':{group:'config'},'investment-type-new.html':{group:'config'}
    };
    const active = activeMap[file] || {};
    const item = (key, href, icon, label) => `<a class="nav-item${active.group === key && !active.child ? ' active' : ''}" href="${href}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`;
    const subitem = (child, href, label) => `<a class="nav-subitem${active.group === 'accounts' && active.child === child ? ' active' : ''}" href="${href}">${label}</a>`;
    const accountsGroup = `<div class="nav-group${active.group === 'accounts' ? ' active' : ''}"><div class="nav-group-label"><span class="nav-icon" aria-hidden="true">♜</span><span>Contas</span></div><div class="nav-subnav">${subitem('accounts','accounts.html','Cadastro de contas')}${subitem('transfers','transfers.html','Transferências')}${subitem('transactions','dashboard-movements.html','Transações')}</div></div>`;
    const navigation = [
      item('dashboard','dashboard.html','⌂','Dashboard'),
      item('planning','planning.html','◉','Planejamento'),
      item('investments','investments.html','⌁','Investimentos'),
      item('expenses','expenses.html','↑','Despesas'),
      item('incomes','incomes.html','↓','Receitas'),
      accountsGroup,
      item('config','cadastros.html','⚙','Configurações')
    ].join('');
    sidebars.forEach(sidebar => {
      sidebar.innerHTML = `<a class="side-brand" href="dashboard.html"><span class="brand-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand-text">KORbuild<br>Finances</span></a><nav class="nav" aria-label="Navegação principal">${navigation}</nav><div class="side-bottom"><div class="side-rule"></div><small>v1.0.0</small><span>KORbuild Finances</span></div>`;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true }); else render();
})();