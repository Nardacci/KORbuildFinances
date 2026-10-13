// Etapa 4 — conferência das três fórmulas do Planejamento, copiadas EXATAMENTE de planning.js:9-22.
// futureValue: valor futuro com aportes no fim de cada mês (anuidade ordinária); requiredMonthly: aporte que fecha a meta;
// monthsToGoal: meses até a meta com o aporte do plano.  Uso: node projecao.js
const futureValue=(present,monthly,n,rate)=>{const r=rate/100;return !n?present:present*Math.pow(1+r,n)+monthly*(r?((Math.pow(1+r,n)-1)/r):n)};
const requiredMonthly=(present,target,n,rate)=>{if(target<=present||n<=0)return 0;const r=rate/100,futurePresent=present*Math.pow(1+r,n),gap=target-futurePresent;return r?Math.max(0,gap*r/(Math.pow(1+r,n)-1)):gap/n};
function monthsToGoal(present, monthly, rate, target){if(present>=target)return 0;const r=rate/100;if(r===0){if(monthly<=0)return Infinity;return (target-present)/monthly;}if(monthly===0&&present===0)return Infinity;const x=(target+monthly/r)/(present+monthly/r);if(!(x>0))return Infinity;return Math.log(x)/Math.log(1+r);}
const annualEquivalent=r=>(Math.pow(1+r/100,12)-1)*100;
const f=v=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
const present=10000, monthly=1000, target=100000, years=5, months=years*12;
console.log(`Caso base: patrimônio atual ${f(present)}, aporte ${f(monthly)}/mês, meta ${f(target)}, prazo ${years} anos (${months} meses)\n`);
console.log('taxa a.m. | ≈ a.a.  | valor no prazo | aporte necessário | meses até a meta | conferências');
for (const r of [0,0.5,1,1.5,2]) {
  const fv=futureValue(present,monthly,months,r), req=requiredMonthly(present,target,months,r), m=monthsToGoal(present,monthly,r,target);
  const chk1=futureValue(present,req,months,r);               // com o aporte necessário, chega exatamente na meta?
  const chk2=isFinite(m)?futureValue(present,monthly,m,r):NaN; // no mês calculado, o valor é a meta?
  console.log(`${String(r).padEnd(9)} | ${f(annualEquivalent(r)).padStart(6)}% | ${f(fv).padStart(14)} | ${f(req).padStart(17)} | ${f(m).padStart(16)} | FV(aporte nec.)=${f(chk1)} ; FV(no mês)=${f(chk2)}`);
}
console.log('\nConta à mão para 1% a.m.: 10000×1,01^60 = 18.166,97; 1000×(1,01^60−1)/0,01 = 81.669,67; soma = 99.836,64 ✔');
console.log('\nCasos de borda:');
console.log(' sem aporte e sem patrimônio, 1% a.m. →', monthsToGoal(0,0,1,target), '(Infinity = "Não bate a meta")');
console.log(' sem aporte, patrimônio 10000, 1% a.m. →', f(monthsToGoal(10000,0,1,target)), 'meses (só rendimento: 232 meses ≈ 19 anos)');
console.log(' sem aporte, patrimônio 10000, 0% a.m. →', monthsToGoal(10000,0,0,target), '(Infinity)');
console.log(' meta já alcançada (present ≥ target) →', monthsToGoal(100000,1000,1,100000), 'meses');
console.log(' prazo 0 meses → aporte necessário', requiredMonthly(10000,100000,0,1), '(0, sem aviso)');
console.log(' monthsToGoal > 600 (50 anos) vira "Não bate a meta nesse prazo":', f(monthsToGoal(0,100,0,100000)), 'meses');
