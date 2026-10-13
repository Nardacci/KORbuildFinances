// Etapa 5 — conferência dos totais da Visão gerencial (dashboard-movements.js, função refresh) e do Dashboard (dashboard.js:48),
// com os MESMOS dados de um mês, para mostrar onde as duas telas divergem. Lógica copiada do código.
// Uso: node visao-gerencial.js
const primary='BRL';
const incomes=[{amount:5000,status:'realized',receipt_date:'2026-10-05',currency:'BRL'},{amount:1000,status:'planned',receipt_date:'2026-10-20',currency:'BRL'},{amount:300,status:'canceled',receipt_date:'2026-10-21',currency:'BRL'},{amount:900,status:'realized',receipt_date:'2026-10-09',currency:'EUR'}];
const expenses=[{amount:3000,status:'realized',paid_date:'2026-10-07',currency:'BRL'},{amount:400,status:'planned',paid_date:null,planned_date:'2026-10-25',currency:'BRL'}];
const tx=[{transaction_type:'contribution',amount:1500,transaction_date:'2026-10-10',currency:'BRL'},{transaction_type:'adjustment',amount:200,transaction_date:'2026-10-11',currency:'BRL'},{transaction_type:'withdrawal',amount:700,transaction_date:'2026-10-12',currency:'BRL'}];
const transfers=[{source_amount:500,source_currency:'BRL',transfer_date:'2026-10-15'}];
const code=c=>c;
// --- Visão gerencial (dashboard-movements.js): sem filtro de status nas receitas; só 'contribution' nos investimentos
const inc=incomes.filter(x=>x.receipt_date), pay=expenses.filter(x=>x.paid_date), inv=tx.filter(x=>x.transaction_type==='contribution'), tr=transfers;
const incomeTotal=inc.filter(x=>code(x.currency)===primary).reduce((s,x)=>s+x.amount,0);
const paymentTotal=pay.filter(x=>code(x.currency)===primary).reduce((s,x)=>s+x.amount,0);
const investmentTotal=inv.filter(x=>code(x.currency)===primary).reduce((s,x)=>s+x.amount,0);
const transferTotal=tr.filter(x=>code(x.source_currency)===primary).reduce((s,x)=>s+x.source_amount,0);
const net=incomeTotal-investmentTotal-paymentTotal, totalCount=inc.length+inv.length+tr.length+pay.length;
console.log('VISÃO GERENCIAL (dashboard-movements.js)');
console.log(`  Receitas ${incomeTotal} (inclui planejada 1000 e cancelada 300!) | Investimentos ${investmentTotal} (só aportes) | Transferências ${transferTotal} | Pagamentos ${paymentTotal}`);
console.log(`  Saídas econômicas = ${investmentTotal+paymentTotal} | Resultado = ${incomeTotal} − ${investmentTotal} − ${paymentTotal} = ${net} | ${totalCount} movimentações (a receita em EUR aparece na lista, mas não no total)`);
// --- Dashboard (dashboard.js:48): status realized nas receitas e despesas; aportes + ajustes nos investimentos
const dIncome=incomes.filter(i=>i.status==='realized'&&code(i.currency)===primary).reduce((s,i)=>s+i.amount,0);
const dExpense=expenses.filter(e=>e.status==='realized'&&e.paid_date&&code(e.currency)===primary).reduce((s,e)=>s+e.amount,0);
const dInvest=tx.filter(t=>['contribution','adjustment'].includes(t.transaction_type)&&code(t.currency)===primary).reduce((s,t)=>s+t.amount,0);
const dTransfer=transferTotal;
console.log('DASHBOARD (dashboard.js:48)');
console.log(`  Receitas ${dIncome} | Despesas ${dExpense} | Investimentos ${dInvest} (aportes + ajustes) | Transferências ${dTransfer} | "Total" da rosca = ${dIncome+dExpense+dInvest+dTransfer}`);
console.log('DIVERGÊNCIAS: receitas 6300 × 5000 (status); investimentos 1500 × 1700 (ajuste); resgate de 700 não aparece em nenhuma das duas.');
