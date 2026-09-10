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
    const sidebars = document.querySelectorAll('.sidebar'); if (!sidebars.length) return;
    const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const configPages = new Set(['cadastros.html','investment-types.html','investment-type-new.html','settings.html']);
    const investmentPages = new Set(['investments.html','investment-new.html','investment-launches.html','investment-launch-new.html']);
    const incomePages = new Set(['incomes.html','income-new.html','income-edit.html']);
    const activeKey = file === 'dashboard.html' ? 'dashboard' : configPages.has(file) ? 'config' : file === 'accounts.html' ? 'accounts' : investmentPages.has(file) ? 'investments' : incomePages.has(file) ? 'incomes' : '';
    const item = (key, href, icon, label, disabled = false) => {
      const active = activeKey === key && !disabled; const classes = ['nav-item']; if (active) classes.push('active'); if (disabled) classes.push('disabled');
      return `<a class="${classes.join(' ')}" href="${disabled ? '#' : href}"${disabled ? ' data-coming' : ''}><span>${icon}</span><span>${label}</span></a>`;
    };
    const navigation = [
      item('dashboard','dashboard.html','⌂','Dashboard'),
      item('config','cadastros.html','▤','Configurações financeiras'),
      item('accounts','accounts.html','▣','Contas'),
      item('investments','investments.html','📈','Investimentos'),
      item('incomes','incomes.html','↗','Receitas'),
      item('', '#','🎯','Objetivos',true),
      item('', '#','⌁','Planejamento',true)
    ].join('');
    sidebars.forEach(sidebar => { sidebar.innerHTML = `<a class="side-brand" href="dashboard.html"><div class="mini-mark">K</div><div>KOR<span>build</span></div><span class="demo-badge">FINANCES</span></a><nav class="nav" aria-label="Navegação principal">${navigation}</nav><div class="side-bottom"></div>`; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true }); else render();
})();