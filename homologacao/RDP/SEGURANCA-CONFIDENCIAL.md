# RDP · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura do código. Nenhum teste executado.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| RDP-S01 | Despesa não valida a moeda da conta, nem no navegador nem (até onde se vê) no banco. A receita valida. A visão de saldo subtrai o número sem converter | Média (integridade) | `expense-new.js:5`; `income-new.js:2`; `20260912010000_...:142`; `docs/security-diagnostic.md` Fase 3 só cita regra para receita | A confirmar no teste (CT-RDP-16) | Mesma regra da receita, no banco |
| RDP-S02 | Valores de `status`, `frequency` e `expense_type` podem não ser restritos no banco. A tela de edição de receita pode gravar frequência vazia | Baixa | `income-edit.js:21,27`; definição das colunas fora do repositório | A confirmar no teste (CT-RDP-11, 23) | Restrições CHECK ou enumerações no banco |
| RDP-S03 | Referência a conta ou categoria de outro workspace por chamada direta à API pode não ser barrada em despesas e receitas | Média | RLS só confere `workspace_id` da linha (padrão descrito em `20260928020000_...:9-13`); gatilhos não visíveis | A confirmar no teste (CT-RDP-24; T-BD-04) | Chave estrangeira composta (id + workspace) ou gatilho |
| RDP-S04 | Exclusão definitiva de receita e despesa, sem trilha de quem apagou, quando e o valor anterior | Baixa | `income-edit.js:29`; `expenses.js:29-33` | Extraída | REQ-BD-09; preferir "cancelar" |
| RDP-S05 | `expenses.js` pede todas as colunas (`select('*')`): colunas futuras sensíveis seriam trazidas sem querer | Informativa | `expenses.js:35`; `expense-edit.js:5` | Extraída | Listar só as colunas usadas |
| RDP-S06 | Não há limite de tamanho do texto nem teto de valor; valores enormes podem quebrar telas e somas | Baixa | `income-new.js:2`; `expense-new.js:3` | A confirmar no teste | Tetos de sanidade no banco |
| RDP-S07 | Origem das categorias de despesa desconhecida: não há como auditar quem pode criá-las, nem se há categorias sem workspace (compartilhadas) | Média (governança) | ver `01-reconhecimento.md` | A confirmar no teste (CT-RDP-01; T-BD-01) | Versionar o processo que cria categorias |
| RDP-S08 | Receita "recebida" com data futura entra imediatamente no saldo; usuário pode antecipar patrimônio | Baixa (só o próprio usuário) | `20260912010000_...:141` | Extraída | Decisão de produto: considerar data |
| RDP-S09 | Nomes de categoria e de conta entram sem escape nas listas suspensas de despesa (ver CTA-S06) | Baixa | `expense-new.js:4`; `expense-edit.js:5` | A confirmar no teste | Escapar |
