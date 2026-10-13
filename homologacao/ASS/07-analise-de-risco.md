# ASS · 07 — Análise de risco

| # | Risco | Prob. | Impacto | Evidência | Mitigação |
|---|---|---|---|---|---|
| R-ASS-01 | Inadimplente mantém acesso: a conciliação reativa a assinatura em atraso a cada 15 min | Alta | Alto (receita) | ASS-S01 | REQ-ASS-01 |
| R-ASS-02 | Webhook nunca chega; status depende só da conciliação (que tem o defeito acima) e o atraso de pagamento nunca é detectado (só o webhook marca `past_due`) | Alta (relato do próprio código) | Alto | ASS-S02 | REQ-ASS-02 |
| R-ASS-03 | Reclamação do consumidor por cobrança em valor não exibido / variação cambial | Média | Médio (jurídico, reputação) | ASS-S04 | REQ-ASS-03 |
| R-ASS-04 | Usuário cancela e perde o período pago (fim do período nulo) | Média | Médio | ASS-S05 | REQ-ASS-05 |
| R-ASS-05 | Cotação desatualizada ou ausente: checkout falha ("cotação indisponível") ou cobra valor defasado | Média | Médio | ASS-S09 | REQ-ASS-06 |
| R-ASS-06 | Impossível reconstruir as tabelas de pagamento (migração ausente) | Baixa | Alto | ASS-S03 | REQ-BD-01 |
| R-ASS-07 | Dados de pagadores retidos indefinidamente em `payment_events` | Alta | Médio (LGPD) | ASS-S07 | REQ-ASS-07 |
| R-ASS-08 | Nenhum teste automatizado do ciclo comercial; regressão silenciosa | Alta | Alto | `01-reconhecimento.md` | REQ-ASS-08 |
| R-ASS-09 | Texto "14 dias" desatualizado após mudança de configuração | Média | Baixo | ASS-S13 | REQ-ASS-09 |
| R-ASS-10 | Bloqueio só na tela; usuário bloqueado continua usando a API | Média | Baixo (negócio) | ASS-S15 | REQ-BD-05 |
| R-ASS-11 | Usuário no exterior sem meio de pagamento aceito pelo Mercado Pago Brasil | A validar | Alto (conversão) | `05-conformidade.md` | Ponto para validar com o negócio |
