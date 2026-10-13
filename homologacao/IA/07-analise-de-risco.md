# IA · 07 — Análise de risco

Escala: probabilidade e impacto em Baixo / Médio / Alto. Severidade inferida pela leitura do código, sem teste.

| Código | Risco | Tipo | Prob. | Impacto | Origem | Mitigação proposta |
|---|---|---|---|---|---|---|
| R-IA-01 | Autuação ou reclamação por enviar dados pessoais a fornecedor estrangeiro sem aviso, base legal e cláusula de transferência | Legal / dados | Média | Alto | IA-S01 | REQ-IA-01, 02 |
| R-IA-02 | Usuário toma decisão financeira com base em projeção errada (patrimônio por saldo inicial) apresentada com confiança pela IA, sem ressalva | Negócio / reputação / legal | Alta | Alto | IA-S12; RN-IA-019 | REQ-IA-03; REQ-PLN-01 |
| R-IA-03 | Insights nunca gerados (falha de privilégio ou job apontando para outro projeto) e ninguém percebe; funcionalidade vendida e inexistente | Operacional | Alta | Médio | IA-S02, S03 | REQ-IA-08 |
| R-IA-04 | Custo da API acima do previsto: limite só por número de chamadas; erros, pergunta sem tamanho máximo e usuários bloqueados não são contidos | Financeiro | Média | Médio | IA-S04, S06, S17 | REQ-IA-04, 06 |
| R-IA-05 | Modelo descontinuado ou chave inválida → Kora fora do ar para todos, sem alerta | Operacional | Baixa (12 meses) | Médio | IA-S11 | REQ-IA-09 |
| R-IA-06 | Conversa com dados financeiros vista por outra pessoa no mesmo navegador após logout | Dados | Baixa | Médio | IA-S05 | REQ-IA-05 |
| R-IA-07 | Resposta vazia ou "em breve" frustra o usuário e consome cota; percepção de produto inacabado | Negócio | Média | Baixo | IA-S07; RN-IA-013 | REQ-IA-07, 11 |
| R-IA-08 | O modelo responde a temas fora do produto (jurídico, médico, político) sem restrição no prompt | Reputação | Média | Baixo | RN-IA-013 | REQ-IA-11 (escopo no prompt) |
| R-IA-09 | Vazamento entre workspaces por erro futuro de código na função que tem `service_role` | Dados | Baixa | Alto | IA-S09 | Teste automatizado; revisão |
| R-IA-10 | Segredo do job enviado a um projeto que não é o atual (IA-S03) | Segurança | Média | Baixo | IA-S03 | Parametrizar endereço |

## Custo estimado (conferido por script `homologacao/scripts/etapa7/custo-estimado.py`)

Preços de referência do modelo usado (`claude-sonnet-5`): US$ 2 por milhão de tokens de entrada, US$ 10 por milhão de saída (tabela pública consultada em 2026-10-06; **Ponto para validar** na contratação). O código limita só o número de chamadas com sucesso (100/mês por padrão).

| Cenário por workspace (100 chamadas/mês) | Tokens de entrada | Tokens de saída | Custo/mês (US$) |
|---|---|---|---|
| Pergunta simples, sem histórico (1 rodada) | 130.000 | 30.000 | 0,56 |
| Pergunta com histórico cheio (8 mensagens) | 930.000 | 30.000 | 2,16 |
| Simulação com 2 rodadas de ferramenta | 1.060.000 | 80.000 | 2,92 |
| Pior caso: 3 rodadas, histórico cheio, resposta longa | 2.790.000 | 450.000 | 10,08 |

Conta do pior caso: 100 × 3 × 9.300 = 2.790.000 tokens × US$ 2/M = US$ 5,58; 100 × 3 × 1.500 = 450.000 tokens × US$ 10/M = US$ 4,50; total US$ 10,08. Com 50 workspaces ativos no pior caso: US$ 504/mês. Chamadas com erro e perguntas sem limite de tamanho ficam fora dessa conta. O preço da assinatura (29,90 USD/mês, ASS) cobre o pior caso; o risco está em uso fora do limite (IA-S04, S06, S17), não no uso normal.

## Dependências de outros módulos

- PLN/DSH: correção do patrimônio (REQ-PLN-01) elimina a maior parte de R-IA-02.
- BD: versionar DDL e grants (IA-S02, S15).
- ASS: a função deve respeitar o status comercial (IA-S04).
- ACS: política de privacidade e termo de uso (REQ-ACS-03) são pré-requisito de REQ-IA-01/02.
