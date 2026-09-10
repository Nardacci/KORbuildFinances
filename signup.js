(() => {
  'use strict';

  const form = document.getElementById('signup-form');
  const message = document.getElementById('signup-message');
  const submit = document.getElementById('signup-submit');

  if (!form || !message || !submit) return;

  function showMessage(text, type = 'error') {
    message.textContent = text || '';
    message.className = 'message ' + type;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('');

    const name = document.getElementById('name').value.trim();
    const country = document.getElementById('country').value;
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !country || !email || !password || !confirmPassword) return;
    if (password.length < 6) {
      showMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('As senhas não conferem.');
      return;
    }
    if (!document.getElementById('terms').checked) {
      showMessage('Você precisa aceitar os termos para criar a conta.');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Criando...';

    try {
      const result = await KORbuildAuth.signup(email, password);
      if (result.error) throw result.error;

      if (result.data.session) {
        window.location.href = 'workspace.html';
      } else {
        showMessage('Conta criada. Verifique seu e-mail para confirmar o acesso.', 'success');
        form.reset();
      }
    } catch (error) {
      console.error('KORbuild Finances signup failed:', error);
      showMessage(error?.message || 'Não foi possível criar sua conta.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Criar minha conta →';
    }
  });
})();
