# ACS · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura do código. Nenhum teste executado nesta etapa.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| ACS-S01 | Guarda comercial é fail-open: se a RPC falhar (rede, função fora do ar), o usuário bloqueado entra normalmente | Baixa (decisão de desenho) | `auth.js:49, 55-59` | Extraída | Registrar a decisão; considerar fail-closed com mensagem amigável |
| ACS-S02 | O bloqueio comercial existe só na tela; a API (dados) continua liberada para o usuário bloqueado | Média (negócio) | `auth.js:39-53`; nenhuma política no banco consulta assinatura | Extraída | Ver REQ-BD-05 |
| ACS-S03 | Senha mínima de 6 caracteres, sem complexidade nem verificação de senha vazada | Baixa | `signup.js:58`; `index.html:14` | Extraída | Avaliar 8+ caracteres e proteção contra senhas vazadas do Supabase Auth |
| ACS-S04 | Não há "esqueci minha senha"; usuário sem acesso depende de suporte manual | Baixa (operacional) | ausência de `resetPasswordForEmail` | Extraída | Implementar recuperação por e-mail |
| ACS-S05 | Link de confirmação de e-mail fixo em produção: contas criadas no ambiente de teste confirmam no site de produção | Baixa (teste) / Média se o ambiente de teste for separado | `auth.js:19` | Ponto para validar | Usar a origem atual quando em teste, ou variável de configuração |
| ACS-S06 | Rascunho do assistente com dados pessoais e financeiros fica no `localStorage` sem criptografia; só é limpo no logout | Baixa | `app.js:2-3, 23`; `auth.js:30` | Extraída | Limpar ao concluir; avaliar não guardar valores localmente |
| ACS-S07 | Sessão inválida: `auth.js:3-13` agora revalida no servidor e faz logout. A pendência 9 do diagnóstico de 2026-09-13 pode estar resolvida, mas o documento não foi atualizado | Informativa | `auth.js:7-11`; `docs/security-diagnostic.md`, item 9 | A confirmar no teste (CT-ACS-08) | Atualizar o diagnóstico após o teste |
| ACS-S08 | `incomeDay` e `accountCurrency` passam sem validação de faixa/lista no servidor (`1-31`; `USD/EUR/GBP/BRL`) | Baixa | `20260927120000_...sql:46, 92`; limites só em `workspace.html:9-10` | Extraída | Validar no `complete_setup` |
| ACS-S09 | Caixa "Li e concordo com os Termos de Uso e a Política de Privacidade" sem link para os documentos e sem registro do aceite (data, versão) no servidor | Média (LGPD) | `signup.html:13`; `signup.js:66-69` | Extraída | Publicar os documentos; gravar aceite com data/versão |
| ACS-S10 | Rodapé "Ambiente de desenvolvimento" nas telas públicas de login e cadastro | Informativa | `index.html:14`; `signup.html:13` | Extraída | Remover ou tornar dinâmico |
| ACS-S11 | Administrador é roteado para a tela admin, mas nada impede que abra as telas de produto; se não tiver workspace, cada tela trata à sua maneira | Informativa | `login.js:23`; `auth.js:39` exclui `finances-admin.html` da guarda | Extraída | Definir comportamento esperado |
| ACS-S12 | Mensagens de erro do Supabase Auth são mostradas sem tradução/filtro ao usuário (`error.message`), podendo revelar detalhes (ex.: "User already registered") | Baixa | `signup.js:85`; `login.js:58` | Extraída | Mapear mensagens; evitar enumerar e-mails cadastrados |
| ACS-S13 | Chave publicável duplicada em `auth.js` segundo o diagnóstico; na versão atual `auth.js:2` usa as constantes de `supabase-config.js` (duplicação removida) | Informativa | `auth.js:2`; `docs/security-diagnostic.md`, Fase 1 | Extraída | Nenhuma ação |
