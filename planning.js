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
// Gráfico dos cenários de rendimento (SVG à mão). Eixo Y dinâmico, meta/prazo, linha vertical + tempo na base por cruzamento, caixa de informações do elemento sob o cursor.
const shortTime=m=>{const t=Math.round(m),y=Math.floor(t/12),mo=t%12;return [y?y+'a':'',mo||!y?mo+'m':''].filter(Boolean).join(' ')};
let scenarioTipBound=false;
function drawScenarioChart(o){
 const el=o.el;if(!el)return;
 const {visible,scenarios,currentWealth,monthlyPlan,months,years,target,rate,realInvestment,primary,moneyFn}=o;
 if(!(months>0)||!(target>0)){el.innerHTML='';return}
 const W=Math.max(300,Math.round(el.clientWidth||760)),pL=66,pR=84,pT=28,pB=36,pw=W-pL-pR;
 let cf=null;try{cf=new Intl.NumberFormat('pt-BR',{style:'currency',currency:primary,notation:'compact',maximumFractionDigits:1})}catch{}
 const compact=v=>cf?cf.format(v):moneyFn(v),tw=s=>s.length*5.3,f1=n=>n.toFixed(1),yrs=years+' '+(years===1?'ano':'anos');
 const step=Math.max(1,Math.ceil(months/120)),idx=[];for(let i=0;i<months;i+=step)idx.push(i);idx.push(months);
 const curves=scenarios.filter(sc=>visible.has(sc.rate)).map(sc=>({sc,rate:sc.rate,color:SCENARIO_COLORS[sc.rate]||'#64748b',vals:idx.map(i=>futureValue(currentWealth,monthlyPlan,i,sc.rate))}));
 if(realInvestment>0)curves.push({real:true,color:REALITY_COLOR,vals:idx.map(i=>futureValue(currentWealth,realInvestment,i,rate))});
 const good=curves.filter(c=>c.vals.every(Number.isFinite));
 const valueAt=(c,mo)=>c.real?futureValue(currentWealth,realInvestment,mo,rate):futureValue(currentWealth,monthlyPlan,mo,c.rate);
 const maxFinal=Math.max(0,...good.map(c=>c.vals[c.vals.length-1])),ymax=Math.max(maxFinal*1.1,target*1.15);
 const right=pL+pw,X=i=>pL+i/months*pw;
 // Cruzamentos válidos (só quando a curva bate a meta dentro do prazo). Níveis dos tempos na base: <52px do anterior sobe uma linha (13px).
 const hit=(a,b)=>a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0,placedT=[];
 const cross=good.filter(c=>{const m=c.real?NaN:c.sc.monthsToGoal;return isFinite(m)&&m>0&&m<=months&&m<=600}).map(c=>({color:c.color,m:c.sc.monthsToGoal,rate:c.rate,sc:c.sc,x:X(c.sc.monthsToGoal)})).sort((a,b)=>a.x-b.x);
 cross.forEach(k=>{
  k.label=shortTime(k.m);const w=tw(k.label);k.an='start';let x0=k.x+4;if(x0+w>right){k.an='end';x0=k.x-4-w}
  const rc=lv=>({x0,x1:x0+w,y0:-14-lv*13,y1:-2-lv*13});let lv=0;
  while(lv<6&&placedT.some(p=>p.lv===lv&&(Math.abs(p.x-k.x)<52||hit(rc(lv),p.r))))lv++;
  k.lv=lv;placedT.push({x:k.x,lv,r:rc(lv)});
 });
 // Altura: os tempos empilhados precisam caber abaixo da linha da meta (não encostar nos pontos).
 const maxLv=cross.reduce((a,k)=>Math.max(a,k.lv),-1),baseH=W<520?260:310;
 const H=Math.min(520,Math.max(baseH,cross.length?Math.ceil((22+13*maxLv)*ymax/target)+pT+pB:0)),ph=H-pT-pB,axisY=pT+ph;
 const Y=v=>pT+(1-v/ymax)*ph,pt=(i,v)=>f1(X(i))+' '+f1(Y(v));
 const seg=a=>a.map((p,k)=>(k?'L':'M')+pt(p[0],p[1])).join(' ');
 const ty=Y(target);
 let out=[0,.5,1].map(t=>`<line class="sc-grid" x1="${pL}" y1="${f1(pT+t*ph)}" x2="${right}" y2="${f1(pT+t*ph)}"/><text x="${pL-6}" y="${f1(pT+t*ph+3)}" text-anchor="end">${compact(ymax*(1-t))}</text>`).join('');
 out+=`<line x1="${pL}" y1="${f1(axisY)}" x2="${right}" y2="${f1(axisY)}" stroke="#cfd8e0"/>`;
 out+=`<line class="sc-target" x1="${pL}" y1="${f1(ty)}" x2="${right}" y2="${f1(ty)}"/><text x="${pL+4}" y="${f1(ty-5)}">Meta ${compact(target)}</text><line class="sc-deadline" x1="${right}" y1="${pT}" x2="${right}" y2="${f1(axisY)}"/>`;
 const yr=months/12;let ystep=yr>25?5:yr>12?2:1;
 for(const s of [1,2,5,10,20,50]){if(s<ystep)continue;ystep=s;if(pw*ystep/yr>=26)break}
 for(let yv=0;yv<=yr+1e-9;yv+=ystep){const x=f1(X(yv*12));out+=`<line x1="${x}" y1="${f1(axisY)}" x2="${x}" y2="${f1(axisY+4)}" stroke="#b8c2cc"/><text x="${x}" y="${f1(axisY+16)}" text-anchor="middle">${yv} a</text>`}
 out+=`<text x="${W-4}" y="12" text-anchor="end">Prazo: ${yrs}</text>`;
 const parts=[];
 good.forEach(c=>{
  const pts=idx.map((i,k)=>[i,c.vals[k]]);let dark=pts,light=[];
  if(!c.real){const m=c.sc.monthsToGoal;
   if(m<=0){dark=[];light=pts}
   else if(isFinite(m)&&m<months){dark=pts.filter(p=>p[0]<m).concat([[m,target]]);light=[[m,target]].concat(pts.filter(p=>p[0]>m))}
  }
  const dash=c.real?' stroke-dasharray="6 4"':'';
  if(dark.length>1)parts.push(`<path d="${seg(dark)}" fill="none" stroke="${c.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"${dash}/>`);
  if(light.length>1)parts.push(`<path d="${seg(light)}" fill="none" stroke="${c.color}" stroke-opacity=".4" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"${dash}/>`);
 });
 out+=parts.join('');
 const ends=good.map(c=>({c,v:c.vals[c.vals.length-1],y:Y(c.vals[c.vals.length-1])})).sort((a,b)=>a.y-b.y);
 let prev=-1e9;ends.forEach(e=>{e.ly=Math.max(e.y,prev+14);prev=e.ly});
 const lim=axisY+8;if(ends.length&&ends[ends.length-1].ly>lim){let nx=lim;for(let i=ends.length-1;i>=0;i--){ends[i].ly=Math.min(ends[i].ly,nx);nx=ends[i].ly-14}}
 // Cruzamentos: linha vertical tracejada até o eixo, ponto e tempo curto colado à linha.
 cross.forEach(k=>{
  const label=k.label,an=k.an,lv=k.lv;
  const aria=`${fmtPct(k.rate)}% a.m. Bate a meta em ${formatMonthsToGoal(k.m)}. Valor no prazo (${yrs}): ${moneyFn(k.sc.valueAtDeadline)}`;
  out+=`<g class="sc-vgroup" tabindex="0" role="img" aria-label="${aria}" data-rate="${k.rate}"><line x1="${f1(k.x)}" y1="${f1(ty)}" x2="${f1(k.x)}" y2="${f1(axisY)}" stroke="transparent" stroke-width="16"/><line class="sc-vline" x1="${f1(k.x)}" y1="${f1(ty)}" x2="${f1(k.x)}" y2="${f1(axisY)}" stroke="${k.color}" stroke-width="1.5" stroke-dasharray="4 3"/><circle cx="${f1(k.x)}" cy="${f1(ty)}" r="5" fill="${k.color}" stroke="#fff" stroke-width="2" data-cross="${k.m}" data-rate="${k.rate}"/></g><text class="sc-time" x="${f1(an==='start'?k.x+4:k.x-4)}" y="${f1(axisY-4-lv*13)}" text-anchor="${an}" style="fill:${k.color}">${label}</text>`;
 });
 ends.forEach(e=>{const t=compact(e.v),lx=right+9;
  if(Math.abs(e.ly-e.y)>3)out+=`<line x1="${f1(right+3)}" y1="${f1(e.y)}" x2="${f1(lx-2)}" y2="${f1(e.ly-3)}" stroke="${e.c.color}" stroke-opacity=".5" stroke-width="1"/>`;
  out+=`<circle cx="${f1(right)}" cy="${f1(e.y)}" r="4" fill="${e.c.color}" stroke="#fff" stroke-width="1.5" data-end="${e.c.real?'real':e.c.rate}" data-final="${e.v}"/><text class="sc-end" x="${lx}" y="${f1(e.ly+3)}" style="fill:${e.c.color}">${t}</text>`;
 });
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Evolução do patrimônio em cada taxa de rendimento até o prazo da meta">${out}</svg><div class="sc-tip" hidden></div>`;
 // Caixa de informações: só o elemento sob o cursor. Mouse: segue o cursor; toque: toca abre, toca fora fecha.
 const svg=el.querySelector('svg'),tip=el.querySelector('.sc-tip');
 const hide=()=>{tip.hidden=true;svg.querySelector('#sc-hover')?.remove()};
 const setTip=(title,lines)=>{tip.innerHTML=`<strong>${title}</strong>`+lines.map(l=>`<span>${l}</span>`).join('')};
 const place=(cx,cy)=>{tip.hidden=false;tip.style.left='0px';tip.style.top='0px';const tw_=tip.offsetWidth,th=tip.offsetHeight,cw=el.clientWidth,ch=el.clientHeight;let left=cx+14,top=cy+14;if(left+tw_>cw)left=cx-tw_-14;if(top+th>ch)top=cy-th-14;tip.style.left=Math.max(0,left)+'px';tip.style.top=Math.max(0,top)+'px'};
 const vInfo=g=>{const k=cross.find(c=>String(c.rate)===g.dataset.rate);return {title:fmtPct(k.rate)+'% a.m.',lines:['Bate a meta em '+formatMonthsToGoal(k.m),`Valor no prazo (${yrs}): ${moneyFn(k.sc.valueAtDeadline)}`]}};
 const at=e=>{
  const rc=svg.getBoundingClientRect(),cr=el.getBoundingClientRect(),sx=W/rc.width,x=(e.clientX-rc.left)*sx,y=(e.clientY-rc.top)*sx,g=e.target.closest?.('.sc-vgroup');
  svg.querySelector('#sc-hover')?.remove();
  if(g){const i=vInfo(g);setTip(i.title,i.lines);place(e.clientX-cr.left,e.clientY-cr.top);return}
  if(x<pL-2||x>right+2||y<pT-2||y>axisY+2){hide();return}
  const mo=Math.max(0,Math.min(months,Math.round((x-pL)/pw*months)));let best=null;
  good.forEach(c=>{const v=valueAt(c,mo),d=Math.abs(Y(v)-y);if(d<(best?best.d:18))best={c,v,d}});
  if(!best){hide();return}
  setTip(`Ano ${fmtPct(mo/12)} · ${best.c.real?'Realidade':fmtPct(best.c.rate)+'% a.m.'}`,[moneyFn(best.v)]);
  svg.insertAdjacentHTML('beforeend',`<circle id="sc-hover" cx="${f1(X(mo))}" cy="${f1(Y(best.v))}" r="4" fill="${best.c.color}" stroke="#fff" stroke-width="1.5" pointer-events="none"/>`);
  place(e.clientX-cr.left,e.clientY-cr.top);
 };
 svg.addEventListener('pointermove',at);svg.addEventListener('pointerdown',at);
 svg.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')hide()});
 svg.querySelectorAll('.sc-vgroup').forEach(g=>{
  g.addEventListener('focus',()=>{const i=vInfo(g);setTip(i.title,i.lines);const b=g.querySelector('circle').getBoundingClientRect(),cr=el.getBoundingClientRect();place(b.left-cr.left+b.width/2,b.top-cr.top)});
  g.addEventListener('blur',hide);g.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 });
 if(!scenarioTipBound){scenarioTipBound=true;document.addEventListener('pointerdown',e=>{const c=document.getElementById('scenario-chart');if(c&&!c.contains(e.target)){c.querySelector('.sc-tip')?.setAttribute('hidden','');c.querySelector('#sc-hover')?.remove()}})}
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