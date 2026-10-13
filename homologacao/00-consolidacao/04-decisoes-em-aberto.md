# Consolidação · 04 — Decisões de produto

## 1. Já tomadas pelo analista (registradas no diário)

| Data | Decisão | Efeito |
|---|---|---|
| 2026-10-13 | O projeto Supabase de `supabase/config.toml` é o ambiente de **teste** | Testes só lá, com prefixo `TESTE` |
| 2026-10-13 | **Pix é uma das opções de pagamento** | REQ-ASS-11 e REQ-ADM-08 viraram P1 (fluxo de aviso e confirmação) |
| 2026-10-13 | **Valor em reais recalculado a cada renovação** | REQ-ASS-03 detalhado (rotina mensal que atualiza a assinatura no Mercado Pago) |
| 2026-10-13 | **Público no exterior consegue pagar** pelo Mercado Pago Brasil (consulta do analista) | R-ASS-11 rebaixado; CT-ASS-27 confirma no sandbox |

## 2. Em aberto, com recomendação do analista de homologação

| # | Decisão | Opções | Recomendação | Onde impacta |
|---|---|---|---|---|
| D1 | **Bloqueio comercial vale só na tela ou também na API?** | (a) só na tela, como hoje; (b) também na API: políticas consultam o status de acesso; funções de IA e exportação recusam BLOCKED | (b), ao menos para escrita e IA: sem isso a cobrança é contornável | REQ-BD-05, REQ-ACS-13, REQ-IA-04; BD-S04, ACS-S02, ASS-S15, IA-S04 |
| D2 | **Fechamento de período de investimentos**: quem fecha e como? | (a) tela para o usuário fechar/reabrir com justificativa; (b) fechamento administrativo mensal automático; (c) abandonar o conceito e tirar a evolução do patrimônio baseada em fechamentos | (b) com foto mensal automática (resolve também REQ-DSH-02) | REQ-INV-04, REQ-DSH-02; INV-S01, S04 |
| D3 | **O que é "investimentos do mês"** no dashboard, Visão gerencial e Planejamento? | aportes; aportes + ajustes; aportes − resgates | aportes − resgates (fluxo líquido), com "ajuste" fora e documentado | REQ-DSH-01, REQ-PLN-12, REQ-INV-15 |
| D4 | **Significado de "ajuste"** de investimento | ajuste de posição (quantidade/preço) ou de custo | definir como correção de posição, sem efeito em "aportes" | REQ-INV-15 |
| D5 | **Rendimento e taxa sem conta**: permitido? | exigir conta; ou perguntar "reinvestido no ativo" | perguntar explicitamente | REQ-INV-10 |
| D6 | **Taxa esperada dos investimentos**: usar como cenário ou parar de coletar | usar ("minha carteira"); remover o campo | usar como cenário adicional | REQ-PLN-07 |
| D7 | **Editar/excluir transferência** | permitir edição e exclusão; só cancelar com estorno; nada | cancelar com estorno (preserva histórico) | REQ-CTA-04 |
| D8 | **Saldo considera a data?** (receita "recebida" com data futura entra hoje?) | entra na hora; entra só na data; separar saldo atual × projetado | separar saldo atual (até hoje) e projetado | REQ-CTA-12, REQ-RDP-15 |
| D9 | **Saldo inicial negativo** para cheque especial e cartão | proibido (hoje); permitido por tipo de conta | permitir por tipo | REQ-CTA-09 |
| D10 | **Prioridade do formato numérico e do fuso** (REQ-CTA-01, 05) | P1 se há usuários na Europa/EUA; P2 se só Brasil | manter P1: o público-alvo declarado mora no exterior | REQ-CTA-01, 05 e derivados |
| D11 | **Kora visível antes do aviso de privacidade e da ressalva financeira?** | manter visível; ocultar até REQ-IA-01/02/03 | ocultar (`data-ai-assistant="off"` já existe) até publicar aviso e política | REQ-IA-01, 02, 03 |
| D12 | **Dois usuários de teste** no ambiente (o `.env.example` prevê um) | criar `TESTE_B`; testar isolamento só por SQL | criar `TESTE_B` | Plano integrado, Fase 3 |
| D13 | **Limite de IA por dinheiro** além de por chamadas | só chamadas (hoje); chamadas + tokens/custo | chamadas + tokens | REQ-IA-06 |
| D14 | **Retenção de dados** (`payment_events.raw_payload`, `ai_usage_log`) | sem prazo (hoje); 13 meses; mínimo legal | 13 meses, com anonimização | ASS-S07, IA-S13 |

## 3. Campos do briefing ainda não preenchidos

Continuam assumidos (ver `homologacao/00-reconhecimento/RECONHECIMENTO.md`, seção 8): o que está em jogo para o negócio, normas aplicáveis além da LGPD, o que fica fora do escopo. As severidades e prioridades de toda a homologação dependem dessas respostas.
