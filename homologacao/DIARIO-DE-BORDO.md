# Diário de bordo — KORbuild Finances

Entrada mais nova no topo. Formato de cada entrada: data, chat/etapa, feito, resultado, parou em, próximo passo, o que revisar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 2: módulos CTA e RDP

**Feito**
- Leitura integral dos 12 arquivos JS e das 12 telas HTML (campos, opções e textos extraídos por script) de contas, transferências, receitas e despesas, mais os 6 testes automáticos relacionados.
- Pacotes completos de **CTA** (`homologacao/CTA/`) e **RDP** (`homologacao/RDP/`), 11 arquivos cada, no formato do `CLAUDE.md`, seção 4.
- 5 conferências por script em `homologacao/scripts/etapa2/` (valor digitado, limites do mês, receitas do mês, data padrão, saldo e câmbio), rodadas em 7 fusos horários.

**Resultado (principais achados; detalhes nos pacotes)**
- CTA: 23 regras; 6 fluxos; 9 achados de segurança; 26 casos de teste; 13 requisitos. RDP: 30 regras; 6 fluxos; 9 achados de segurança; 29 casos de teste; 15 requisitos.
- **Valor digitado com ponto é lido 100 vezes maior** em transferências e despesas (campos de texto): "100.50" vira 10.050 (RN-CTA-016, RN-RDP-025). A receita usa campo numérico e não tem o problema.
- **Limites de "este mês" erram na Europa**: Itália e Alemanha em todos os 12 meses; Portugal e Reino Unido de abril a outubro; Brasil e EUA não. Exemplo com a conta: em outubro na Itália, "Recebido este mês" soma 200 em vez de 500 (RN-RDP-007). O mesmo padrão aparece em 10 arquivos, inclusive dashboard e planejamento (tratar nas Etapas 4 e 5).
- **Despesas aparecem sempre em R$**, qualquer que seja a moeda principal (RN-RDP-017), e a despesa nunca usa a moeda da conta (RN-RDP-015, RN-RDP-022).
- **Ponto crítico a validar primeiro**: não há tela nem código que crie categorias de despesa, e a categoria é obrigatória (RN-RDP-020). Se um usuário novo não receber categorias de algum lugar fora do repositório, ele não consegue registrar nenhuma despesa (CT-RDP-01).
- **Primeira conta e primeira receita criadas pelo assistente** usam outro vocabulário (tipo da conta, frequência, formato da moeda) e a receita nasce sem conta e sem data. Efeito provável: o campo "Tipo" fica em branco ao editar a conta e a receita some de "Recebido este mês" (RN-CTA-021, RN-RDP-010). A confirmar no teste.
- Transferência: a tela de edição existe sem link, não há exclusão (e o privilégio de exclusão não foi concedido), e não há proteção contra duplo clique (RN-CTA-018, RN-CTA-022).
- Saldo da conta: fórmula conferida (exemplo = 1.172,00); soma sem converter moeda e sem considerar a data (RN-CTA-008).

**Parou em**
- Fim da Etapa 2, sem execução de testes (apenas planejados). Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 3: módulo INV (tipos de investimento, investimentos, lançamentos, fechamentos e posições). É o maior módulo (9 telas) e traz o fechamento de período. Antes, se o analista puder: executar CT-RDP-01 (categorias do usuário novo) e T-BD-01 (inventário real do esquema), que fecham os pontos críticos das Etapas 1 e 2.

**O que revisar**
- Severidades e prioridades são inferência; ajustar conforme o negócio. Em especial a prioridade P1 de REQ-CTA-01 (formato de número) e REQ-CTA-05 (fuso): dependem de quantos usuários estão na Europa e nos EUA.
- Decisões de produto abertas: exclusão de transferência (REQ-CTA-04), saldo considerar data (REQ-CTA-12, REQ-RDP-15), saldo inicial negativo (REQ-CTA-09).
- `homologacao/CTA/SEGURANCA-CONFIDENCIAL.md` e `homologacao/RDP/SEGURANCA-CONFIDENCIAL.md`: não publicar.

---

## 2026-10-13 — Chat 1 (continuação) — Etapa 1: módulos BD e ACS

**Feito**
- Leitura integral de: `auth.js`, `login.js`, `signup.js`, `settings.js`, `app.js`, `index.html`, `login.html`, `signup.html`, `settings.html`, `workspace.html`, as 30 migrações SQL, os testes `login`, `onboarding`, `workspace-review`, `navigation` e os helpers.
- Pacote completo do módulo **BD** (`homologacao/BD/`, 11 arquivos) e do módulo **ACS** (`homologacao/ACS/`, 11 arquivos), no formato do `CLAUDE.md`, seção 4.
- Cálculos do assistente (data estimada, receita mensal equivalente, aviso de aporte) conferidos por script com casos de exemplo; resultados em `homologacao/ACS/08-plano-de-testes.md`.

**Resultado (principais achados; detalhes nos pacotes)**
- BD: 16 regras extraídas; esquema (27 tabelas, 63 políticas) continua fora do repositório; 11 achados de segurança no documento confidencial, dos quais o mais relevante para o negócio é que o bloqueio comercial existe só na tela, não no banco (BD-S04). 12 testes propostos (consultas e tentativas de acesso, só leitura).
- ACS: 31 regras extraídas; 6 fluxos descritos com fluxogramas; 13 achados de segurança (destaques: termos de uso sem link nem registro de aceite, ACS-S09; sem "esqueci minha senha", ACS-S04; nome e país do cadastro descartados, RN-ACS-004; link de confirmação fixo em produção, ACS-S05). 25 casos de teste com dados `TESTE`. 14 requisitos em "O ideal".
- Pontos para validar que dependem do analista: (a) política de senha e confirmação de e-mail no projeto de teste; (b) quais são as 2 tabelas que o código não cita (27 declaradas vs. 25 identificadas); (c) se a 1ª receita criada no assistente deveria ficar vinculada à 1ª conta (hoje não fica, RN-ACS-022); (d) ambiente de teste: segundo usuário `TESTE` para os testes de isolamento.

**Parou em**
- Fim da Etapa 1, sem execução de testes (apenas planejados). Nenhum arquivo do sistema foi alterado.

**Próximo passo (proposta)**
- Etapa 2: módulos CTA (contas e transferências) e RDP (receitas e despesas). Antes, se o analista quiser, executar T-BD-01 (inventário real do esquema) no projeto de teste, pois ele resolve vários "Pontos para validar" de uma vez e alimenta os modelos de dados das próximas etapas.

**O que revisar**
- Severidades e prioridades (P1/P2/P3) são inferência do analista de homologação; ajustar conforme a visão do negócio.
- `homologacao/BD/SEGURANCA-CONFIDENCIAL.md` e `homologacao/ACS/SEGURANCA-CONFIDENCIAL.md`: não publicar.
- Campos não preenchidos do briefing continuam assumidos (ver `homologacao/00-reconhecimento/RECONHECIMENTO.md`, seção 8).

---

## 2026-10-13 — Chat 1 — Etapa 0: reconhecimento do material

**Feito**
- Leitura deste repositório (`Nardacci/KORbuildFinances`, branch `main`, último commit 2026-09-28).
- Inventário por script: tipos de arquivo, telas, JS por tela, tabelas e RPCs usados por arquivo, objetos das migrações, edge functions, integrações externas, testes, histórico git.
- Leitura dos dois documentos existentes em `docs/` (diagnóstico de segurança de 2026-09-13 e baseline de migrações de produção de 2026-09-24).
- Criados `CLAUDE.md` (regras do projeto) e `homologacao/00-reconhecimento/RECONHECIMENTO.md` (tabelas do reconhecimento) e `inventario.sh` (script reproduzível).

**Resultado (resumo; detalhes em `homologacao/00-reconhecimento/RECONHECIMENTO.md`)**
- Sistema real em produção: site estático + Supabase (esquema `finances`), 33 telas HTML, 8 edge functions, 30 migrações, cobrança por Mercado Pago, cotação PTAX do Banco Central, assistente de IA (Anthropic).
- 10 módulos propostos: ACS, CTA, RDP, INV, PLN, DSH, ASS, ADM, IA, BD (siglas no `CLAUDE.md`, seção 6).
- Lacunas principais: README desatualizado (ainda descreve protótipo); esquema do banco (27 tabelas, 63 políticas de acesso) não está no repositório; nenhum documento de regras, fluxos, permissões ou modelo de dados; cálculos de planejamento e conversão de moeda sem memória de cálculo; parte do código está minificada no repositório.
- Risco operacional para este trabalho: os testes automáticos apontam para o mesmo projeto Supabase de produção e criam registros `TESTE_E2E_`. Não rodar até confirmar ambiente de teste.
- Duas pendências de segurança (severidade média) continuam abertas desde 2026-09-13 (políticas de acesso não versionadas; sessão inválida não força novo login).

**Decisões do analista (mesmo dia, após a entrega)**
- Ordem das etapas aprovada ("sim").
- Ambiente de teste: o projeto Supabase de `supabase/config.toml`. Registrado no `CLAUDE.md`, seção 2, com o ponto para validar (o baseline o chama de produção).

**Parou em**
- Fim da Etapa 0, aprovada. Etapa 1 (BD + ACS) iniciada em seguida no mesmo chat.
- `CLAUDE.md` e `homologacao/` foram gravados primeiro por engano no repositório KORbuildMatch; a pedido do analista, movidos para a raiz deste repositório (KORbuildFinances) e removidos do Match no mesmo dia.

**Próximo passo (ordem aprovada em 2026-10-13)**
1. Etapa 1: módulo BD + ACS (banco, perfis de acesso, login, cadastro, assistente inicial), porque tudo depende deles. Inclui confirmar ambiente de teste e qual projeto Supabase é qual.
2. Etapa 2: CTA (contas e transferências) e RDP (receitas e despesas): base dos saldos.
3. Etapa 3: INV (investimentos, lançamentos, fechamentos, posições).
4. Etapa 4: PLN (planejamento: cenários, inflação, IR, aporte) com conferência dos cálculos por script.
5. Etapa 5: DSH (dashboard e visão gerencial): confere se o que a tela mostra bate com as tabelas.
6. Etapa 6: ASS + ADM (assinatura, teste grátis, carência, Mercado Pago, PTAX, administração) com conferência de valores e prazos.
7. Etapa 7: IA (assistente e insights) com foco em LGPD e limites de uso.
8. Etapa 8: consolidação: análise de risco geral, plano de testes integrado, "O ideal" do sistema.

**O que revisar**
- Campos do briefing que vieram sem preenchimento (o que está em jogo, normas, o que fica fora): as suposições estão na seção 8 do `RECONHECIMENTO.md`.
- Agrupamento em 10 módulos: é inferência a partir dos nomes de arquivos; ajustar se a empresa enxerga diferente.
