window.KORbuildAuth = (() => {
  const SUPABASE_URL = 'https://nowbohxeqwlddbfnukva.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OTGYzEhQxckBa_8Xqu4Uog_Dm3RmTtD';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  async function session() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) return null;
    // getSession() only reads localStorage; a not-yet-expired token from a
    // deleted user would pass unnoticed. getUser() re-validates against the
    // Auth server on every call.
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData?.user) { await logout(); return null; }
    return data.session;
  }
  async function login(email, password) { return client.auth.signInWithPassword({ email, password }); }
  async function signup(email, password) {
    // O link de confirmação deve retornar ao próprio KORbuild Finances,
    // independentemente da Site URL global configurada no projeto Supabase.
    const emailRedirectTo = \`${window.location.origin}/index.html\`;
    return client.auth.signUp({ email, password, options: { emailRedirectTo } });
  }
  async function logout() {
    localStorage.removeItem('korbuild-finances-wizard-v2');
    localStorage.removeItem('korbuild-finances-onboarding-complete');
    return client.auth.signOut();
  }
  return { client, session, login, signup, logout };
})();

/* KORbuild Finances — guard de acesso comercial (BLOCKED -> billing.html) */
(function accessGuard() {
  const EXCLUDED_PAGES = ['index.html', 'signup.html', 'workspace.html', 'billing.html', 'finances-admin.html'];
  const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (EXCLUDED_PAGES.includes(file)) return;

  (async () => {
    try {
      const session = await KORbuildAuth.session();
      if (!session?.user) return; // sem sessão: cada página já cuida do redirect pro login

      const { data, error } = await KORbuildAuth.client.schema('finances').rpc('get_workspace_access_status');
      if (error) { console.error('Verificação de acesso comercial falhou:', error); return; }

      if (data?.access === 'BLOCKED') {
        window.location.replace('billing.html');
      }
    } catch (error) {
      // Fail-open de propósito: erro técnico (rede, RPC fora do ar) nunca
      // deve bloquear acesso -- só o RPC respondendo BLOCKED de verdade faz
      // isso. Mesmo espírito do fail-closed do banner (dashboard.js): lá,
      // falha = não mostrar nada; aqui, falha = não bloquear nada.
      console.error('Verificação de acesso comercial falhou:', error);
    }
  })();
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

/* KORbuild Finances — assistente AI global (FAB + painel) */
(function aiAssistant() {
  const HISTORY_KEY = 'korbuild-ai-history';
  const DISPLAY_HISTORY_LIMIT = 40; // teto do sessionStorage (exibição)
  const API_HISTORY_LIMIT = 8;      // últimas N mensagens de fato mandadas à finances-ai

  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }
  function saveHistory(history) {
    const trimmed = history.slice(-DISPLAY_HISTORY_LIMIT);
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed)); } catch {}
    return trimmed;
  }
  // Descarta uma pergunta sem resposta no fim (de uma chamada anterior que
  // falhou) antes de recortar os últimos N -- senão a API da Anthropic
  // rejeita por quebra de alternância user/assistant. O backend faz a
  // mesma checagem de forma obrigatória (sanitizeHistory em index.ts),
  // porque aquele endpoint não pode confiar no que este painel manda.
  function lastCompletePairs(history) {
    const trimmed = history.slice();
    if (trimmed.length && trimmed[trimmed.length - 1].role === 'user') trimmed.pop();
    return trimmed;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }
  // Escapa primeiro, formata depois: o texto do modelo nunca vira nome de
  // tag/atributo, só conteúdo textual entre um conjunto fixo de tags que
  // este código controla -- por isso não precisa de uma lib de sanitização.
  function markdownToHtml(raw) {
    const lines = escapeHtml(raw).split('\n');
    const out = [];
    let para = [], list = null;
    const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const flushPara = () => { if (para.length) { out.push(`<p>${para.join('<br>')}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map((li) => `<li>${li}</li>`).join('')}</${list.type}>`); list = null; } };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?[\s:-]+\|[\s:|-]*\|?\s*$/.test(lines[i + 1] || '')) {
        flushPara(); flushList();
        const header = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())));
          i++;
        }
        i--;
        out.push(`<div class="ai-md-table-wrap"><table class="ai-md-table"><thead><tr>${header.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }

      const ul = /^\s*[-*]\s+(.*)$/.exec(line), ol = /^\s*\d+\.\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        const type = ul ? 'ul' : 'ol';
        if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
        list.items.push(inline((ul || ol)[1]));
        continue;
      }

      if (line.trim() === '') { flushPara(); flushList(); continue; }
      flushList();
      para.push(inline(line));
    }
    flushPara(); flushList();
    return out.join('');
  }

  function render() {
    // Só em páginas com o shell logado (mesmo sinal que a sidebar usa) --
    // e nunca em telas marcadas como admin (ex.: data-ai-assistant="off"
    // no <body>), onde chamar a finances-ai seria no contexto errado de
    // workspace. commercial-admin.html vive num repo separado (korbuild),
    // não neste, então esse atributo precisa ser replicado lá também caso
    // aquela tela carregue este mesmo auth.js.
    if (!document.querySelector('.sidebar')) return;
    if (document.body?.dataset?.aiAssistant === 'off') return;

    document.body.insertAdjacentHTML('beforeend', `
      <button class="ai-fab" type="button" aria-label="Kora" id="ai-fab"><span>✦ AI</span></button>
      <div class="ai-panel hidden" id="ai-panel">
        <div class="ai-panel-head"><strong>Kora</strong><button type="button" id="ai-panel-close" aria-label="Fechar">✕</button></div>
        <div class="ai-panel-body" id="ai-panel-body"></div>
        <form class="ai-panel-form" id="ai-panel-form">
          <input type="text" id="ai-panel-input" placeholder="Pergunte algo..." autocomplete="off">
          <button type="submit" id="ai-panel-send" aria-label="Enviar">↑</button>
        </form>
      </div>`);

    const fab = document.getElementById('ai-fab');
    const panel = document.getElementById('ai-panel');
    const body = document.getElementById('ai-panel-body');
    const input = document.getElementById('ai-panel-input');
    const send = document.getElementById('ai-panel-send');
    let history = loadHistory();

    function bubble(role, text, tone) {
      const div = document.createElement('div');
      div.className = `ai-bubble ai-bubble-${role}${tone ? ' ai-bubble-' + tone : ''}`;
      if (role === 'user') div.textContent = text;
      else div.innerHTML = markdownToHtml(text);
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }
    history.forEach((m) => bubble(m.role, m.content));

    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) input.focus();
    });
    document.getElementById('ai-panel-close').addEventListener('click', () => panel.classList.add('hidden'));
    // Clicar fora não fecha de propósito: é um painel de consulta, não um
    // dropdown -- o usuário pode querer olhar a tela por trás enquanto
    // conversa. Fecha só pelo FAB ou pelo × explícito.
    panel.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('ai-panel-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || send.disabled) return;

      history.push({ role: 'user', content: text });
      history = saveHistory(history);
      bubble('user', text);
      input.value = '';
      input.disabled = true; send.disabled = true;
      const typing = document.createElement('div');
      typing.className = 'ai-bubble ai-bubble-assistant ai-bubble-typing';
      typing.textContent = '···';
      body.appendChild(typing); body.scrollTop = body.scrollHeight;

      const toSend = lastCompletePairs(history.slice(0, -1)).slice(-API_HISTORY_LIMIT);

      try {
        const { data, error } = await KORbuildAuth.client.functions.invoke('finances-ai', {
          body: { message: text, history: toSend },
        });
        typing.remove();
        if (error) {
          if (error.context?.status === 401) { location.replace('login.html'); return; }
          let code = 'ai_gateway_error';
          try { code = (await error.context.json())?.error || code; } catch {}
          bubble('assistant',
            code === 'ai_limit_exceeded'
              ? 'Você atingiu o limite de perguntas deste mês. Volta no próximo ciclo.'
              : 'Não consegui responder agora. Tenta de novo?',
            code === 'ai_limit_exceeded' ? 'limit' : 'error');
          return;
        }
        const answer = data?.answer || 'Não consegui responder agora. Tenta de novo?';
        history.push({ role: 'assistant', content: answer });
        history = saveHistory(history);
        bubble('assistant', answer);
      } catch {
        typing.remove();
        bubble('assistant', 'Não consegui responder agora. Tenta de novo?', 'error');
      } finally {
        input.disabled = false; send.disabled = false; input.focus();
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once:true }); else render();
})();