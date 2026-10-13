# INV · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-INV-01 | Investimentos com preço de mercado nunca mostram valor ("Aguardando cotação" para sempre); totais ficam "Parcial", patrimônio no dashboard e no planejamento incompleto | Alta (certeza pelo código) | Alto | RN-INV-013 | REQ-INV-01 |
| R-INV-02 | Fórmula da posição errada passa despercebida (não auditável, sem testes de valor) | Média | Alto | RN-INV-011 | REQ-INV-02; CT-INV-20 |
| R-INV-03 | Histórico "fechado" alterado pela API | Média | Alto | INV-S01, S04 | REQ-INV-03 |
| R-INV-04 | Ninguém fecha período: a evolução do patrimônio do dashboard (baseada em fechamentos) fica vazia; a proteção do histórico nunca é acionada | Alta | Médio | RN-INV-027, 030 | REQ-INV-04 |
| R-INV-05 | Suíte de testes de investimentos quebrada pela coluna obrigatória nova; regressões passam sem detecção | Alta | Médio | `01-reconhecimento.md` (3 arquivos sem `expected_monthly_rate`) | REQ-INV-05; CT-INV-30 |
| R-INV-06 | Valor, quantidade e preço unitário incoerentes geram preço médio e resultado errados | Média | Médio | RN-INV-019 | REQ-INV-06 |
| R-INV-07 | Usuário com conta em GBP não consegue registrar aporte (não há investimento em GBP) | Média (Reino Unido é um dos 5 países do cadastro) | Médio | RN-INV-005, 016 | REQ-INV-07 |
| R-INV-08 | Troca de moeda/tipo ou exclusão de investimento com lançamentos pela API corrompe posição | Baixa | Alto | INV-S02, S03 | REQ-INV-08 |
| R-INV-09 | Lançamento registrado na conta errada não pode ser corrigido (edição não troca conta); usuário apaga e recria, perdendo rastro | Média | Baixo | RN-INV-022 | REQ-INV-09 |
| R-INV-10 | Rendimento ou taxa sem conta: o dinheiro "aparece" ou "some" do patrimônio sem passar por conta | Média | Médio | RN-INV-015, 020 | REQ-INV-10 |
| R-INV-11 | Tipos do sistema alterados por um usuário afetam todos | Baixa | Alto | INV-S06 | REQ-INV-11 |
| R-INV-12 | Detalhe limitado a 20 lançamentos: usuário com histórico longo não vê nem edita lançamentos antigos pelo detalhe | Média | Baixo | RN-INV-028 | REQ-INV-12 |
| R-INV-13 | Vocabulário de método de posição divergente entre formulário de tipo e tela de investimento; tipos personalizados podem ser calculados de forma diferente da esperada | Média | Médio | RN-INV-004 | REQ-INV-13 |
| R-INV-14 | Data padrão em UTC (mesmo risco das Etapas 2) | Média | Baixo | RN-INV-032 | REQ-CTA-05 |
