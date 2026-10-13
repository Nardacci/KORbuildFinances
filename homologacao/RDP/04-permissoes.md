# RDP · 04 — Permissões

Sem perfis internos: todo usuário com configuração concluída opera as próprias receitas e despesas.

| Ação | Verificação na tela | Verificação no servidor (o que o código MOSTRA) | Fonte |
|---|---|---|---|
| Listar receitas / despesas | sessão, `setup_completed`, filtro por workspace | SELECT concedido a `authenticated`; RLS por workspace | `incomes.js:2`; `expenses.js:35` |
| Criar receita / despesa | validações do formulário | INSERT concedido; regras de moeda (receita) e de valor (despesa) no banco, fora do repositório | `20260928020000_...:37-38` |
| Editar | idem, filtro por id e workspace | UPDATE concedido | idem |
| Excluir | confirmação | DELETE concedido | idem |
| Ler categorias | filtro por workspace | só SELECT | `20260928000000_...:23` |
| Criar/editar/excluir categorias | não existe tela | sem privilégio | `20260928000000_...:13-15` |

Observações:

- O vínculo de conta ou categoria a uma despesa/receita de outro workspace, feito direto pela API, depende de restrições do banco que não estão no repositório (**Ponto para validar**, CT-RDP-24).
- Não há papéis como cônjuge ou contador; um workspace tem um usuário (ver ACS).
