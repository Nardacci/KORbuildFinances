# DSH · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Dados exibidos | resumo financeiro completo do titular (receitas, despesas, investimentos, patrimônio, objetivo) | Dados pessoais financeiros; tela principal | Inventário de dados (REQ-BD-10) |
| Exatidão (LGPD art. 6º, V) | patrimônio com saldo inicial; receitas planejadas somadas; evolução com base diferente | Informação incorreta apresentada ao titular como fato | REQ-DSH-01, 02; REQ-PLN-01 |
| Minimização de tráfego | dashboard baixa todas as receitas do workspace; Visão gerencial baixa só o mês | Parcial | REQ-DSH-05 |
| Transparência de erro | falhas silenciosas na Visão gerencial | O titular não sabe que o número está incompleto | REQ-DSH-03 |
| Dado pessoal no código | nome real de pessoa nos HTML e JS | Exposição desnecessária | REQ-PLN-11 |
| Idioma | tradução parcial (pt/en) | Usuário no exterior pode receber tela mista | REQ-DSH-07 |
| Fuso horário | mês em UTC | Erro de período na Europa | REQ-CTA-05 |
