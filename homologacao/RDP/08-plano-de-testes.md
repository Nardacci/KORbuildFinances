# RDP · 08 — Plano de testes

Regras: só no ambiente de teste; só registros `TESTE`; nada de alterar ou apagar registro sem o prefixo. Usuários: `TESTE_A` (workspace configurado) e `TESTE_NOVO` (recém-criado, para CT-RDP-01, 10 a 12). Contas de apoio: `TESTE_Conta_BRL`, `TESTE_Conta_USD`.

| ID | Objetivo | Passos | Resultado esperado | Regra |
|---|---|---|---|---|
| CT-RDP-01 | **Categorias de despesa existem para usuário novo?** | `TESTE_NOVO` conclui o assistente e abre `expense-new.html` | lista de categorias com itens. Se vier vazia, **bloqueio** do módulo: registrar como achado crítico | RN-RDP-020 |
| CT-RDP-02 | Receita válida | `income-new.html`: `TESTE_Receita`, categoria `TESTE`, 1000, conta BRL, hoje, recebida | grava; lista mostra; saldo da conta +1000 | RN-RDP-001, 004 |
| CT-RDP-03 | Campos obrigatórios | deixar a conta sem selecionar | "Selecione a conta de recebimento" | RN-RDP-001 |
| CT-RDP-04 | Valor zero/negativo | 0 e -5 | impedido | RN-RDP-001 |
| CT-RDP-05 | Moeda x conta | conta BRL, forçar moeda USD pela tela (alterar o campo) | "A moeda da receita deve ser igual…" | RN-RDP-002 |
| CT-RDP-06 | Moeda x conta pela API | no console, inserir receita USD em conta BRL | rejeitada pelo banco | RN-RDP-002 |
| CT-RDP-07 | Planejada não altera saldo | receita planejada 300 | saldo da conta inalterado | RN-RDP-004 |
| CT-RDP-08 | Cancelar | editar para cancelada | saldo volta; linha continua na lista | RN-RDP-004 |
| CT-RDP-09 | Excluir receita | editar → excluir → confirmar | some; saldo ajustado | RN-RDP-009 |
| CT-RDP-10 | Primeira receita do assistente na lista | `TESTE_NOVO` abre `incomes.html` | linha com data "—" e conta "—"; "Recebido este mês" não a conta | RN-RDP-010 |
| CT-RDP-11 | Editar a primeira receita | clicar "Editar" (inclusive pelo resumo do assistente) | **hoje esperado:** frequência em branco; exige conta e data. Anotar o que é gravado em `frequency` ao salvar | RN-RDP-008, 010 |
| CT-RDP-12 | Formato de moeda gravado | ler `incomes.currency` da receita do assistente e de uma receita criada pela tela | anotar os dois formatos | RN-RDP-011 |
| CT-RDP-13 | Despesa válida | `expense-new.html`: `TESTE_Despesa`, 150,00, categoria, conta BRL, paguei, hoje | grava; "Este mês" +150; saldo da conta −150 | RN-RDP-013, 022 |
| CT-RDP-14 | Despesa prevista | situação "Está previsto" | entra em "Previsto" e "Em aberto"; saldo inalterado | RN-RDP-014, 018 |
| CT-RDP-15 | Despesa sem conta | conta "Não informar" | grava; nenhum saldo muda | RN-RDP-022 |
| CT-RDP-16 | Moeda da despesa x conta | `TESTE_Conta_USD` (saldo 1000 USD) e despesa 150 | despesa gravada em moeda principal; saldo da conta USD cai para 850 sem aviso | RN-RDP-015, 022 |
| CT-RDP-17 | Símbolo da moeda | workspace com moeda principal EUR; despesa 150 | **hoje:** lista mostra "R$ 150,00"; **deve:** € | RN-RDP-017 |
| CT-RDP-18 | Valor com ponto | digitar `100.50` | **deve** gravar 100,50; **hoje** grava 10.050 | RN-RDP-025 |
| CT-RDP-19 | Valor com milhar e vírgula | `1.234,56` | 1234,56 | RN-RDP-025 |
| CT-RDP-20 | Duplo clique | clicar duas vezes em "Registrar despesa" | uma despesa; anotar o que ocorre | RN-RDP-026 |
| CT-RDP-21 | Filtros e totais | 3 despesas (realizada, prevista, cancelada) no mês; filtro Todas/Realizadas/Previstas | totais conforme RN-RDP-018 | RN-RDP-018 |
| CT-RDP-22 | Por categoria | 2 categorias | barras e valores corretos; só realizadas | RN-RDP-021 |
| CT-RDP-23 | Valores fora da lista pela API | inserir despesa com `status='xyz'` e receita com `frequency=''` | anotar se o banco aceita | RDP-S02 |
| CT-RDP-24 | Conta de outro workspace pela API | `TESTE_B` insere despesa com `account_id` de A | rejeitada | RDP-S03 |
| CT-RDP-25 | Despesa negativa pela API | `amount = -500` | rejeitada (`expenses_amount_check`) | RN-RDP-027 |
| CT-RDP-26 | Limite do mês | em fuso europeu (ajustar o fuso do computador), receitas `TESTE` nos dias 30/09, 01/10, 31/10 | **deve** somar só 01 e 31/10; anotar | RN-RDP-007 |
| CT-RDP-27 | Excluir despesa | pela lista e pela edição | confirmação; some | RN-RDP-023 |
| CT-RDP-28 | Mês antigo | editar despesa de 6 meses atrás | aceita (não há fechamento) | RN-RDP-024 |
| CT-RDP-29 | Nome com HTML | categoria/descrição `TESTE_<img src=x onerror=alert(1)>` | texto literal, nada executa | RDP-S09 |

Conferências por script já feitas: `homologacao/scripts/etapa2/` (valor digitado, limites do mês, receitas do mês, data padrão, saldo e câmbio).
