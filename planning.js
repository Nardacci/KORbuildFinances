/* KORbuild Finances — Planejamento V1.0 */
(()=>{'use strict';
const $=id=>document.getElementById(id),db=()=>KORbuildAuth.client.schema('finances');
const money=(v,c='BRL')=>{try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:String(c||'BRL').split(/\s+—\s+/)[0].trim().toUpperCase(),maximumFractionDigits:0}).format(Number(v)||0)}catch{return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})}};
const code=v=>String(v||'').split(/\s+—\s+/)[0].trim().toUpperCase();
const initials=n=>String(n||'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'A';
function set(id,v){const e=$(id);if(e)e.textContent=v}
function header(u,name){set('user-name',name);set('user-email',u.email||'');set('user-avatar',initials(name));set('menu-full-name',name);set('menu-full-email',u.email||'');set('menu-avatar',initials(name));$('user-menu-btn')?.addEventListener('click',e=>{e.stopPropagation();$('user-menu')?.classList.toggle('hidden')});$('logout')?.addEventListener('click',async()=>{await KORbuildAuth.logout();location.replace('index.html')})}
function monthBounds(d){const s=new Date(d.getFullYear(),d.getMonth(),1),e=new Date(d.getFullYear(),d.getMonth()+1,1);return[s.toISOString().slice(0,10),e.toISOString().slice(0,10)]}
function futureValue(present,monthly,n,rate){const r=rate/100;if(!n)return present;return present*Math.pow(1+r,n)+monthly*(r?((Math.pow(1+r,n)-1)/r):n)}
async function load(){
 const s=await KORbuildAuth.session();if(!s?.user){location.replace('index.html');return}
 const {data:w,error:we}=await db().from('user_workspaces').select('id,display_name,primary_currency,setup_completed').eq('user_id',s.user.id).maybeSingle();if(we)throw we;if(!w?.setup_completed){location.replace('workspace.html');return}
 header(s.user,w.display_name||s.user.email?.split('@')[0]||'André');
 const now=new Date(),[start,end]=monthBounds(now),primary=code(w.primary_currency||'BRL');
 const [{data:goals,error:ge},{data:plans,error:pe},{data:accounts,error:ae},{data:positions,error:pose},{data:tx,error:te},{data:expenses,error:ee},{data:incomes,error:ie}]=await Promise.all([
  db().from('goals').select('id,name,target_amount,target_years,start_date,initial_wealth,include_initial_wealth,created_at').eq('workspace_id',w.id).order('created_at',{ascending:false}).limit(1),
  db().from('plans').select('id,goal_id,projected_monthly_contribution,projected_monthly_rate,created_at').eq('workspace_id',w.id).order('created_at',{ascending:false}).limit(1),
  db().from('accounts').select('opening_balance,currency').eq('workspace_id',w.id),
  db().from('investment_positions').select('position_value,currency').eq('workspace_id',w.id),
  db().from('investment_transactions').select('amount,currency,transaction_type,transaction_date').eq('workspace_id',w.id).gte('transaction_date',start).lt('transaction_date',end),
  db().from('expenses').select('amount,currency,status,paid_date').eq('workspace_id',w.id),
  db().from('incomes').select('amount,currency,status,receipt_date').eq('workspace_id',w.id)
 ]);if(ge||pe||ae||pose||te||ee||ie)throw ge||pe||ae||pose||te||ee||ie;
 const goal=(goals||[])[0],plan=(plans||[])[0];
 if(!goal){$('no-plan')?.classList.remove('hidden');$('plan-content')?.classList.add('hidden');return}
 const ar=accounts||[],pos=positions||[],itx=tx||[],ex=expenses||[],inc=incomes||[];
 const balance=ar.filter(a=>code(a.currency)===primary).reduce((s,a)=>s+Number(a.opening_balance||0),0);
 const investedValue=pos.filter(p=>code(p.currency)===primary).reduce((s,p)=>s+Number(p.position_value||0),0);
 const currentWealth=goal.include_initial_wealth?Number(goal.initial_wealth||0):balance+investedValue;
 const monthlyContribution=Number(plan?.projected_monthly_contribution||0),rate=Number(plan?.projected_monthly_rate||0),years=Number(goal.target_years||0),months=Math.max(0,Math.round(years*12));
 const target=Number(goal.target_amount||0),projected=futureValue(currentWealth,monthlyContribution,months,rate),progress=target?Math.min(100,Math.max(0,currentWealth/target*100)):0;
 const investedThisMonth=itx.filter(x=>['contribution','adjustment'].includes(x.transaction_type)&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0);
 const expensesThisMonth=ex.filter(x=>x.status==='realized'&&x.paid_date>=start&&x.paid_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0);
 const incomeThisMonth=inc.filter(x=>x.status==='realized'&&x.receipt_date>=start&&x.receipt_date<end&&code(x.currency)===primary).reduce((s,x)=>s+Number(x.amount||0),0);
 const difference=investedThisMonth-monthlyContribution,remaining=Math.max(0,target-currentWealth);
 set('goal-name',goal.name||'Meu sonho');set('target',money(target,primary));set('current-wealth',money(currentWealth,primary));set('remaining',money(remaining,primary));set('progress',progress.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%');
 set('monthly-plan',money(monthlyContribution,primary));set('monthly-realized',money(investedThisMonth,primary));set('monthly-difference',(difference>=0?'+ ':'− ')+money(Math.abs(difference),primary));set('plan-rate',rate.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'% a.m.');
 set('projected',money(projected,primary));set('projected-gap',projected>=target?'Objetivo alcançado na projeção':'Faltariam '+money(Math.max(0,target-projected),primary)+' na projeção');
 set('month-income',money(incomeThisMonth,primary));set('month-expenses',money(expensesThisMonth,primary));set('month-invested',money(investedThisMonth,primary));
 const bar=$('progress-bar');if(bar)bar.style.width=progress+'%';
 const status=$('plan-status');if(status){status.textContent=investedThisMonth>=monthlyContribution&&monthlyContribution>0?'No ritmo planejado':'Abaixo do ritmo planejado';status.className='plan-status '+(investedThisMonth>=monthlyContribution&&monthlyContribution>0?'on-track':'below-track')}
}
load().catch(e=>{console.error(e);const st=$('status');if(st){st.textContent='Não foi possível carregar o planejamento.';st.classList.remove('hidden')}});
})();
