# IA · 05 — Conformidade (LGPD e boas práticas)

Enquanto não há norma definida pelo projeto, usa-se a LGPD (Lei 13.709/2018), as orientações da ANPD sobre IA e transferência internacional, e as boas práticas OWASP para aplicações com modelos de linguagem.

## LGPD

| Princípio / artigo | Como é hoje (código) | Avaliação | Requisito |
|---|---|---|---|
| Transparência (art. 6, VI; art. 9) | O painel não diz que a pergunta vai para um fornecedor externo; não há política de privacidade no repositório | Lacuna | REQ-IA-01 |
| Base legal (art. 7) | Nenhum consentimento ou contrato cita o uso de IA | Lacuna | REQ-IA-02 |
| Transferência internacional (art. 33) | Dados enviados à API da Anthropic (fornecedor estrangeiro) a cada pergunta (`index.ts:708-714`) | Lacuna: sem cláusula, sem registro do operador | REQ-IA-02 |
| Minimização (art. 6, III) | Só vão prompt fixo, texto do usuário, até 8 mensagens, resumos de insight e resultados agregados; **não** vão e-mail, nome, identificadores, nem lançamentos individuais (`01-reconhecimento.md`, tabela "O que vai para a Anthropic") | Parcial: o texto livre é o risco (o usuário pode digitar qualquer dado) | REQ-IA-01 (orientar o usuário a não digitar dados pessoais) |
| Necessidade e finalidade | Insights calculados para **todos** os workspaces, inclusive de quem nunca abriu a Kora (`20260914233000_...:58-122`) | Ponto para validar: tratamento sem pedido do titular | REQ-IA-08 (calcular só para workspaces com uso recente ou opt-in) |
| Retenção (art. 15-16) | `ai_usage_log` sem prazo; `ai_insights` expira em 2 dias; texto das conversas não é gravado no servidor; no navegador fica até fechar a aba | Parcial | REQ-IA-05, REQ-IA-10 |
| Direitos do titular (art. 18) | Não há como o usuário ver o que foi enviado, nem pedir exclusão (não há texto gravado; só contadores) | Parcial: aceitável se documentado | REQ-IA-01 |
| Segurança (art. 46) | Token validado no servidor; leituras com RLS; tabelas de IA sem acesso direto do cliente | Adequado | — |
| Dados de terceiros | O usuário pode digitar dados de familiares; nada orienta | Lacuna | REQ-IA-01 |
| Operador (art. 39) | A Anthropic atua como operador. Os termos comerciais da API dizem, em 2026, que dados de clientes da API não são usados para treinar modelos por padrão — **Ponto para validar** nos termos vigentes na contratação | A documentar | REQ-IA-02 |

## Orientação financeira (CVM e defesa do consumidor)

| Tema | Como é hoje | Avaliação | Requisito |
|---|---|---|---|
| Ressalva "não é recomendação de investimento" | Ausente no prompt e no painel | Lacuna (IA-S12) | REQ-IA-03 |
| Exatidão dos números | Herdam o patrimônio por saldo inicial (RN-IA-019) e o divisor fixo de 6 meses (RN-IA-020) | Falha de produto compartilhada com PLN/DSH | REQ-PLN-01 |
| Clareza sobre limites do produto | O prompt manda dizer "em breve" para o que não existe (`index.ts:46-47`) | Aceitável se o produto comunicar o mesmo fora do chat | REQ-IA-11 |

## Boas práticas para aplicações com IA (OWASP LLM Top 10, resumo)

| Item | Situação | Fonte |
|---|---|---|
| Injeção de prompt | Dados do próprio usuário entram no prompt (IA-S10); sem delimitação | `index.ts:693-697` |
| Tratamento inseguro da saída | Escapa HTML antes de formatar: adequado | `auth.js:133-134` |
| Agência excessiva | Ferramentas só leem; nenhuma grava: adequado | `index.ts:498-612` |
| Negação de serviço do modelo | Limite por número de chamadas; sem limite por tokens, por minuto ou por tamanho da pergunta (IA-S06, S17) | `index.ts:665-680` |
| Vazamento de informação sensível | Só dados do próprio workspace, via RLS: adequado | `index.ts:621-625` |
| Dependência de terceiro | Modelo e SDK fixos; sem plano B; sem monitoramento (IA-S11) | `index.ts:20, 27` |
| Registro e auditoria | Tokens, latência e status por chamada; sem texto: adequado para custo, insuficiente para incidente | `index.ts:750-769` |
