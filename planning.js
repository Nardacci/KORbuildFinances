/* KORbuild Finances — Planejamento V3.1 */
(()=>{'use strict';
const $=id=>document.getElementById(id),db=()=>KORbuildAuth.client.schema('finances');
const money=(v,c='BRL')=>{try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:String(c||'BRL').split(/\s+—\s+/)[0].trim().toUpperCase(),maximumFractionDigits:0}).format(Number(v)||0)}catch{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}};
const code=v=>String(v||'').split(/\s+—\s+/)[0].trim().toUpperCase();
const initials=n=>String(n||'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'A';
const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
const monthBounds=d=>{const s=new Date(d.getFullYear(),d.getMonth(),1),e=new Date(d.getFullYear(),d.getMonth()+1,1);return[s.toISOString().slice(0,10),e.toISOString().slice(0,10)]};
const futureValue=(present,monthly,n,rate)=>{const r=rate/100;return !n?present:present*Math.pow(1+r,n)+monthly*(r?((Math.pow(1+r,n)-1)/r):n)};
const requiredMonthly=(present,target,n,rate)=>{if(target<=present||n<=0)return 0;const r=rate/100,futurePresent=present*Math.pow(1+r,n),gap=target-futurePresent;return r?Math.max(0,gap*r/(Math.pow(1+r,n)-1)):gap/n};
function monthsToGoal(present, monthly, rate, target) {
  if (present >= target) return 0;
  const r = rate / 100;
  if (r === 0) {
    if (monthly <= 0) return Infinity;
    return (target - present) / monthly;
  }
  if (monthly === 0 && present === 0) return Infinity;
  const x = (target + monthly / r) / (present + monthly / r);
  if (!(x > 0)) return Infinity; // guarda contra caso degenerado
  return Math.log(x) / Math.log(1 + r);
}
const RATE_SCENARIOS=[0,0.5,1,1.5,2];
const INFLATION_BY_CURRENCY={BRL:0.045,USD:0.025,EUR:0.025,GBP:0.03};
const formatMonthsToGoal=m=>{if(m<=0)return'Meta já alcançada';if(!isFinite(m)||m>600)return'Não bate a meta nesse prazo';const total=Math.round(m),years=Math.floor(total/12),months=total%12,parts=[];if(years)parts.push(years+(years===1?' ano':' anos'));if(months||!years)parts.push(months+(months===1?' mês':' meses'));return parts.join(' e ')};
const classify=arr=>arr.every(Boolean)?'all':arr.every(v=>!v)?'none':'mixed';
const NO_CONTRIBUTION_TEXT='Nenhuma contribuição informada — adicione um aporte pra ver a projeção';
const SCENARIO_COLORS={0:'#64748b',0.5:'#2474e8',1:'#15935d',1.5:'#e08a12',2:'#b83b8f'};
const REALITY_COLOR='#111827';
const fmtPct=(v,d=1)=>v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const annualEquivalent=r=>(Math.pow(1+r/100,12)-1)*100;
// Gráfico dos cenários de rendimento (SVG à mão). Eixo Y dinâmico, meta/prazo, cruzamentos e rótulos finais sem sobreposição.
function drawScenarioChart(o){
 const el=o.el;if(!el)return;
 const {visible,scenarios,currentWealth,monthlyPlan,months,years,target,rate,realInvestment,primary,moneyFn}=o;
 if(!(months>0)||!(target>0)){el.innerHTML='';return}
 const W=Math.max(300,Math.round(el.clientWidth||760)),H=W<520?250:300,pL=66,pR=84,pT=14,pB=32,pw=W-pL-pR,ph=H-pT-pB;
 let cf=null;try{cf=new Intl.NumberFormat('pt-BR',{style:'currency',currency:primary,notation:'compact',maximumFractionDigits:1})}catch{}
 const compact=v=>cf?cf.format(v):moneyFn(v),tw=s=>s.length*5.3,f1=n=>n.toFixed(1);
 const step=Math.max(1,Math.ceil(months/120)),idx=[];for(let i=0;i<months;i+=step)idx.push(i);idx.push(months);
 const curves=scenarios.filter(sc=>visible.has(sc.rate)).map(sc=>({sc,rate:sc.rate,color:SCENARIO_COLORS[sc.rate]||'#64748b',vals:idx.map(i=>futureValue(currentWealth,monthlyPlan,i,sc.rate))}));
 if(realInvestment>0)curves.push({real:true,color:REALITY_COLOR,vals:idx.map(i=>futureValue(currentWealth,realInvestment,i,rate))});
 const good=curves.filter(c=>c.vals.every(Number.isFinite));
 const maxFinal=Math.max(0,...good.map(c=>c.vals[c.vals.length-1])),ymax=Math.max(maxFinal*1.1,target*1.15);
 const X=i=>pL+i/months*pw,Y=v=>pT+(1-v/ymax)*ph,pt=(i,v)=>f1(X(i))+' '+f1(Y(v));
 const seg=a=>a.map((p,k)=>(k?'L':'M')+pt(p[0],p[1])).join(' ');
 const ty=Y(target),right=pL+pw;
 const rects=[],hit=(a,b)=>a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0;
 let out=[0,.5,1].map(t=>`<line class="sc-grid" x1="${pL}" y1="${f1(pT+t*ph)}" x2="${right}" y2="${f1(pT+t*ph)}"/><text x="${pL-6}" y="${f1(pT+t*ph+3)}" text-anchor="end">${compact(ymax*(1-t))}</text>`).join('');
 const metaText='Meta '+compact(target);
 out+=`<line class="sc-target" x1="${pL}" y1="${f1(ty)}" x2="${right}" y2="${f1(ty)}"/><text x="${pL+4}" y="${f1(ty-5)}">${metaText}</text><line class="sc-deadline" x1="${right}" y1="${pT}" x2="${right}" y2="${pT+ph}"/>`;
 rects.push({x0:pL+2,x1:pL+6+tw(metaText),y0:ty-15,y1:ty-2});
 const parts=[],cross=[];
 good.forEach(c=>{
  const pts=idx.map((i,k)=>[i,c.vals[k]]);let dark=pts,light=[];
  if(!c.real){const m=c.sc.monthsToGoal;
   if(m<=0){dark=[];light=pts}
   else if(isFinite(m)&&m<months){dark=pts.filter(p=>p[0]<m).concat([[m,target]]);light=[[m,target]].concat(pts.filter(p=>p[0]>m))}
   if(isFinite(m)&&m>0&&m<=months&&m<=600)cross.push({x:X(m),color:c.color,text:fmtPct(c.rate)+'% · '+formatMonthsToGoal(m),m,rate:c.rate});
  }
  const dash=c.real?' stroke-dasharray="6 4"':'';
  if(dark.length>1)parts.push(`<path d="${seg(dark)}" fill="none" stroke="${c.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"${dash}/>`);
  if(light.length>1)parts.push(`<path d="${seg(light)}" fill="none" stroke="${c.color}" stroke-opacity=".4" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"${dash}/>`);
 });
 out+=parts.join('');
 const ends=good.map(c=>({c,v:c.vals[c.vals.length-1],y:Y(c.vals[c.vals.length-1])})).sort((a,b)=>a.y-b.y);
 let prev=-1e9;ends.forEach(e=>{e.ly=Math.max(e.y,prev+14);prev=e.ly});
 const lim=pT+ph+8;if(ends.length&&ends[ends.length-1].ly>lim){let nx=lim;for(let i=ends.length-1;i>=0;i--){ends[i].ly=Math.min(ends[i].ly,nx);nx=ends[i].ly-14}}
 ends.forEach(e=>{const t=compact(e.v),lx=right+9,name=e.c.real?'Realidade':fmtPct(e.c.rate)+'% a.m.';
  if(Math.abs(e.ly-e.y)>3)out+=`<line x1="${f1(right+3)}" y1="${f1(e.y)}" x2="${f1(lx-2)}" y2="${f1(e.ly-3)}" stroke="${e.c.color}" stroke-opacity=".5" stroke-width="1"/>`;
  out+=`<circle cx="${f1(right)}" cy="${f1(e.y)}" r="4" fill="${e.c.color}" stroke="#fff" stroke-width="1.5" data-end="${e.c.real?'real':e.c.rate}" data-final="${e.v}"><title>${name}: ${moneyFn(e.v)}</title></circle><text class="sc-end" x="${lx}" y="${f1(e.ly+3)}" fill="${e.c.color}" style="fill:${e.c.color}">${t}</text>`;
  rects.push({x0:lx-1,x1:lx+tw(t)+1,y0:e.ly-9,y1:e.ly+4});
 });
 cross.forEach(k=>rects.push({x0:k.x-6,x1:k.x+6,y0:ty-6,y1:ty+6}));
 cross.sort((a,b)=>a.x-b.x).forEach(k=>{
  const w=tw(k.text);let placed=null;
  for(const dy of [-7,15,-21,29,-35,43,-49,57]){for(const an of ['start','end']){
   const y=ty+dy,x0=an==='start'?k.x+7:k.x-7-w,r={x0,x1:x0+w,y0:y-10,y1:y+3};
   if(x0<2||r.x1>W-2||y<pT+8||y>H-pB-3||rects.some(q=>hit(r,q)))continue;
   placed={r,an,y};break}
   if(placed)break}
  if(!placed){const y=ty-7,an='start',x0=k.x+7;placed={r:{x0,x1:x0+w,y0:y-10,y1:y+3},an,y}}
  rects.push(placed.r);
  out+=`<circle cx="${f1(k.x)}" cy="${f1(ty)}" r="4" fill="#fff" stroke="${k.color}" stroke-width="2" data-cross="${k.m}" data-rate="${k.rate}"><title>${k.text}</title></circle><text class="sc-cross" x="${f1(placed.an==='start'?k.x+7:k.x-7)}" y="${f1(placed.y)}" text-anchor="${placed.an}" style="fill:${k.color}">${k.text}</text>`;
 });
 out+=`<text x="${pL}" y="${H-8}">Hoje</text><text x="${W-4}" y="${H-8}" text-anchor="end">Prazo: ${years} ${years===1?'ano':'anos'}</text>`;
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Evolução do patrimônio em cada taxa de rendimento até o prazo da meta">${out}</svg>`;
}
function header(u,name){set('user-name',name);set('user-email',u.email||'');set('user-avatar',initials(name));set('menu-full-name',name);set('menu-full-email',u.email||'');set('menu-avatar',initials(name));$('user-menu-btn')?.addEventListener('click',e=>{e.stopPropagation();$('user-menu')?.classList.toggle('hidden')});document.addEventListener('click',()=> $('user-menu')?.classList.add('hidden'));$('logout')?.addEventListener('click',async()=>{await KORbuildAuth.logout();location.replace('index.html')});$('language-toggle')?.addEventListener('click',()=>{localStorage.setItem('korbuild-language',(localStorage.getItem('korbuild-language')||'pt-BR')==='pt-BR'?'en-US':'pt-BR');location.reload()})}
function projectionChart(current,target,planned,real,months,moneyFn){const el=$('projection-chart');if(!el)return;const n=Math.min(Math.max(months,6),60),w=760,h=220,pL=54,pR=12,pT=15,pB=30,max=Math.max(target,current,planned,real,1),pointsFor=v=>Array.from({length:n+1},(_,i)=>{const t=i/n,val=v(i);return{x:pL+t*(w-pL-pR),y:pT+(max-val)/max*(h-pT-pB)}}),planPts=pointsFor(i=>futureValue(current,planned,i,0)),realPts=pointsFor(i=>futureValue(current,real,i,0)),path=pts=>pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' '),area=`M ${planPts[0].x} ${h-pB} L ${planPts.map(p=>`${p.x} ${p.y}`).join(' L ')} L ${planPts[planPts.length-1].x} ${h-pB} Z`,grid=[0,.5,1].map(t=>{const y=pT+t*(h-pT-pB),v=max*(1-t);return `<line x1="${pL}" y1="${y}" x2="${w-pR}" y2="${y}" class="p-grid"/><text x="${pL-8}" y="${y+3}" text-anchor="end">${moneyFn(v)}</text>`}).join('');el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Projeção do plano versus realidade">${grid}<line x1="${pL}" y1="${pT+(max-target)/max*(h-pT-pB)}" x2="${w-pR}" y2="${pT+(max-target)/max*(h-pT-pB)}" class="p-target"/><path d="${area}" class="p-plan-area"/><path d="${path(planPts)}" class="p-plan"/><path d="${path(realPts)}" class="p-real"/><circle cx="${planPts[n].x}" cy="${planPts[n].y}" r="4" fill="#15935d"/><circle cx="${realPts[n].x}" cy="${realPts[n].y}" r="4" fill="#2474e8"/><text x="${pL}" y="${h-8}">Hoje</text><text x="${w-pR}" y="${h-8}" text-anchor="end">Prazo</text></svg>`}
async function load(){
 const s=await KORbuildAuth.session();if(!s?.user){location.replace('index.html');return}
 const {data:w,error:we}=await db().from('user_workspaces').select('id,display_name,primary_currency,setup_completed').eq('user_id',s.user.id).maybeSingle();if(we)throw we;if(!w?.setup_completed){location.replace('workspace.html');return}
 header(s.user,w.display_name||s.user.email?.split('@')[0]||'André');
 const now=new Date(),[start,end]=monthBounds(now),sixStart=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString().slice(0,10),twelveStart=new Date(now.getFullYear(),now.getMonth()-11,1).toISOString().slice(0,10),primary=code(w.primary_currency||'BRL');
 const [{data:goals,error:ge},{data:plans,error:pe},{data:accounts,error:ae},{data:positions,error:pose},{data:tx,error:te},{data:expenses,error:ee},{data:incomes,error:ie}]=await Promise.all([
  db().from('goals').select('id,name,target_amount,target_years,start_date,initial_wealth,include_initial_wealth,created_at').eq('workspace_id',w.id).order('created_at',{ascending:false}).limit(1),
  db().from('plans').select('id,goal_id,projected_monthly_contribution,projected_monthly_rate,created_at').eq('workspace_id',w.id).order('created_at',{ascending:false}).limit(1),
  db().from('accounts').select('opening_balance,currency').eq('workspace_id',w.id),
  db().from('investment_positions').select('position_value,currency').eq('workspace_id',w.id),
  db().from('investment_transactions').select('amount,currency,transaction_type,transaction_date').eq('workspace_id',w.id).gte('transaction_date',twelveStart).lt('transaction_date',end),
  db().from('expenses').select('amount,currency,status,paid_date').eq('workspace_id',w.id).gte('paid_date',twelveStart).lt('paid_date',end),
  db().from('incomes').select('amount,currency,status,receipt_date').eq('workspace_id',w.id).gte('receipt_date',twelveStart).lt('receipt_date',end)
 ]);if(ge||pe||ae||pose||te||ee||ie)throw ge||pe||ae||pose||te||ee||ie;
 const goal=(goals||[])[0];
 if(!goal){$('no-plan')?.classList.remove('hidden');$('plan-content')?.classList.add('hidden');return}
 $('plan-content')?.classList.remove('hidden');
 const plan=(plans||[])[0],ar=accounts||[],pos=positions||[],itx=tx||[],ex=expenses||[],inc=incomes||[];
 const balance=ar.filter(a=>code(a.currency)===primary).reduce((s,a)=>s+Number(a.opening_balance||0),0),investedValue=pos.filter(p=>code(p.currency)===primary).reduce((s,p)=>s+Number(p.position_value||0),0),currentWealth=goal.include_initial_wealth?Number(goal.initial_wealth||0):balance+investedValue;
 const monthlyPlan=Number(plan?.projected_monthly_contribution||0),rate=Number(plan?.projected_monthly_rate||0),years=Number(goal.target_years||0),months=Math.max(0,Math.round(years*12)),target=Number(goal.target_amount||0);
 const income6=inc.filter(x=>x.status==='realized'&&x.receipt_date>=sixStart&&x.receipt_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0),expense6=ex.filter(x=>x.status==='realized'&&x.paid_date>=sixStart&&x.paid_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0),invest6=itx.filter(x=>['contribution','adjustment'].includes(x.transaction_type)&&x.transaction_date>=sixStart&&x.transaction_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0);
 const capacity=Math.max(0,(income6-expense6)/6),realInvestment=Math.max(0,invest6/6),projected=futureValue(currentWealth,monthlyPlan,months,rate),realProjected=futureValue(currentWealth,realInvestment,months,rate),remaining=Math.max(0,target-currentWealth),progress=target?Math.min(100,Math.max(0,currentWealth/target*100)):0;
 const incomeMonth=inc.filter(x=>x.status==='realized'&&x.receipt_date>=start&&x.receipt_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0),expenseMonth=ex.filter(x=>x.status==='realized'&&x.paid_date>=start&&x.paid_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0),investMonth=itx.filter(x=>['contribution','adjustment'].includes(x.transaction_type)&&x.transaction_date>=start&&x.transaction_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0);

 // REALIDADE: janela móvel de até 12 meses. Mês sem dados não entra no divisor.
 const realityMonths=new Map();
 const ensureMonth=k=>{if(!realityMonths.has(k))realityMonths.set(k,{income:0,expense:0,investment:0})};
 inc.filter(x=>x.status==='realized'&&x.receipt_date>=twelveStart&&x.receipt_date<end&&code(x.currency)===primary).forEach(x=>{const k=x.receipt_date.slice(0,7);ensureMonth(k);realityMonths.get(k).income+=Number(x.amount||0)});
 ex.filter(x=>x.status==='realized'&&x.paid_date>=twelveStart&&x.paid_date<end&&code(x.currency)===primary).forEach(x=>{const k=x.paid_date.slice(0,7);ensureMonth(k);realityMonths.get(k).expense+=Number(x.amount||0)});
 itx.filter(x=>['contribution','adjustment'].includes(x.transaction_type)&&x.transaction_date>=twelveStart&&x.transaction_date<end&&code(x.currency)===primary).forEach(x=>{const k=x.transaction_date.slice(0,7);ensureMonth(k);realityMonths.get(k).investment+=Number(x.amount||0)});
 const realityRows=[...realityMonths.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([month,v])=>({month,...v,capacity:v.income-v.expense}));
 const realityCount=realityRows.length, realityCapacity=realityCount?Math.max(0,realityRows.reduce((s,x)=>s+x.capacity,0)/realityCount):0, realityInvestment=realityCount?Math.max(0,realityRows.reduce((s,x)=>s+x.investment,0)/realityCount):0;
 const realityPeriod=realityCount===0?'Sem histórico':realityCount===1?'1 mês disponível':`Últimos ${Math.min(realityCount,12)} meses`;
 const realityBase=realityCount===0?'Base da análise: nenhum mês com movimentações realizadas.':realityCount===1?'Base da análise: 1 mês com dados realizados.':`Base da análise: ${realityCount} meses com dados realizados, dentro de uma janela móvel de até 12 meses.`;
 const moneyFn=v=>money(v,primary);
 const rateScenarios=RATE_SCENARIOS.map(r=>({rate:r,monthsToGoal:monthsToGoal(currentWealth,monthlyPlan,r,target),valueAtDeadline:futureValue(currentWealth,monthlyPlan,months,r),required:requiredMonthly(currentWealth,target,months,r)}));
 const allInfinite=rateScenarios.every(sc=>!isFinite(sc.monthsToGoal));
 const reachClass=classify(rateScenarios.map(sc=>sc.monthsToGoal<=months));
 const capClass=classify(rateScenarios.map(sc=>capacity>=sc.required));
 const realityCapClass=classify(rateScenarios.map(sc=>realityCapacity>=sc.required));
 const required0=rateScenarios[0].required,required2=rateScenarios[rateScenarios.length-1].required;
 set('goal-name',goal.name||'Meu sonho');set('goal-description',`Meta de ${moneyFn(target)} em ${years||0} anos.`);set('target',moneyFn(target,primary));set('current-wealth',moneyFn(currentWealth,primary));set('remaining',moneyFn(remaining,primary));set('progress',progress.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%');
 set('real-capacity',moneyFn(realityCapacity));set('real-investment',moneyFn(realityInvestment));set('real-capacity-label',realityCount===1?'Capacidade do mês':'Capacidade média de acumulação');set('real-investment-label',realityCount===1?'Investimento do mês':'Investimento médio');set('reality-period',realityPeriod);set('reality-base',realityBase);
 function renderScenariosTable(){
  const showExtra=$('show-purchasing-power')?.checked,isBRL=primary==='BRL';
  const head=$('rate-scenarios-head'),body=$('rate-scenarios-body');
  if(!head||!body)return;
  const headCells=['Taxa','Tempo até a meta','Valor acumulado no prazo original','Necessário pra bater no prazo'];
  if(showExtra){headCells.push('Poder de compra hoje');if(isBRL)headCells.push('Valor líquido (após IR)')}
  head.innerHTML='<tr>'+headCells.map(h=>`<th>${h}</th>`).join('')+'</tr>';
  const inflationRate=INFLATION_BY_CURRENCY[primary]??0.025,years=months/12,days=months*30;
  const bracket=days<=180?0.225:days<=360?0.20:days<=720?0.175:0.15,totalContributed=monthlyPlan*months;
  body.innerHTML=rateScenarios.map(sc=>{
   let row=`<td>${sc.rate.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}% a.m.</td><td>${formatMonthsToGoal(sc.monthsToGoal)}</td><td>${moneyFn(sc.valueAtDeadline)}</td><td>${moneyFn(sc.required)}</td>`;
   if(showExtra){
    const realValue=sc.valueAtDeadline/Math.pow(1+inflationRate,years);
    row+=`<td>${moneyFn(realValue)}</td>`;
    if(isBRL){
     const gain=Math.max(0,sc.valueAtDeadline-currentWealth-totalContributed),netValue=sc.valueAtDeadline-gain*bracket;
     row+=`<td>${moneyFn(netValue)}</td>`;
    }
   }
   return `<tr>${row}</tr>`;
  }).join('');
 }
 renderScenariosTable();
 $('show-purchasing-power')?.addEventListener('change',()=>{renderScenariosTable();$('purchasing-power-note')?.classList.toggle('hidden',!$('show-purchasing-power')?.checked)});
 const visibleRates=new Set([0,0.5]),chipsEl=$('scenario-chips'),chartEl=$('scenario-chart'),hasReality=realInvestment>0;
 const drawChart=()=>drawScenarioChart({el:chartEl,visible:visibleRates,scenarios:rateScenarios,currentWealth,monthlyPlan,months,years,target,rate,realInvestment,primary,moneyFn});
 const renderChips=()=>{if(!chipsEl)return;chipsEl.innerHTML=RATE_SCENARIOS.map(r=>`<button type="button" class="scenario-chip" data-rate="${r}" aria-pressed="${visibleRates.has(r)}"><i style="background:${SCENARIO_COLORS[r]}"></i>${fmtPct(r)}% a.m.${r>0?`<small>≈ ${fmtPct(annualEquivalent(r))}% a.a.</small>`:''}</button>`).join('')+(hasReality?'<span class="scenario-legend"><i></i>Realidade</span>':'')};
 renderChips();set('scenario-reality-note',hasReality?'':'Ainda sem lançamentos suficientes para mostrar sua realidade');
 chipsEl?.addEventListener('click',e=>{const b=e.target.closest('.scenario-chip');if(!b)return;const r=Number(b.dataset.rate);if(visibleRates.has(r))visibleRates.delete(r);else visibleRates.add(r);renderChips();drawChart()});
 let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawChart,150)});
 drawChart();
 set('projected',moneyFn(projected));set('real-projected',moneyFn(realProjected));set('projected-gap',realProjected>=target?'Objetivo alcançado pelo ritmo real':'Faltariam '+moneyFn(Math.max(0,target-realProjected))+' no ritmo real');
 set('month-income',moneyFn(incomeMonth));set('month-expenses',moneyFn(expenseMonth));set('month-invested',moneyFn(investMonth));
 const bar=$('progress-bar');if(bar)bar.style.width=progress+'%';
 const status=$('plan-status');
 if(status){
  const text=allInfinite?NO_CONTRIBUTION_TEXT:capClass==='all'?'Você está no caminho em qualquer cenário simulado':capClass==='none'?'Precisamos ajustar o ritmo':'Depende do rendimento — ajuste pode ser necessário';
  const cls=allInfinite?'neutral':capClass==='all'?'on-track':capClass==='none'?'attention':'mixed';
  status.textContent=text;status.className='plan-status '+cls;
 }
 const badge=$('projection-badge');
 if(badge){
  const text=allInfinite?NO_CONTRIBUTION_TEXT:reachClass==='all'?'Plano alcança a meta em todos os cenários':reachClass==='none'?'Plano não alcança a meta em nenhum cenário simulado':'Depende do rendimento simulado';
  const cls=allInfinite?'neutral':reachClass==='all'?'on-track':reachClass==='none'?'attention':'mixed';
  badge.textContent=text;badge.className='projection-badge '+cls;
 }
 set('reality-note',realityCount===0?'Ainda não há movimentações realizadas suficientes para medir sua capacidade financeira.':allInfinite?NO_CONTRIBUTION_TEXT:realityCapClass==='all'?'Sua capacidade financeira está acima do ritmo necessário em qualquer cenário simulado.':realityCapClass==='none'?'Sua capacidade financeira ainda está abaixo do ritmo necessário, mesmo no cenário mais otimista simulado.':'Depende do rendimento obtido — sua capacidade pode ou não ser suficiente, dependendo da taxa de retorno.');
 if(allInfinite){
  set('next-title','Adicione um aporte');set('next-text',NO_CONTRIBUTION_TEXT);set('next-highlight','—');
 }else if(capClass==='all'){
  set('next-title','Continue e acompanhe');set('next-text','Mesmo no cenário mais conservador (0% a.m.), sua capacidade sustenta o ritmo necessário.');set('next-highlight',`Margem no cenário mais conservador: ${moneyFn(capacity-required0)} por mês.`);
 }else if(capClass==='none'){
  set('next-title','O plano precisa de atenção');set('next-text','Mesmo no cenário mais otimista simulado (2% a.m.), há uma diferença entre sua capacidade e o ritmo necessário.');set('next-highlight',`Ajuste necessário mesmo no melhor cenário: ${moneyFn(required2-capacity)} por mês.`);
 }else{
  set('next-title','O resultado depende do rendimento');set('next-text','Dependendo do rendimento obtido, sua capacidade pode ou não sustentar o ritmo necessário — veja os cenários na tabela acima.');set('next-highlight',`Falta ${moneyFn(required0-capacity)}/mês no cenário conservador; sobra ${moneyFn(capacity-required2)}/mês no otimista.`);
 }
 projectionChart(currentWealth,target,monthlyPlan,realInvestment,months,moneyFn);
}
load().catch(e=>{console.error(e);const st=$('status');if(st){st.textContent='Não foi possível carregar o planejamento.';st.classList.remove('hidden')}});
})();