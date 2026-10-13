# Consolidação · 01 — Matriz geral de riscos

Fonte: os arquivos `07-analise-de-risco.md` de cada módulo (105 riscos). Este documento é público: cita riscos (`R-`) e requisitos (`REQ-`), nunca achados de segurança (`-S`), que ficam nos documentos confidenciais.

## 1. Temas transversais (o mesmo defeito em vários módulos)

| Tema | O que acontece | Módulos | Riscos | Requisito que resolve |
|---|---|---|---|---|
| T1 Patrimônio pelo saldo inicial | "Patrimônio atual" soma o saldo **inicial** das contas, ignorando receitas, despesas e transferências; o número alimenta dashboard, planejamento, objetivo rápido e a IA | PLN, DSH, IA | R-PLN-01, R-DSH-01, R-IA-02 | REQ-PLN-01 (+ REQ-DSH-08, REQ-IA-12) |
| T2 Valor digitado com ponto | "100.50" vira 10.050 em contas, transferências e despesas | CTA, RDP | R-CTA-01, R-RDP-03 | REQ-CTA-01, REQ-RDP-06 |
| T3 Mês e data em UTC | Limites de mês e data padrão calculados em UTC: usuários na Europa veem o dia 1 começar às 1h/2h, e o último dia do mês cair no mês seguinte | CTA, RDP, PLN, DSH, IA, ADM | R-CTA-09, R-RDP-04, R-INV-14, R-PLN-12, R-DSH-07 | REQ-CTA-05 (+ REQ-RDP-07, REQ-PLN-13, REQ-DSH-10) |
| T4 Vocabulário duplo | Moeda como "BRL — Real" num lugar e "BRL" noutro; frequência em português e em inglês; tipo de conta diferente entre assistente e tela | ACS, CTA, RDP, INV | R-CTA-05, R-RDP-05, R-RDP-12, R-INV-13, R-ADM-05 | REQ-CTA-06, REQ-RDP-04 |
| T5 Barreiras só na tela | Bloqueio comercial, período fechado, troca de moeda/tipo, exclusão com movimentos: a tela impede, a API permite | ACS, CTA, INV, ASS, IA, BD | R-INV-03, R-INV-08, R-CTA-04, R-BD-06 | REQ-CTA-02, REQ-INV-03, REQ-INV-08, REQ-BD-05, REQ-IA-04 |
| T6 Esquema não versionado | Tabelas, visões, políticas, funções e jobs criados fora do repositório; impossível auditar ou reconstruir | BD, CTA, INV, ASS, IA | R-BD-01, R-BD-02, R-INV-02, R-ASS-06 | REQ-BD-01, REQ-BD-02, REQ-INV-02, REQ-ASS-12 |
| T7 Ciclo comercial frágil | Conciliação reativa inadimplente; webhook provavelmente não chega; valor em reais não mostrado; Pix sem fluxo | ASS, ADM | R-ASS-01, R-ASS-02, R-ASS-08, R-ADM-06 | REQ-ASS-01, 02, 03, 11; REQ-ADM-08 |
| T8 Sem testes de valor | Nenhum teste automático confere um número (posição, patrimônio, projeção, preço); regressões passam em silêncio | INV, PLN, DSH, ASS, IA | R-INV-02, R-PLN-08, R-ASS-08 | REQ-PLN-09, REQ-INV-05, REQ-ASS-08, REQ-IA-15 |
| T9 Legal e privacidade | Termos e política inexistentes; aceite sem registro; dados enviados a fornecedor estrangeiro de IA sem aviso; sem ressalva financeira | ACS, ASS, IA | R-ACS-03, R-IA-01, R-IA-02 | REQ-ACS-03, REQ-ASS-04, REQ-IA-01, 02, 03 |
| T10 Cotação e moeda | Investimentos sem cotação valem zero; só a moeda principal entra nos cálculos; PTAX sem alerta de cotação velha | INV, PLN, ASS | R-INV-01, R-PLN-04, R-PLN-05 | REQ-INV-01, REQ-PLN-05 |

## 2. Riscos com impacto Alto (34 de 105), por probabilidade

### Probabilidade Alta e impacto Alto (tratar primeiro)

| Código | Risco |
|---|---|
| R-CTA-01 | Valor com ponto decimal lido 100 vezes maior; saldos e patrimônio errados |
| R-RDP-02 | Despesas exibidas com "R$" para usuários com moeda principal em EUR, USD ou GBP |
| R-RDP-03 | Despesa digitada com ponto decimal vira 100x maior |
| R-INV-01 | Investimentos com preço de mercado nunca mostram valor ("Aguardando cotação" para sempre) |
| R-PLN-01 | Patrimônio atual errado (saldo inicial): progresso, falta, cenários e conselhos incorretos |
| R-PLN-02 | Prazo "reinicia" a cada dia; dashboard e Planejamento divergem |
| R-PLN-04 | Renda em moeda diferente da meta → capacidade zero e conselho de "atenção" |
| R-PLN-05 | Investimentos sem cotação entram como zero no patrimônio |
| R-DSH-01 | Tela principal mostra patrimônio e progresso errados |
| R-ASS-01 | Inadimplente mantém acesso (conciliação reativa a cada 15 min) |
| R-ASS-02 | Webhook nunca chega; atraso de pagamento nunca é detectado |
| R-ASS-08 | Nenhum teste do ciclo comercial |
| R-ADM-06 | Pix sem fluxo de aviso e confirmação: cliente paga e ninguém libera |
| R-IA-02 | IA apresenta projeção errada com confiança e sem ressalva |

### Probabilidade Média e impacto Alto

| Código | Risco |
|---|---|
| R-BD-02 | Política de RLS incorreta passa despercebida (sem revisão por código) |
| R-ACS-03 | Questionamento legal por aceite de termos sem documento nem registro |
| R-CTA-08 | Exclusão de conta com movimentos apaga ou deixa registros órfãos sem aviso |
| R-INV-02 | Fórmula da posição errada passa despercebida |
| R-INV-03 | Histórico "fechado" alterado pela API |
| R-PLN-08 | Regressão silenciosa em cálculo |
| R-DSH-05 | Falha silenciosa mostra totais parciais como completos |
| R-IA-01 | Autuação por enviar dados pessoais a fornecedor estrangeiro sem base legal |

### Probabilidade Baixa (ou não avaliada) e impacto Alto

| Código | Risco |
|---|---|
| R-BD-01 | Perda do banco sem conseguir reconstruir estrutura e políticas |
| R-BD-04 | Edge function com chave de servidor expor dados de outro workspace |
| R-BD-07 | Teste automático apagar dados que não sejam de teste |
| R-CTA-04 | Troca de moeda de conta com movimentos deixa saldo sem sentido |
| R-RDP-01 | Usuário novo não consegue registrar despesa (sem categoria) — probabilidade a confirmar em CT-RDP-01 |
| R-INV-08 | Troca de moeda/tipo ou exclusão de investimento com lançamentos pela API corrompe posição |
| R-INV-11 | Tipos do sistema alterados por um usuário afetam todos |
| R-ASS-06 | Impossível reconstruir as tabelas de pagamento |
| R-ASS-11 | Usuário no exterior sem meio de pagamento (rebaixado pela resposta do analista; CT-ASS-27) |
| R-ADM-01 | Erro ou abuso administrativo sem rastro |
| R-ADM-02 | Conta de admin comprometida sem 2FA |
| R-IA-09 | Vazamento entre workspaces por erro futuro na função com chave de servidor |

## 3. Leitura geral

- **O produto calcula errado o seu número central.** O patrimônio (T1), a leitura de valores (T2) e a cotação ausente (T10) fazem dashboard, planejamento e IA mostrarem números incorretos para parte dos usuários, sobretudo os que moram fora do Brasil (público-alvo).
- **A receita não está protegida.** O ciclo de cobrança (T7) tem dois defeitos que, juntos, impedem detectar inadimplência; e o Pix, agora opção oficial, não tem fluxo.
- **As barreiras existem só na tela** (T5): quem usa a API diretamente contorna bloqueio comercial, período fechado e travas de integridade.
- **Nada disso é auditável nem testado** (T6, T8): esquema fora do repositório e testes que não conferem valores.
- **Risco legal** (T9): termos, privacidade e IA sem base documental.

Os 71 riscos restantes (impacto Médio ou Baixo) estão nos pacotes de cada módulo.
