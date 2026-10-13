# Consolidação · TOP 10 — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Os 10 itens que, na avaliação do analista de homologação, devem ser tratados **antes de cobrar usuários**. Ordem por combinação de impacto, probabilidade e esforço de confirmação. Fonte: os 112 achados dos `SEGURANCA-CONFIDENCIAL.md` (5 Alta, 38 Média, 48 Baixa, 20 Informativa) e os 105 riscos.

| # | Item | Achados de origem | Por que primeiro | Como confirmar (teste) | Requisito |
|---|---|---|---|---|---|
| 1 | **Inadimplente não é bloqueado.** A conciliação a cada 15 min reativa a assinatura em atraso, e o webhook que marca o atraso provavelmente nunca chega | ASS-S01 (Alta), ASS-S02 (Alta) | Afeta receita diretamente; dois defeitos que se somam | CT-ASS-15, CT-ASS-20 (sandbox do Mercado Pago) | REQ-ASS-01, 02 |
| 2 | **Patrimônio pelo saldo inicial.** Dashboard, Planejamento, objetivo rápido e Kora mostram patrimônio que ignora todo movimento; conselhos e projeções saem errados, com confiança | DSH-S05 (Alta), PLN-S02 (Média), IA-S12 (Média) | Número central do produto; piora com o tempo de uso | CT-PLN-02, CT-DSH-05, CT-IA-15 | REQ-PLN-01, REQ-DSH-08, REQ-IA-12 |
| 3 | **Valor com ponto decimal lido 100x maior** em contas, transferências e despesas; e "R$" fixo para quem usa EUR/USD/GBP | CTA/RDP (ver R-CTA-01, R-RDP-02, R-RDP-03) | Público no exterior digita "1.234.56" ou "100.50"; corrompe saldos sem aviso | CT-CTA-18, CT-RDP-18, CT-RDP-19, CT-RDP-17 | REQ-CTA-01, REQ-RDP-03, 06 |
| 4 | **Dados vão para a Anthropic sem aviso, sem base legal e sem ressalva financeira**; termos e política de privacidade não existem; aceite não é registrado | IA-S01 (Alta), ACS-S09 (Média), IA-S12 (Média) | Risco legal (LGPD art. 33; CVM) e reputacional, imediato ao cobrar | Leitura (não precisa de teste) | REQ-IA-01, 02, 03; REQ-ACS-03; REQ-ASS-04 |
| 5 | **Bloqueio comercial só na tela.** Usuário BLOCKED continua lendo e gravando pela API e usando a IA | BD-S04 (Média), ACS-S02 (Média), ASS-S15 (Média), IA-S04 (Média) | A barreira que sustenta a cobrança é contornável pelo console do navegador | CT-ACS-24, CT-IA-21, T-BD-04 | REQ-BD-05 (decisão), REQ-IA-04 |
| 6 | **Período fechado e travas de integridade só na tela.** Lançamentos de mês fechado, troca de tipo/moeda e exclusão com movimentos passam pela API; fórmula da posição não está no repositório | INV-S01 (Alta), INV-S02, S03, S04, S05 (Média), CTA-S01 (Média) | O histórico de investimentos não é confiável; patrimônio e IR dependem dele | CT-INV-10, 12, 20, 25, 26, 27; CT-CTA-08 | REQ-INV-02, 03, 04, 08; REQ-CTA-02 |
| 7 | **Investimentos sem cotação valem zero** e não há como informar o preço | INV (R-INV-01), PLN-S07 (Média) | Patrimônio e planejamento subestimados para quem tem ações/fundos | CT-INV-23, CT-PLN-04 | REQ-INV-01, REQ-PLN-05 |
| 8 | **Valor em reais não mostrado antes do checkout; Pix sem fluxo**; cotação sem alerta de velhice | ASS-S04 (Média), ASS-S09 (Média); R-ADM-06 | Reclamação de consumidor (preço) e pagamento recebido sem liberação (Pix) | CT-ASS-08, CT-ASS-22, CT-ASS-23 | REQ-ASS-03, 11; REQ-ADM-08 |
| 9 | **Esquema, políticas, jobs e tabelas de pagamento fora do repositório**; job de insights apontando para outro projeto e sem privilégio de DELETE | BD-S01 (Média), ASS-S03 (Média), CTA-S03 (Média), IA-S02, S03 (Média) | Impossível auditar segurança ou reconstruir o banco; funcionalidades que "existem" mas não rodam | T-BD-01, T-BD-09, T-BD-10, CT-IA-18, CT-IA-19 | REQ-BD-01, 02; REQ-ASS-12; REQ-IA-08 |
| 10 | **Administração sem trilha nem 2FA; testes automáticos no mesmo projeto do site** | ADM-S01, ADM-S05 (Média), BD-S10 (Média) | Fraude interna ou acidente sem rastro; teste pode apagar dado real | CT-ADM-12, T-BD-06; leitura de `tests/` | REQ-ADM-01, 02; REQ-BD-03 |

## Achados Alta/Média que não entraram no Top 10 (não esquecer)

| Código | Resumo | Onde tratar |
|---|---|---|
| BD-S03 | `service_role` ignora RLS em todas as tabelas; segurança depende de cada edge function | REQ-BD-04 (checklist já feito para IA em `IA/04-permissoes.md`) |
| CTA-S04, CTA-S08, RDP-S01, RDP-S03 | UPDATE de transferência sem checar dono das contas; duplo envio; moeda da despesa; referência cruzada entre workspaces | CT-CTA-19 a 21, CT-RDP-06, 16, 24; T-BD-04 |
| RDP-S07 | Origem das categorias desconhecida | CT-RDP-01, T-BD-01 |
| INV-S06 | Tipos do sistema compartilhados e possivelmente editáveis | CT-INV-03 |
| PLN-S04, PLN-S06 | Sem teste de valor; prazo reinicia a cada dia | REQ-PLN-02, 09 |
| DSH-S01 a S04 | Falha silenciosa; bases diferentes; receitas planejadas no total; telas divergem | REQ-DSH-01, 02, 03 |
| ASS-S05, ASS-S07 | Cancelamento bloqueia na hora; dados do pagador guardados sem prazo | CT-ASS-17; REQ-ASS (retenção) |

Os 68 achados Baixa e Informativa permanecem nos pacotes de cada módulo.
