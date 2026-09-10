(() => {
  'use strict';

  const form = document.getElementById('login-form');
  const message = document.getElementById('login-message');
  const submit = document.getElementById('login-submit');

  if (!form || !message || !submit) return;

  function showMessage(text, type = 'error') {
    message.textContent = text || '';
    message.className = 'message ' + type;
  }

  async function resolvePostLoginRoute(user) {
    const db = KORbuildAuth.client.schema('finances');
    const { data, error } = await db
      .from('user_workspaces')
      .select('id, setup_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Finance workspace check failed:', error);
      throw new Error('Não foi possível verificar seu espaço financeiro.');
    }

    return data?.setup_completed ? 'dashboard.html' : 'workspace.html';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) return;

    submit.disabled = true;
    submit.textContent = 'Entrando...';

    try {
      const result = await KORbuildAuth.login(email, password);
      if (result.error) throw result.error;

      const destination = await resolvePostLoginRoute(result.data.user);
      window.location.href = destination;
    } catch (error) {
      console.error('KORbuild Finances login failed:', error);
      showMessage(error?.message || 'Não foi possível concluir o acesso.');
      submit.disabled = false;
      submit.textContent = 'Entrar →';
    }
  });

  (async () => {
    try {
      const session = await KORbuildAuth.session();
      if (session?.user) {
        window.location.replace(await resolvePostLoginRoute(session.user));
      }
    } catch (error) {
      console.error('Finance session check failed:', error);
    }
  })();
})();
