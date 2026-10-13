# DSH · SEGURANÇA — CONFIDENCIAL

**Não publicar em portal nem em resumo. Circulação restrita ao dono do projeto.**

Data: 2026-10-13. Base: leitura do código e scripts de conferência. Nenhum teste executado.

| # | Achado | Severidade (inferida) | Evidência | Situação | Recomendação |
|---|---|---|---|---|---|
| DSH-S01 | Visão gerencial esconde falhas: qualquer erro de consulta (permissão, rede, coluna inexistente) vira lista vazia e os totais e o "Resultado" são exibidos como se estivessem completos; o aviso vai só ao console | Média (integridade da informação; já houve GRANT faltando em produção) | `dashboard-movements.js` (`safe`, "Consolidação parcial"); `20260928000000_...:1-9` | Extraída | Mostrar aviso visível e não exibir totais quando houver erro |
| DSH-S02 | "Evolução do patrimônio" usa só fechamentos de investimento, enquanto "Patrimônio atual" ao lado inclui contas; variação e máximos/mínimos comparam bases diferentes. Como ninguém fecha período pelo app, a curva costuma ter um ponto só | Média (leitura errada da evolução) | `dashboard.js:43, 48` (instruções 32-37); RN-INV-027 | Extraída | REQ-DSH-02 |
| DSH-S03 | Receitas planejadas e canceladas entram no total de "Receitas" e no "Resultado" da Visão gerencial | Média (resultado do mês superestimado) | `dashboard-movements.js` (`inc=incomes.filter(x=>x.receipt_date)`) | Extraída | Filtrar status recebida |
| DSH-S04 | Dashboard e Visão gerencial divergem para o mesmo mês (status das receitas; ajustes nos investimentos) | Média (confiança) | `scripts/etapa5/visao-gerencial.js` | Extraída | REQ-DSH-01 |
| DSH-S05 | Patrimônio atual com saldo inicial das contas (igual a PLN) | Alta (número central da tela principal) | `dashboard.js:48` (instrução 14) | Extraída | REQ-PLN-01 |
| DSH-S06 | Faixa de teste grátis: falha da RPC esconde a faixa (fail-closed para a mensagem) e a guarda de acesso é fail-open (ACS-S01): usuário bloqueado com RPC fora do ar entra sem aviso | Baixa | `dashboard.js:47`; `auth.js:55-59` | Extraída | Alinhar comportamento |
| DSH-S07 | Nome real de pessoa fixo no HTML e como padrão (ver PLN-S01) nas duas telas | Baixa | `dashboard.html`; `dashboard.js:48` (instrução 15); `dashboard-movements.js` (`header`) | Extraída | REQ-PLN-11 |
| DSH-S08 | Consulta de receitas sem filtro de data traz o histórico inteiro ao navegador a cada abertura do dashboard | Baixa (desempenho; mais dados pessoais trafegando que o necessário) | `dashboard.js:48` (instrução 6) | Extraída | Filtrar mês anterior e atual na consulta |
| DSH-S09 | Nomes de categoria e descrições passam por escape nas listas; coberto por teste | Informativa | `dashboard.js:42`; `dashboard-movements.js` (`esc`); `tests/security-xss.spec.js:64-101` | Extraída | Nenhuma ação |
| DSH-S10 | Parâmetro `?month=` do seletor não é validado: valor fora da lista deixa o seletor sem opção e os limites viram datas inválidas (`Invalid Date`), produzindo consulta com filtro inválido engolido por `safe` → tela vazia sem erro | Baixa | `dashboard-movements.js` (`addMonthOptions`, `monthBounds`) | A confirmar no teste (CT-DSH-14) | Validar o parâmetro |
