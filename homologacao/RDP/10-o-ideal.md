# RDP · 10 — O ideal (como deve ser)

| Código | Requisito | Como é hoje | Motivação | Prioridade |
|---|---|---|---|---|
| REQ-RDP-01 | Todo workspace deve nascer com categorias padrão de despesa (e ter tela para criar, renomear e arquivar as suas). O processo que cria categorias deve estar versionado e testado | origem desconhecida; sem tela | R-RDP-01, RN-RDP-020, RDP-S07 | P1 (confirmar com CT-RDP-01) |
| REQ-RDP-02 | A despesa deve usar a moeda da conta escolhida (ou o usuário escolhe a moeda); o banco deve exigir a mesma moeda da conta, como na receita; sem conta, a moeda é a principal | moeda principal sempre; sem checagem | R-RDP-06, RDP-S01 | P1 |
| REQ-RDP-03 | Mostrar cada valor na sua moeda (símbolo correto) e separar totais por moeda; nunca somar moedas diferentes. Mudar a moeda principal deve avisar o efeito | R$ fixo; soma única | R-RDP-02, R-RDP-07, RN-RDP-017, 018 | P1 |
| REQ-RDP-04 | Um único vocabulário de moeda (código ISO), frequência e status em todo o sistema; migrar os dados existentes | três formatos de moeda, dois de frequência | R-RDP-12, RN-RDP-011 | P1 |
| REQ-RDP-05 | O assistente deve criar a primeira receita vinculada à primeira conta (quando a moeda coincide), com data de recebimento e no vocabulário das telas; ou perguntar | sem conta, sem data, frequência em português | R-RDP-05, RN-RDP-010 | P1 |
| REQ-RDP-06 | Aplicar `REQ-CTA-01` (leitura correta de valores digitados) às despesas | ponto removido | R-RDP-03 | P1 |
| REQ-RDP-07 | Aplicar `REQ-CTA-05` (datas e limites do mês no fuso do usuário) a receitas e despesas | UTC | R-RDP-04 | P1 |
| REQ-RDP-08 | Desabilitar o botão durante o envio em despesas | sem proteção | R-RDP-09, RN-RDP-026 | P2 |
| REQ-RDP-09 | Implementar fechamento de período para receitas e despesas (como já existe em investimentos) ou retirar o texto "período aberto"; registrar quem alterou o quê | inexistente | R-RDP-11, RN-RDP-024 | P2 |
| REQ-RDP-10 | Implementar recorrência (gerar ocorrências) e parcelamento (nº de parcelas) ou ocultar os tipos até existirem | só rótulos | R-RDP-10, RN-RDP-005, 028 | P2 |
| REQ-RDP-11 | Usar `receipt_day` (ex.: sugerir a data da próxima receita) ou retirar a coluna do assistente | gravado e nunca lido | RN-RDP-012 | P3 |
| REQ-RDP-12 | Preferir "cancelar" a "excluir" e manter histórico de alterações | exclusão definitiva | RDP-S04 | P2 |
| REQ-RDP-13 | Avisar ao registrar despesa sem conta que o saldo de nenhuma conta será afetado; sugerir a conta principal | silencioso | R-RDP-08, RN-RDP-022 | P2 |
| REQ-RDP-14 | Restrições no banco para `status`, `frequency`, `expense_type`, tetos de valor e referência de conta/categoria do mesmo workspace | desconhecidas | RDP-S02, S03, S06 | P2 |
| REQ-RDP-15 | Decidir se receita "recebida" com data futura entra no saldo agora ou só na data | entra na hora | RDP-S08, REQ-CTA-12 | P3 |
