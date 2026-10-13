# CTA · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura do código. Nenhum teste executado.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| CTA-S01 | Troca de moeda de uma conta com movimentos não é bloqueada, nem pelo navegador nem (até onde se vê) pelo banco. Pela API direta também. O saldo passa a misturar valores de moedas diferentes | Média (integridade) | `account-edit.js:12`; visão `...financial_integrity.sql:139-148` | A confirmar no teste (CT-CTA-08) | Bloquear a troca de moeda se existirem movimentos (regra no banco) |
| CTA-S02 | Transferência entre moedas diferentes aceita qualquer valor de entrada: nada limita a taxa implícita. Com a taxa livre, o usuário infla o próprio patrimônio (ex.: 1 USD vira 1.000.000 BRL) | Baixa (afeta só o próprio usuário), Média se houver comparação entre usuários ou relatórios para terceiros | `transfer-new.js:7`; restrição só cobre mesma moeda (`20260913120000_...:13-18`) | Extraída | Alertar se a taxa se afastar da cotação oficial (tabela de câmbio já existe); limite de sanidade no banco |
| CTA-S03 | A função `validate_transfer_accounts` não está no repositório. Não se sabe se impede conta de origem igual à de destino, nem contas de outro workspace, quando a chamada vem direto pela API | Média | `20260923191000_...:8` (só o nome) | A confirmar no teste (CT-CTA-19, 20; T-BD-04) | Versionar a função e cobrir com teste de API |
| CTA-S04 | Mesma lacuna para `UPDATE` de transferência: a política só confere o `workspace_id` da linha, não o dono das contas referenciadas | Média | `20260912230000_...:25-31` | A confirmar no teste | Idem |
| CTA-S05 | Incoerência entre política e privilégio: existe política de exclusão em `transfers` e não existe privilégio. O efeito colateral é a limpeza dos testes automáticos falhar em silêncio | Baixa | `20260912230000_...:33-44`; `20260928020000_...:29-32`; `tests/transfers.spec.js:42-58`; `tests/security-transfer-integrity.spec.js:72-78` | A confirmar no teste (T-BD-02) | Decidir se usuário pode excluir transferência (REQ-CTA-04) e alinhar política e privilégio |
| CTA-S06 | Nomes de contas entram sem escape em listas suspensas (`<option>`) das telas de transferência, receita e despesa. O navegador provavelmente neutraliza tags dentro de `select`, por isso o risco é baixo, mas não há teste | Baixa | `transfer-new.js:5`; `transfer-edit.js:7`; `income-new.js:2`; `income-edit.js:20`; `expense-new.js:4`; `expense-edit.js:5` | A confirmar no teste (CT-CTA-25) | Escapar sempre; ampliar `tests/security-xss.spec.js` para as listas suspensas |
| CTA-S07 | Mensagens de erro do banco são mostradas ao usuário sem tradução (nomes de restrições e tabelas) | Baixa | `accounts.js:2` (`show(error.message)`); `transfer-new.js:7`; `transfer-edit.js:9` | Extraída | Mapear erros conhecidos para texto amigável |
| CTA-S08 | Sem proteção contra envio duplicado em transferência (movimenta dinheiro duas vezes) | Média (integridade) | `transfer-new.js:7` | A confirmar no teste (CT-CTA-21) | Desabilitar o botão e/ou chave de idempotência |
| CTA-S09 | Exclusão de conta é definitiva e sem trilha de quem apagou e quando | Baixa | `accounts.js:2` | Extraída | REQ-BD-09 (auditoria) |
