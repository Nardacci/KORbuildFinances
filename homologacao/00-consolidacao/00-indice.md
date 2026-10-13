# Consolidação da homologação — KORbuild Finances

Data: 2026-10-13. Base: os 10 pacotes em `homologacao/<módulo>/` (Etapas 1 a 7), todos por leitura de código, sem teste executado. Os números desta pasta foram extraídos por script (`homologacao/scripts/etapa8/consolidar.py`), que pode ser rodado de novo quando os pacotes mudarem.

| Arquivo | Conteúdo | Público? |
|---|---|---|
| `01-matriz-de-riscos.md` | Totais por módulo, temas transversais, riscos de impacto Alto | Sim |
| `02-plano-de-testes-integrado.md` | Os 230 casos de teste em ordem de execução, com o conjunto de dados `TESTE` compartilhado | Sim |
| `03-o-ideal-do-sistema.md` | Os 54 requisitos P1 de todos os módulos organizados em ondas de entrega | Sim |
| `04-decisoes-em-aberto.md` | Decisões de produto já tomadas e as que ainda faltam, com recomendação | Sim |
| `TOP-10-CONFIDENCIAL.md` | Os 10 itens a tratar antes de cobrar usuários, com os achados de segurança de origem | **Não publicar** |

## Totais por módulo (gerados por script)

| Módulo | Regras | Achados (Alta/Média/Baixa/Inf.) | Riscos | Requisitos (P1/P2/P3) | Casos de teste |
|---|---|---|---|---|---|
| BD | 16 | 11 (0/4/5/2) | 9 | 11 (4/5/2) | 12 |
| ACS | 31 | 13 (0/2/7/4) | 9 | 14 (2/6/6) | 25 |
| CTA | 23 | 9 (0/4/5/0) | 11 | 13 (6/4/3) | 26 |
| RDP | 30 | 9 (0/3/5/1) | 12 | 15 (7/6/2) | 29 |
| INV | 33 | 10 (1/5/3/1) | 14 | 15 (6/7/2) | 33 |
| PLN | 27 | 9 (0/4/4/0) | 12 | 14 (7/4/3) | 20 |
| DSH | 22 | 10 (1/4/4/1) | 10 | 10 (5/1/4) | 18 |
| ASS | 28 | 15 (2/6/5/2) | 11 | 14 (7/5/2) | 27 |
| ADM | 16 | 9 (0/2/4/3) | 7 | 10 (3/5/2) | 17 |
| IA | 37 | 17 (1/4/6/6) | 10 | 17 (7/6/4) | 23 |
| **Total** | **263** | **112** (5/38/48/20) | **105** | **133** (54/49/30) | **230** |

Severidades e prioridades são inferência do analista de homologação, a ajustar pelo negócio.
