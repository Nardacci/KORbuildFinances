# CTA · 08 — Plano de testes

Regras: só no ambiente de teste confirmado; só registros cujo nome começa com `TESTE`; nunca alterar ou apagar registro sem esse prefixo. Usuário: `TESTE_A` (workspace configurado). Para CT-CTA-19/20 e 26 é preciso `TESTE_B` (segundo workspace). Nomes de exemplo: `TESTE_Conta_BRL`, `TESTE_Conta_USD`, `TESTE_Conta_EUR`.

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-CTA-01 | Criar conta válida | `account-new.html`: `TESTE_Conta_BRL`, corrente, BRL, saldo 1000 | volta à lista com mensagem; saldo exibido R$ 1.000,00 | RN-CTA-001 |
| CT-CTA-02 | Nome em branco | deixar o nome vazio | impedido | RN-CTA-002 |
| CT-CTA-03 | Saldo negativo | saldo -10 | impedido ("Informe um saldo inicial válido") | RN-CTA-002 |
| CT-CTA-04 | Moeda padrão | workspace com moeda principal EUR | moeda da nova conta já vem EUR | RN-CTA-003 |
| CT-CTA-05 | Duplo clique em "Salvar conta" | clicar duas vezes rápido | uma conta só | RN-CTA-022 |
| CT-CTA-06 | Editar conta criada pelas telas | editar nome | grava; lista mostra o novo nome | RN-CTA-004 |
| CT-CTA-07 | Editar a conta criada pelo assistente | (usuário novo `TESTE_NOVO`, após o assistente) abrir "Editar" da primeira conta | **hoje esperado:** campo Tipo em branco e obrigatório. **Deve ser:** tipo preenchido | RN-CTA-021 |
| CT-CTA-08 | Trocar a moeda de conta com movimentos | conta BRL com uma receita realizada de 500; trocar a conta para USD | **deve** bloquear; **hoje** aceita (anotar o saldo mostrado) | RN-CTA-005 |
| CT-CTA-09 | Editar conta de outro workspace por URL | `TESTE_B` abre `account-edit.html?id=<conta de A>` | volta para a lista; nada exibido | RN-CTA-023 |
| CT-CTA-10 | Excluir conta sem movimentos | criar `TESTE_Conta_Vazia` e excluir | some da lista | RN-CTA-006 |
| CT-CTA-11 | Excluir conta com receita | conta com 1 receita `TESTE` | anotar: bloqueia (mensagem) ou apaga junto | RN-CTA-006 |
| CT-CTA-12 | Excluir conta com transferência | idem com transferência | idem | RN-CTA-006 |
| CT-CTA-13 | Saldo por script | criar movimentos do caso 1 de `saldo-e-cambio.py` nas contas `TESTE` | saldo da tela = 1172,00 | RN-CTA-008 |
| CT-CTA-14 | Transferência mesma moeda | origem BRL, destino BRL, 200 | destino copia 200; grava; lista mostra "origem → destino" | RN-CTA-011 |
| CT-CTA-15 | Mesma conta | origem = destino | alerta "Selecione duas contas diferentes" | RN-CTA-009 |
| CT-CTA-16 | Valor zero | 0 | alerta | RN-CTA-010 |
| CT-CTA-17 | Câmbio | origem USD 100, destino BRL 520 | taxa 5,2 exibida na lista | RN-CTA-012 |
| CT-CTA-18 | Valor com ponto | digitar `100.50` no valor que saiu | **deve** gravar 100,50; **hoje** grava 10.050 (conferir na lista) | RN-CTA-016 |
| CT-CTA-19 | Mesma conta pela API | no console da página, inserir transferência com origem = destino | **deve** ser rejeitada pelo banco; anotar o resultado | CTA-S03 |
| CT-CTA-20 | Conta de outro workspace pela API | `TESTE_B` insere transferência no workspace B com `source_account_id` de uma conta de A | **deve** ser rejeitada; anotar | CTA-S03 |
| CT-CTA-21 | Duplo clique em "Registrar transferência" | clique duplo rápido | **deve** gravar uma; anotar o que ocorre | RN-CTA-022 |
| CT-CTA-22 | Edição sem link | abrir `transfers.html` | confirmar que não há link; abrir `transfer-edit.html?id=` manualmente funciona | RN-CTA-018 |
| CT-CTA-23 | Exclusão de transferência | tentar `delete` pelo console | anotar erro de permissão | RN-CTA-018 |
| CT-CTA-24 | Moeda da transferência após trocar moeda da conta | continuação de CT-CTA-08 | anotar | RN-CTA-013 |
| CT-CTA-25 | Nome com HTML | conta `TESTE_<img src=x onerror=alert(1)>` | aparece como texto nas listas e nas listas suspensas; nada executa | CTA-S06 |
| CT-CTA-26 | Isolamento da visão | `TESTE_B` lê `account_balances` | só contas de B | RN-CTA-023 |

Testes automáticos existentes (`tests/accounts.spec.js`, `transfers.spec.js`, `security-transfer-integrity.spec.js`) não devem ser executados sem a confirmação do analista: usam o usuário do `.env` e, em transferências, tentam apagar registros sem ter privilégio (CTA-S05).
