# CLAUDE.md — Projeto KORbuild Finances (análise e homologação)

## 1. O que é este trabalho

Análise e documentação, em etapas pequenas, do sistema **KORbuild Finances** (gestão financeira pessoal
multiusuário: contas, receitas, despesas, transferências, investimentos, planejamento de patrimônio,
assinatura paga e assistente de IA). O sistema **já existe** e precisa ser entendido e validado.

- Quem escreve: analista de negócio, não desenvolvedor. Português claro; todo jargão explicado na primeira vez.
- A memória do trabalho fica no repositório: `CLAUDE.md` (regras) + `homologacao/DIARIO-DE-BORDO.md` (diário).
- O trabalho roda em vários chats separados. Cada chat faz uma etapa.

## 2. Onde está o código

| Item | Local |
|---|---|
| Código do sistema | `https://github.com/Nardacci/KORbuildFinances.git`, branch `main` |
| Este arquivo e `homologacao/` | Na raiz deste mesmo repositório (KORbuildFinances). Cada chat deve ser aberto neste repositório |
| Documentos já existentes no sistema | `docs/security-diagnostic.md` e `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md` |
| Ambiente de TESTE (confirmado pelo analista em 2026-10-13) | O projeto Supabase cujo `project_id` está em `supabase/config.toml` (o mesmo de `supabase-config.js`). Não copiar o identificador para os documentos |
| Ponto para validar | `docs/PROD_DATABASE_MIGRATION_BASELINE_2026-09-24.md` chama esse mesmo projeto de "produção". Inferência: hoje existe um único ambiente, usado como homologação. Portanto: só registros com prefixo `TESTE`, nunca apagar ou alterar registros que não sejam `TESTE` |
| Segundo projeto Supabase (citado em `docs/security-diagnostic.md`) | Não confirmado pelo analista; tratar como ambiente antigo e não usar |

## 3. Regras do projeto (obrigatórias)

1. **Não alterar o código original.** Tudo o que for produzido vai para `homologacao/`.
2. **Separar sempre o que o código ou o documento MOSTRA do que é INFERÊNCIA.** Na dúvida, registrar como
   "Ponto para validar", nunca como fato.
3. **Toda regra cita a fonte** no formato `arquivo:linha`. Situação de cada regra: `Extraída`, `A confirmar no teste`, `Validada`.
4. **Descrever o "como é hoje" e o "como deve ser".** Falha encontrada vira requisito corrigido, citando o achado de origem.
5. **Nunca copiar senhas, chaves, strings de conexão nem dados pessoais** para os documentos: citar só o arquivo.
   Isso inclui chaves "publicáveis" do Supabase, identificadores de projeto, e-mails e nomes de usuários reais.
6. **Achados de segurança ficam num documento CONFIDENCIAL por módulo** (`homologacao/<módulo>/SEGURANCA-CONFIDENCIAL.md`)
   e nunca vão para portal ou resumo público.
7. **Uma etapa por vez:** entregar, registrar no diário, propor a próxima. Pedir aprovação antes de cada etapa grande.
8. **Ao começar um chat:** ler este `CLAUDE.md` e a primeira entrada (a mais nova, no topo) de `homologacao/DIARIO-DE-BORDO.md`.
   **Ao terminar:** acrescentar a entrada no topo do diário (feito, resultado, parou em, próximo passo, o que revisar) e fazer commit e push.
9. **Dados reais ou de produção: nunca mexer.** Testes só em ambiente de teste, com registros cujo nome começa com `TESTE`.
   Atenção: os testes automáticos do sistema (pasta `tests/`) apontam para o mesmo projeto Supabase do front-end;
   não executá-los sem confirmar que o ambiente é de teste (ver diário, entrada de 2026-10-13).
10. **Cálculos (bônus, valores, prazos, juros, cotação):** conferir por script com casos de exemplo e mostrar a conta.
11. Usar scripts (contagens, comparações, grep) em vez de ler tudo. Resultados em tabelas.

## 4. Pacote por módulo

Cada módulo recebe a pasta `homologacao/<módulo>/` com estes documentos (um arquivo por item, mesmo que curto):

| Arquivo | Conteúdo |
|---|---|
| `01-reconhecimento.md` | O que existe no módulo: telas, arquivos, tabelas, funções, integrações, o que está sem documentação |
| `02-fluxos.md` | Por fluxo: objetivo, escopo, etapas, regras (RN001...), telas, casos de teste, fluxograma (Mermaid) |
| `03-regras-de-negocio.md` | Todas as regras RNxxx com fonte `arquivo:linha` e situação |
| `04-permissoes.md` | Quem pode fazer o quê (perfis, políticas de acesso no banco, verificações na tela) |
| `SEGURANCA-CONFIDENCIAL.md` | Achados de segurança. Não publicar |
| `05-conformidade.md` | Conformidade com normas (LGPD e boas práticas, enquanto não houver norma definida) |
| `06-modelo-de-dados.md` | Tabelas, colunas, relações, visões e restrições do módulo |
| `07-analise-de-risco.md` | Riscos de negócio, de dados e operacionais, com probabilidade e impacto |
| `08-plano-de-testes.md` | Casos de teste, dados `TESTE...`, resultado esperado |
| `09-inventario-de-telas.md` | Cada tela e sua situação (funciona, incompleta, sem documentação) |
| `10-o-ideal.md` | Como deve funcionar ("como deve ser"), com requisitos corrigidos citando os achados |

## 5. Convenções de escrita

- Regras numeradas por módulo: `RN-<SIGLA>-001` (ex.: `RN-TRF-001` para Transferências).
- Em toda tabela de regras, colunas: `Código | Regra | Fonte (arquivo:linha) | Situação | Observação`.
- Marcar inferências com o prefixo **"Inferência:"** e dúvidas com **"Ponto para validar:"**.
- Datas no formato AAAA-MM-DD. Valores monetários com a moeda explícita.
- Diagramas em Mermaid dentro do próprio Markdown.

## 6. Módulos identificados (ver `homologacao/00-reconhecimento/RECONHECIMENTO.md`)

| Sigla | Módulo |
|---|---|
| ACS | Acesso e Workspace (login, cadastro, assistente de configuração inicial, sessão) |
| CTA | Contas e Transferências |
| RDP | Receitas e Despesas |
| INV | Investimentos (tipos, investimentos, lançamentos, fechamentos, posições) |
| PLN | Planejamento e Objetivo (meta de patrimônio, cenários, aporte) |
| DSH | Dashboard e Visão gerencial |
| ASS | Assinatura e Comercial (teste grátis, carência, Mercado Pago, cotação PTAX) |
| ADM | Administração (preços, limites de IA, controle de acesso por workspace) |
| IA | Assistente de IA e insights (Kora) |
| BD | Banco de dados e segurança transversal (RLS, grants, baseline de produção) |
