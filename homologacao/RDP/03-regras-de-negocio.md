# RDP · 03 — Regras de negócio

| Código | Regra | Fonte (arquivo:linha) | Situação | Observação |
|---|---|---|---|---|
| RN-RDP-001 | Receita exige descrição, categoria (texto livre), valor maior que zero, conta de recebimento e data | `income-new.js:2`; `income-edit.js:25-26` | Extraída | Navegador: valor mínimo 0,01 (`income-new.html`) |
| RN-RDP-002 | A moeda da receita deve ser a da conta de recebimento; a tela ajusta a moeda ao escolher a conta; o banco também rejeita | `income-new.js:2`; `income-edit.js:26`; `docs/security-diagnostic.md` Fase 3 | Extraída (cliente) / A confirmar no teste (banco) | A regra do banco não está no repositório |
| RN-RDP-003 | Status da receita: recebida (padrão), planejada; cancelada só na edição | `income-new.html`; `income-edit.html` | Extraída | |
| RN-RDP-004 | Só receita **recebida** aumenta o saldo da conta, e só se tiver conta; planejada e cancelada não | `20260912010000_...:141`; texto de `income-new.html` | Extraída | A data da receita não é considerada |
| RN-RDP-005 | Frequência da receita (eventual, mensal, quinzenal, semanal, anual) só descreve; não gera novas ocorrências | `income-new.html` (texto) | Extraída | |
| RN-RDP-006 | "Recebido este mês" = recebidas com data do mês corrente; várias moedas → "Múltiplas moedas" | `incomes.js:2` | Extraída | Limite do mês em UTC (RN-RDP-007) |
| RN-RDP-007 | Início e fim do mês são calculados via UTC: na Itália e Alemanha erram em todos os meses; em Portugal e Reino Unido de abril a outubro; no Brasil e nos EUA, não | `incomes.js:2`; `expenses.js:14`; script `limites-do-mes.js` | Extraída | Ex.: Itália, outubro: janela 01/10 a 31/10 (exclusivo) deixa de fora o dia 31 |
| RN-RDP-008 | Frequência vazia ou fora da lista ao editar: a tela grava o que o campo tiver (pode ser vazio) | `income-edit.js:21,27` | A confirmar no teste | Ver RN-RDP-010 |
| RN-RDP-009 | Excluir receita pede confirmação e apaga definitivamente | `income-edit.js:29` | Extraída | |
| RN-RDP-010 | A primeira receita do assistente é gravada sem conta, sem data, com frequência em português e moeda em rótulo; por isso não entra em "Recebido este mês", não afeta saldo e a edição pode abrir com frequência em branco | `20260927120000_...:91-92`; `income-edit.js:21`; `incomes.js:2` | A confirmar no teste | Inferência de efeito. `monthlyEquivalentTolerant` (`app.js:40`) existe por causa de dados nos dois formatos |
| RN-RDP-011 | A moeda é gravada em três formatos: código (`BRL`) nas telas de receita, rótulo (`USD — Dólar americano`) no assistente e na despesa (moeda principal), e código nas contas | `income-new.js:2`; `20260927120000_...:92`; `expense-new.js:5` | Extraída | Regras do banco normalizam por `upper(split_part(...))` |
| RN-RDP-012 | `receipt_day` (dia de recebimento) só é gravado pelo assistente e nunca lido por tela alguma | busca em `*.js`: única ocorrência fora do SQL é `income-new.js:2` com valor nulo | Extraída | Dado sem uso |
| RN-RDP-013 | Despesa exige descrição, valor maior que zero, categoria e data; conta é opcional | `expense-new.js:5` | Extraída | |
| RN-RDP-014 | "Já paguei": data vira data de pagamento e de previsão; "Está previsto": só data de previsão. Ao editar, a data mostrada é a de pagamento, ou a de previsão | `expense-new.js:5`; `expense-edit.js:5-6` | Extraída | |
| RN-RDP-015 | A moeda de uma despesa nova é sempre a moeda principal do workspace, mesmo que a conta escolhida seja de outra moeda; não há aviso | `expense-new.js:5` | Extraída | Contraste com receita (RN-RDP-002) |
| RN-RDP-016 | Editar despesa mantém a moeda gravada | `expense-edit.js:6` | Extraída | Mudar a moeda principal depois (revisão do assistente) não converte despesas antigas |
| RN-RDP-017 | A lista de despesas e seus totais são sempre exibidos em R$ (BRL fixo), qualquer que seja a moeda gravada | `expenses.js:7` | Extraída | Para moeda principal EUR, USD ou GBP o símbolo mostrado é errado |
| RN-RDP-018 | Totais de despesas somam os valores sem separar por moeda | `expenses.js:19-21` | Extraída | |
| RN-RDP-019 | Mês de referência da despesa = data de pagamento; se vazia, data de previsão | `expenses.js:18` | Extraída | |
| RN-RDP-020 | A categoria é obrigatória e só aceita categorias já existentes; o usuário não pode criar categorias (nem há tela) | `expense-new.js:4-5`; `20260928000000_...:13-15,23` | Extraída | Origem das categorias: **Ponto para validar** (CT-RDP-01). Se não houver categorias, o usuário não consegue registrar nenhuma despesa |
| RN-RDP-021 | "Por categoria" soma só despesas realizadas do mês, ordena da maior para a menor; sem categoria aparece como "Sem categoria" | `expenses.js:15,26-27` | Extraída | |
| RN-RDP-022 | Despesa só reduz saldo de conta se estiver realizada e tiver conta; sem conta não afeta nenhum saldo; sem checagem de moeda | `20260912010000_...:142`; `expense-new.js:5` | Extraída | Script `saldo-e-cambio.py`, caso 3 |
| RN-RDP-023 | Excluir despesa: confirmação e exclusão definitiva, na lista ou na edição | `expenses.js:29-33`; `expense-edit.js:7` | Extraída | |
| RN-RDP-024 | Fechamento de período não existe: a verificação devolve sempre "aberto" e a tela diz que o bloqueio virá depois | `expense-edit.js:4-5` | Extraída | Investimentos já têm fechamento (módulo INV) |
| RN-RDP-025 | Campo de valor da despesa é de texto: "." é removido e "," é decimal ("100.50" → 10.050) | `expense-new.js:3`; `expense-edit.js:3` | Extraída | Conferido por script (`valor-digitado.js`). A receita usa campo numérico e não tem o problema |
| RN-RDP-026 | O botão de registrar despesa não é desabilitado durante o envio; a receita desabilita | `expense-new.js:5` x `income-new.js:2` | A confirmar no teste | |
| RN-RDP-027 | Despesa de valor negativo é rejeitada pelo banco (`expenses_amount_check`) | `docs/security-diagnostic.md` Fase 3 | A confirmar no teste | Restrição fora do repositório |
| RN-RDP-028 | Tipos de despesa recorrente e parcelada existem como rótulo; não há número de parcelas nem geração de ocorrências | `expense-new.html` (texto) | Extraída | Cada registro é uma ocorrência |
| RN-RDP-029 | Insights de IA usam despesas realizadas, com categoria, na moeda principal, nos últimos 6 meses fechados | `20260914233000_ai_insights.sql:60-72` | Extraída | Detalhado no módulo IA |
| RN-RDP-030 | A data padrão do formulário é a data de hoje em UTC | `income-new.js:2`; `expense-new.js:4` | Extraída | Difere da data local (`data-padrao.js`) |
