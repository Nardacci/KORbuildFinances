# DSH · 09 — Inventário de telas e situação

| Tela / bloco | Arquivo | Função | Situação (pelo código) | Observações |
|---|---|---|---|---|
| Dashboard: métricas do mês | `dashboard.html` + `dashboard.js` | 4 números e variações | Funciona; coerente com as regras do próprio dashboard | seta fixa; +100 % sem mês anterior |
| Dashboard: evolução do patrimônio | idem | curva por fechamento | Funciona só se houver fechamentos (ninguém cria) | base ≠ patrimônio atual |
| Dashboard: Meu mês (rosca) | idem | 4 fatias | Funciona | "Total" soma entradas e saídas |
| Dashboard: despesas por categoria | idem | rosca + 8 maiores | Funciona; testada (XSS) | |
| Dashboard: objetivo rápido | idem | falta, progresso, previsão | Funciona com patrimônio errado | previsão ≠ Planejamento |
| Dashboard: faixa de teste grátis | idem | status comercial | Funciona | módulo ASS |
| Visão gerencial | `dashboard-movements.html` + `.js` | 4 listas e totais por mês | Funciona; testada (totais mudam) | receitas sem filtro de status; erros silenciosos |
| Menu celular "Perfil" | `dashboard.html` | → `settings.html` → revisão | Funciona; testada | |
