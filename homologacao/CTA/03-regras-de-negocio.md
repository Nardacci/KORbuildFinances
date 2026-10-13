# CTA · 03 — Regras de negócio

Situação: `Extraída` (lida no código), `A confirmar no teste`, `Validada`.

| Código | Regra | Fonte (arquivo:linha) | Situação | Observação |
|---|---|---|---|---|
| RN-CTA-001 | Conta tem nome, tipo (corrente, poupança, investimento, digital, outro), moeda (BRL, USD, EUR, GBP) e saldo inicial | `account-new.html` (campos); `account-new.js:9` | Extraída | Sem limite de tamanho do nome no navegador |
| RN-CTA-002 | Nome obrigatório e saldo inicial numérico e maior ou igual a zero | `account-new.js:9`; `account-edit.js:12` | Extraída | Não permite saldo inicial negativo (cheque especial, cartão): ver REQ-CTA-09 |
| RN-CTA-003 | Na nova conta, a moeda vem preenchida com a moeda principal do workspace, se for uma das 4 | `account-new.js:8` | Extraída | |
| RN-CTA-004 | Editar conta altera nome, tipo, moeda e saldo inicial; a busca e a gravação filtram por id e workspace; se nada for atualizado, mostra "Conta não encontrada ou sem permissão para alteração" | `account-edit.js:11-12` | Extraída | |
| RN-CTA-005 | Não há trava ao trocar a moeda de uma conta que já tem movimentos | `account-edit.js:12` (ausência) | A confirmar no teste | Receitas, despesas e transferências guardam a moeda própria; o saldo soma sem converter (RN-CTA-008) |
| RN-CTA-006 | Excluir conta pede confirmação, apaga diretamente e mostra o texto de erro do banco se falhar | `accounts.js:2` | Extraída | Efeito sobre movimentos ligados: **Ponto para validar** |
| RN-CTA-007 | A coluna da lista é rotulada "Saldo informado" mas mostra o saldo atual calculado | `accounts.html:15` (cabeçalho); `accounts.js:2` (`current_balance`) | Extraída | Rótulo enganoso: o saldo inicial é o "informado" |
| RN-CTA-008 | Saldo atual = saldo inicial + receitas realizadas − despesas realizadas − saídas de transferência + entradas de transferência ± movimentos de investimento ligados à conta; sem conversão de moeda e sem olhar a data | `20260912010000_...:139-148` | Extraída | Conta conferida por script (caso 1 = 1172,00). Despesa em outra moeda é subtraída pelo número (caso 3) |
| RN-CTA-009 | Origem e destino devem ser contas diferentes | `transfer-new.js:7`; `transfer-edit.js:9` | Extraída | Só no navegador; no banco: **Ponto para validar** (`validate_transfer_accounts`) |
| RN-CTA-010 | Valor que saiu e valor que entrou devem ser maiores que zero | `transfer-new.js:7` | Extraída | Só no navegador |
| RN-CTA-011 | Contas na mesma moeda: valor que entrou = valor que saiu; a tela copia sozinha; o banco rejeita se forem diferentes | `transfer-new.js:5-7`; `20260913120000_...:13-18` | Extraída | Comparação tolera "BRL" e "BRL — Real brasileiro" |
| RN-CTA-012 | Moedas diferentes: usuário digita o valor que entrou; taxa = valor que entrou ÷ valor que saiu, gravada em `fx_rate` | `transfer-new.js:7` | Extraída | Taxa não é conferida com a cotação oficial; 520 ÷ 100 = 5,2 (script, caso 2) |
| RN-CTA-013 | A moeda da transferência (origem e destino) é copiada das contas no momento do registro | `transfer-new.js:7` | Extraída | Se a conta mudar de moeda depois, a transferência antiga não acompanha |
| RN-CTA-014 | Data obrigatória; padrão = hoje em UTC; sem bloqueio de data futura nem de data muito antiga | `transfer-new.js:5` | Extraída | UTC difere da data local à noite nas Américas e de madrugada na Europa (`scripts/etapa2/data-padrao.js`) |
| RN-CTA-015 | Descrição é opcional; sem descrição a lista mostra "Transferência entre contas" | `transfer-new.js:7`; `transfers.js:8` | Extraída | |
| RN-CTA-016 | Campos de valor das transferências são de texto: o ponto é tratado como separador de milhar e removido; a vírgula é o decimal. "100.50" vira 10.050 e "1,234.56" vira 1,23456 | `transfer-new.js:3`; `transfer-edit.js:3` | Extraída | Conferido por script (`valor-digitado.js`). Afeta quem digita no padrão americano ou britânico |
| RN-CTA-017 | Transferência não é receita nem despesa | `transfers.html` (texto); RN-CTA-008 | Extraída | |
| RN-CTA-018 | A tela de edição de transferência existe, mas a lista não tem link para ela; não há tela nem privilégio de exclusão | `transfers.js:8`; `20260928020000_...:29-32,41` | Extraída | Quem registra errado não consegue apagar |
| RN-CTA-019 | Editar transferência pode trocar contas, valores, datas e descrição e recalcula a taxa | `transfer-edit.js:9` | Extraída | Segue as mesmas validações do registro |
| RN-CTA-020 | A lista mostra total de transferências e quantas são "deste mês", por data em UTC | `transfers.js:8` | Extraída | Pode errar na virada do mês |
| RN-CTA-021 | O assistente grava o tipo da conta como texto de tela ("Conta corrente", "Dinheiro em espécie") e as telas de conta usam códigos (corrente, poupanca…); ao editar uma conta criada pelo assistente o campo "Tipo" fica em branco e é obrigatório | `workspace.html:9`; `20260927120000_...:88-89`; `account-edit.js:11` | A confirmar no teste | Inferência de efeito: um `select` com valor sem opção correspondente fica vazio. Afeta a primeira conta de todo usuário |
| RN-CTA-022 | O botão de registrar transferência não é desabilitado durante o envio; duplo clique pode gravar duas vezes | `transfer-new.js:7` | A confirmar no teste | Em contraste, nova conta desabilita o botão (`account-new.js:9`) |
| RN-CTA-023 | Todas as consultas das telas filtram por workspace; a proteção real é a RLS do banco | `transfers.js:8`; `account-edit.js:11` | Extraída | Isolamento já testado em 2026-09-13 (`docs/security-diagnostic.md`) |
