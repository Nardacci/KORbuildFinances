# Diário de bordo — KORbuild Finances

Entrada mais nova no topo. Formato de cada entrada: data, chat/etapa, feito, resultado, parou em, próximo passo, o que revisar.

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
