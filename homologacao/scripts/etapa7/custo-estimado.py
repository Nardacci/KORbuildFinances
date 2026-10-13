"""Estimativa de custo mensal da Kora por workspace, em dólares, a partir dos
tokens que finances-ai registra em finances.ai_usage_log (input_tokens, output_tokens).

Preços de referência do modelo usado no código (claude-sonnet-5, geração anterior),
conforme tabela pública da Anthropic consultada em 2026-10-06:
  entrada  US$ 2,00 por 1 milhão de tokens
  saída    US$ 10,00 por 1 milhão de tokens
Ponto para validar: conferir a tabela vigente antes de usar o número em decisão.

O código não limita tokens nem dinheiro: só o NÚMERO de chamadas com sucesso
(padrão 100 por mês). Cada chamada pode ter até 3 rodadas (MAX_TOOL_ROUNDS) e
cada rodada reenvia o prompt do sistema (~700 tokens), as 4 definições de
ferramentas (~500 tokens), o histórico (até 8 × 4.000 caracteres) e a pergunta.
"""
PRECO_ENTRADA = 2.00 / 1_000_000
PRECO_SAIDA = 10.00 / 1_000_000

cenarios = [
    # nome, chamadas/mês, rodadas por chamada, tokens de entrada por rodada, tokens de saída por rodada
    ("Pergunta simples, sem histórico", 100, 1, 1_300, 300),
    ("Pergunta com histórico cheio (8 msgs)", 100, 1, 1_300 + 8 * 1_000, 300),
    ("Simulação com 2 rodadas de ferramenta", 100, 2, 1_300 + 4 * 1_000, 400),
    ("Pior caso: 3 rodadas, histórico cheio, resposta longa", 100, 3, 1_300 + 8 * 1_000, 1_500),
]
print(f"{'Cenário':55} | chamadas | entrada (tokens) | saída (tokens) | custo/mês (US$)")
for nome, chamadas, rodadas, ent, sai in cenarios:
    entrada = chamadas * rodadas * ent
    saida = chamadas * rodadas * sai
    custo = entrada * PRECO_ENTRADA + saida * PRECO_SAIDA
    print(f"{nome:55} | {chamadas:8} | {entrada:16,} | {saida:14,} | {custo:8.2f}")

print()
print("Conta do pior caso: 100 × 3 × 9.300 = 2.790.000 tokens de entrada × US$ 2/M = US$ 5,58;")
print("100 × 3 × 1.500 = 450.000 tokens de saída × US$ 10/M = US$ 4,50; total US$ 10,08 por workspace/mês.")
print("Com 50 workspaces ativos no pior caso: US$ 504/mês. Chamadas com erro (não contadas no limite) ficam fora.")
