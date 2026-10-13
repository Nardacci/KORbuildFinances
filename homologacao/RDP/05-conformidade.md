# RDP · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Dados tratados | descrição, categoria, valor, data, conta, moeda de cada receita e despesa | Dados financeiros pessoais; revelam hábitos, renda e saúde (ex.: despesa médica) | Constar no inventário de dados |
| Texto livre | descrição e categoria aceitam qualquer texto, inclusive nomes de terceiros | Pode conter dado pessoal de terceiros | Orientação na tela |
| Uso por IA | a edge function `finances-ai` lê despesas e receitas (`supabase/functions/finances-ai/index.ts:336-342,426-432`) | Envio a terceiro: base legal e transparência | Avaliar no módulo IA |
| Eliminação | o titular pode excluir cada registro; não há exclusão em lote nem da conta inteira | Parcial | REQ-BD-10 |
| Exportação | inexistente | Lacuna | REQ-BD-10 |
| Qualidade do dado | moeda mostrada errada (R$ fixo), valores com ponto lidos 100x, janela do mês errada em países europeus | Risco de decisão errada com base nos dados | REQ-RDP-03, REQ-CTA-01, REQ-CTA-05 |
| Auditoria | nenhuma | Lacuna | REQ-BD-09 |
| Consentimento para tratar categorias de saúde etc. | não há distinção | Avaliar se categorias podem revelar dado sensível | Ponto para validar com o encarregado de dados |
