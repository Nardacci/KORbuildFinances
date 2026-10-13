// Etapa 5 — conferência das contas do Dashboard copiadas de dashboard.js:36-43.
//  pctChange(cur,prev): sem mês anterior → 100% se houver valor (ou 0); senão (cur−prev)/|prev|×100
//  deltaText: "—" só quando ambos são zero
//  renderDonut: fatia = valor/total×360°; renderExpenseChart mostra só as 8 maiores categorias
//  renderWealthEvolution: variação = (último − primeiro)/|primeiro|×100 sobre os FECHAMENTOS; sem fechamento, 1 ponto com o patrimônio atual
// Uso: node variacao-e-graficos.js
function pctChange(cur,prev){if(!prev)return cur?100:0;return ((cur-prev)/Math.abs(prev))*100}
function deltaText(cur,prev){if(!prev&&cur===0)return '—';const p=pctChange(cur,prev);return `${p>=0?'+':''}${p.toLocaleString('pt-BR',{maximumFractionDigits:1})}% ↗`}
console.log('--- "Neste mês vs. mês anterior" (dashboard.js:36-37)');
for (const [cur,prev] of [[1200,1000],[800,1000],[500,0],[0,0],[0,700],[1000,-500]]) console.log(`atual ${String(cur).padStart(5)} | anterior ${String(prev).padStart(5)} → ${deltaText(cur,prev)}`);
console.log('  obs.: a seta "↗" aparece mesmo quando a variação é negativa (texto fixo); sem mês anterior, qualquer valor vira "+100%".');
console.log('\n--- Rosca "Meu mês" (dashboard.js:40-41): fatias em graus e % da legenda');
const vals=[{k:'Receitas',v:5000},{k:'Despesas',v:3000},{k:'Investimentos',v:1500},{k:'Transferências',v:500}];
const total=vals.reduce((s,x)=>s+x.v,0);
vals.forEach(x=>console.log(`  ${x.k.padEnd(15)} ${x.v} → ${(x.v/total*360).toFixed(1)}° ${(x.v/total*100).toFixed(1)}%`));
console.log(`  total exibido no centro = ${total} (soma de entradas + saídas + transferências: não é saldo nem resultado)`);
console.log('\n--- Evolução do patrimônio (dashboard.js:43): variação sobre fechamentos');
const closings=[{period:'2026-05-01',value:50000},{period:'2026-06-01',value:52000},{period:'2026-07-01',value:49000},{period:'2026-08-01',value:55000}];
const vals2=closings.map(c=>c.value), first=vals2[0], last=vals2[vals2.length-1];
console.log(`  fechamentos ${vals2.join(', ')} → variação ${(((last-first)/Math.abs(first))*100).toFixed(1)}% (+${last-first}); maior ${Math.max(...vals2)}; menor ${Math.min(...vals2)}`);
console.log('  "Patrimônio atual" exibido ao lado = saldo inicial das contas + posições (outra base, pode nem aparecer na curva).');
console.log('  Sem fechamentos: a curva vira um único ponto com o patrimônio atual e variação 0%.');
