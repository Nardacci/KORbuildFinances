# IA · 09 — Inventário de telas

| Tela / componente | Arquivo | Onde aparece | Situação | Observação |
|---|---|---|---|---|
| Botão flutuante "✦ Kora" | `auth.js:186` | 26 páginas com `.sidebar` | Funciona (inferência) | Sem contador de perguntas restantes |
| Painel de conversa (cabeçalho, bolhas, campo "Pergunte algo...", botão ↑) | `auth.js:187-194` | idem | Funciona (inferência) | Sem aviso de privacidade; sem ressalva financeira; sem botão "limpar conversa"; sem indicação de que a resposta vem de IA externa |
| Bolha "···" (digitando) | `auth.js:234-237` | durante a chamada | Funciona | |
| Mensagem de limite | `auth.js:252` | ao receber 429 | Funciona | Não diz a data de renovação |
| Mensagem de erro genérica | `auth.js:253, 257, 263` | 502, resposta vazia, falha de rede | Funciona | Mesma frase para causas diferentes |
| Páginas sem Kora | `billing.html:14`, `finances-admin.html:14` | — | Por desenho | |
| Bloco "Consumo de IA" | `finances-admin.html` / `finances-admin.js` | painel do administrador | Analisado em ADM | Uso em UTC; alerta 80 % |
| Tela de insights para o usuário | — | — | **Não existe** | Insights só alimentam o modelo |
| Tela/aviso de consentimento de IA | — | — | **Não existe** | REQ-IA-01, 02 |
| Página de monitoramento do job | — | — | **Não existe** | REQ-IA-08 |
