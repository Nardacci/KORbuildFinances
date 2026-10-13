// Etapa 2 — conferência: "Recebido este mês" (incomes.js:2) com receitas nos dias 30/09, 01/10, 31/10 e 01/11.
// Lógica copiada: start=new Date(); start.setDate(1); startISO=start.toISOString().slice(0,10);
//                 next=new Date(ano, mês+1, 1).toISOString().slice(0,10); conta se startISO <= data < next.
// Uso: TZ=Europe/Rome node receitas-do-mes.js
const RealDate = Date;
global.Date = class extends RealDate { constructor(...a){ if(a.length===0) super('2026-10-15T12:00:00Z'); else super(...a);} };
const start = new Date(); start.setDate(1);
const startISO = start.toISOString().slice(0,10);
const next = new Date(start.getFullYear(), start.getMonth()+1, 1).toISOString().slice(0,10);
const receitas = [{d:'2026-09-30',v:100},{d:'2026-10-01',v:200},{d:'2026-10-31',v:300},{d:'2026-11-01',v:400}];
const soma = receitas.filter(r => r.d >= startISO && r.d < next).reduce((s,r)=>s+r.v,0);
console.log((process.env.TZ||'(fuso do sistema)').padEnd(20),'janela',startISO,'a',next,'(exclusivo) => soma',soma,'| correto: 500 (dias 01 e 31 de outubro)');
