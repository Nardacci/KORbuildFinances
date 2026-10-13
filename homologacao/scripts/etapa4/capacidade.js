// Etapa 4 — as DUAS "capacidades" calculadas pela tela (planning.js:145-146 e 150-156) com os mesmos dados.
//  capacity (decide "O que fazer agora" e o status do plano): (receitas − despesas dos últimos 6 meses) ÷ 6, sempre 6.
//  realityCapacity (exibida em REALIDADE): média de (receitas − despesas) só dos meses COM dados na janela de 12 meses.
// Uso: node capacidade.js
const meses={ '2026-08':{income:5000,expense:3000}, '2026-09':{income:5000,expense:3500}, '2026-10':{income:5000,expense:2500} }; // só 3 meses com dados
const inc6=Object.values(meses).reduce((s,m)=>s+m.income,0), exp6=Object.values(meses).reduce((s,m)=>s+m.expense,0);
const capacity=Math.max(0,(inc6-exp6)/6);
const rows=Object.values(meses).map(m=>m.income-m.expense);
const realityCapacity=rows.reduce((s,v)=>s+v,0)/rows.length;
console.log('3 meses com dados (sobras 2000, 1500, 2500):');
console.log('  capacity (÷6, usada nas decisões)        =', capacity);
console.log('  realityCapacity (÷ meses com dados, exibida) =', realityCapacity);
console.log('  Com aporte necessário de 1.500/mês: decisão usa', capacity, '<', 1500, '→ "O plano precisa de atenção", enquanto a tela mostra capacidade', realityCapacity);
