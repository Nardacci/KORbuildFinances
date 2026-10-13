# ACS · 09 — Inventário de telas e situação

| Tela | Arquivo | Função | Situação (pelo código) | Observações |
|---|---|---|---|---|
| Entrar | `index.html` + `login.js` | login e roteamento | Funciona (teste automatizado parcial) | rodapé "Ambiente de desenvolvimento"; sem "esqueci a senha" |
| Login (redirect) | `login.html` | redireciona a `index.html` | Funciona | poderia ser removido se os links forem atualizados |
| Criar conta | `signup.html` + `signup.js` | cadastro e confirmação de e-mail | Funciona (sem teste automatizado) | nome/país descartados; termos sem link |
| Assistente inicial | `workspace.html` + `app.js` | 5 etapas e conclusão | Funciona (teste com servidor simulado) | opção "Uma vez" não entra na receita mensal |
| Revisão | `workspace.html?mode=review` | editar dados básicos | Funciona (7 testes reais) | depende de setup concluído |
| Configuração (redirect) | `settings.html` + `settings.js` | redireciona à revisão | Funciona (testado) | |
| Configurações financeiras (hub) | `cadastros.html` | links para cadastros auxiliares | Incompleta: 3 de 4 cartões "Em breve" | sem documentação |
| Administração | `finances-admin.html` | destino do admin após login | fora deste módulo (ADM) | |
| Menu lateral e botão Sair | injetados por `auth.js:65-99` | navegação | Funciona (teste de navegação) | |
