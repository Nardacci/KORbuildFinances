window.KORbuildAuth = (() => {
  const SUPABASE_URL = 'https://nowbohxeqwlddbfnukva.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OTGYzEhQxckBa_8Xqu4Uog_Dm3RmTtD';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  async function session() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function login(email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  async function signup(email, password) {
    return client.auth.signUp({ email, password });
  }

  async function logout() {
    return client.auth.signOut();
  }

  return { client, session, login, signup, logout };
})();
