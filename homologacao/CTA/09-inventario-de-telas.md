# CTA · 09 — Inventário de telas e situação

| Tela | Arquivo | Função | Situação (pelo código) | Observações |
|---|---|---|---|---|
| Minhas contas | `accounts.html` + `accounts.js` | listar contas, saldo, editar, excluir | Funciona; testada (1 caso) | rótulo "Saldo informado" para saldo calculado; rodapé "Development environment" |
| Nova conta | `account-new.html` + `account-new.js` | cadastrar | Funciona; testada | sem saldo negativo |
| Editar conta | `account-edit.html` + `account-edit.js` | alterar | Funciona; testada | falha provável com contas do assistente (tipo) |
| Transferências | `transfers.html` + `transfers.js` | listar | Funciona; testada | sem links de editar/excluir |
| Nova transferência | `transfer-new.html` + `transfer-new.js` | registrar | Funciona; testada (mesma moeda) | valor em campo de texto; sem proteção de duplo clique |
| Editar transferência | `transfer-edit.html` + `transfer-edit.js` | alterar | Funciona, mas sem entrada pela lista | só por URL |
| (sem tela) | — | excluir transferência | Inexistente | — |
| (sem tela) | — | extrato por conta | Inexistente. A visão "Transações" está em `dashboard-movements.html` (módulo DSH) | — |
