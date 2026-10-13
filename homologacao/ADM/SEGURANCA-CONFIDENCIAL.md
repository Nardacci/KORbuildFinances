# ADM · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura do código. Nenhum teste executado.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| ADM-S01 | Administrador tem poder total sem dupla aprovação, sem trilha de leitura e sem alerta: pode liberar acesso (ACTIVE) ou dar desconto de 100 % a qualquer workspace, inclusive o próprio | Média (fraude interna; depende do número de admins) | `20260915230000_...:229-276`; RN-ADM-014 | Extraída | Registro de auditoria das ações administrativas com antes/depois; alerta para descontos acima de X % |
| ADM-S02 | Inclusão de admin só por SQL, sem registro de quem incluiu nem revisão periódica | Baixa | `20260915190000_...:27-29` | Extraída | REQ-BD-08 |
| ADM-S03 | Ajuste percentual sem limites; motivo opcional | Baixa | RN-ADM-008 | Extraída | REQ-ASS-13 |
| ADM-S04 | Dados bancários da empresa (chave Pix, titular, banco, contato) legíveis por qualquer usuário logado via `get_own_payment_instructions`. Com a decisão de que Pix é opção oficial (2026-10-13), a exposição passa a ser necessária; resta garantir que só usuários com acesso permitido vejam e que a chave Pix exibida seja a correta (troca exige revisão) | Informativa (por desenho) | `20260916120000_...:56-77` | Extraída | Exibir só na tela de pagamento; registrar alterações da chave Pix |
| ADM-S05 | Sessão de admin sem exigência extra (sem 2FA) para funções que afetam receita | Média | `login.js:18-23`; ausência de MFA | Extraída | Exigir 2FA para admins (recurso do Supabase Auth) |
| ADM-S06 | A tela não valida entradas antes de enviar (limite de IA vazio vira 0 e desabilita na prática; percentuais absurdos) | Baixa | `finances-admin.js:67, 166` | Extraída | Validar e confirmar valores fora de faixa |
| ADM-S07 | `payment_grace_days` sem tela: alterar exige chamar a RPC pelo console | Informativa | RN-ADM-007 | Extraída | Campo no painel |
| ADM-S08 | Mensagens e estados em inglês/códigos para o operador | Informativa | RN-ADM-016 | Extraída | Traduzir |
| ADM-S09 | Sobrecargas antigas (`update_commercial_pricing` com 2 parâmetros, `compute_effective_status` com 5) podem existir no banco com grant a `authenticated` (ver BD-S02) | Baixa | `20260925000000_...:20-23, 160-165` | A confirmar no teste (T-BD-11) | Remover |
