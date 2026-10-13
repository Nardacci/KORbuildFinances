# CTA · 05 — Conformidade (LGPD e boas práticas)

| Tema | Como é hoje (o que o código MOSTRA) | Avaliação | Requisito / Ponto para validar |
|---|---|---|---|
| Dados tratados | nome e tipo das contas, saldos, valores e datas de transferências, descrição livre da transferência | Dados financeiros pessoais | Constar no inventário de dados (REQ-BD-10) |
| Texto livre | descrição de transferência e nome de conta aceitam qualquer texto (podem conter nome de terceiros, ex.: "Pix para fulano") | Pode haver dado pessoal de terceiros | Orientar o usuário na tela; não usar esse texto em IA sem base legal (módulo IA) |
| Minimização | saldo inicial e nomes são necessários ao serviço | Adequado | — |
| Exclusão pelo titular | conta pode ser excluída; transferência não pode | Parcial: titular não consegue eliminar um registro seu | REQ-CTA-04 |
| Exportação (portabilidade) | não existe | Lacuna | REQ-BD-10 |
| Integridade dos dados (princípio da qualidade, LGPD art. 6º V) | erro de leitura de valor (100x) e mistura de moedas podem gerar saldos errados | Risco | REQ-CTA-01, REQ-CTA-02 |
| Trilha de auditoria | inexistente nas tabelas financeiras | Lacuna | REQ-BD-09 |
| Fuso horário | datas padrão e limites do mês calculados em UTC | Dado incorreto para parte dos titulares | REQ-CTA-05 |
