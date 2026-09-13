/* KORbuild Finances — Settings V1.2 */
(() => {
'use strict';
const $=id=>document.getElementById(id); const db=()=>KORbuildAuth.client.schema('finances'); let workspace=null,goal=null,plan=null,monthlyIncomeTotal=0;
const initials=name=>String(name||'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'A';
const code=v=>String(v||'').trim().split(/\s+—\s+/)[0].toUpperCase();
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function monthlyEquivalent(row){const key=String(row.frequency||'').toLowerCase();const factor={monthly:1,mensal:1,biweekly:2,quinzenal:2,weekly:4.33,semanal:4.33,yearly:1/12,anual:1/12}[key];return factor?Number(row.amount||0)*factor:0;}
function header(user){const name=workspace?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'André';$('user-name').textContent=name;$('user-email').textContent=user.email||'';$('user-avatar').textContent=initials(name);$('menu-full-name').textContent=name;$('menu-full-email').textContent=user.email||'';$('menu-avatar').textContent=initials(name);}
function dateBR(d){return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';}
function estimatedDate(){const startDate=$('goalStartDate').value,years=Number($('goalYears').value||0);if(!startDate||!years)return null;const d=new Date(startDate+'T12:00:00');d.setFullYear(d.getFullYear()+years);return d;}
function updateEstimatedDate(){const el=$('estimatedDateValue');if(el)el.textContent=dateBR(estimatedDate());}
function updateContributionWarning(){const warning=$('contributionWarning');if(!warning)return;const contribution=Number($('planContribution').value||0);const ratio=monthlyIncomeTotal>0?contribution/monthlyIncomeTotal:0;if(monthlyIncomeTotal>0&&ratio>0.75){warning.classList.remove('hidden');warning.textContent=ratio>=1?`⚠️ O aporte mensal projetado (${brl(contribution)}) ultrapassa sua receita mensal (${brl(monthlyIncomeTotal)}). Considere ajustar o valor ou o prazo do objetivo.`:`⚠️ O aporte mensal projetado (${brl(contribution)}) representa ${Math.round(ratio*100)}% da sua receita mensal (${brl(monthlyIncomeTotal)}). Considere ajustar o valor ou o prazo do objetivo.`;}else{warning.classList.add('hidden');}}
async function init(){const session=await KORbuildAuth.session();if(!session?.user){location.replace('index.html');return}const {data,error}=await db().from('user_workspaces').select('id,display_name,country,primary_currency,setup_completed').eq('user_id',session.user.id).maybeSingle();if(error)throw error;if(!data||!data.setup_completed){location.replace('workspace.html');return}workspace=data;header(session.user);$('name').value=data.display_name||'';$('country').value=data.country||'';$('currency').value=data.primary_currency||'';
 const [gr,pr,ir]=await Promise.all([
  db().from('goals').select('id,name,target_amount,target_years,start_date,initial_wealth,include_initial_wealth').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db().from('plans').select('id,goal_id,projected_monthly_contribution').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  db().from('incomes').select('amount,currency,frequency,status').eq('workspace_id',workspace.id),
 ]);
 if(gr.error)throw gr.error;if(pr.error)throw pr.error;if(ir.error)throw ir.error;
 goal=gr.data;plan=pr.data;
 const primary=code(workspace.primary_currency);
 monthlyIncomeTotal=(ir.data||[]).filter(r=>r.status==='realized'&&code(r.currency)===primary).reduce((s,r)=>s+monthlyEquivalent(r),0);
 if(goal){$('goalName').value=goal.name||'';$('goalTarget').value=goal.target_amount??'';$('goalYears').value=goal.target_years??'';$('goalStartDate').value=goal.start_date||'';$('goalInitial').value=goal.include_initial_wealth?(goal.initial_wealth??0):0;}
 if(plan){$('planContribution').value=plan.projected_monthly_contribution??'';}
 updateEstimatedDate();
 updateContributionWarning();
}
$('planContribution').addEventListener('input',updateContributionWarning);
$('goalYears').addEventListener('input',updateEstimatedDate);
$('goalStartDate').addEventListener('input',updateEstimatedDate);
$('cancel').onclick=()=>location.replace('dashboard.html');$('user-menu-btn').onclick=e=>{e.stopPropagation();$('user-menu').classList.toggle('hidden')};document.addEventListener('click',e=>{const w=document.querySelector('.user-menu-wrap');if(w&&!w.contains(e.target))$('user-menu').classList.add('hidden')});$('logout').onclick=async()=>{await KORbuildAuth.logout();location.replace('index.html')};
$('save').onclick=async()=>{const msg=$('message'),btn=$('save');btn.disabled=true;msg.className='save-message';msg.textContent='Salvando…';try{
 const name=$('name').value.trim(),country=$('country').value,currency=$('currency').value;
 const goalName=$('goalName').value.trim(),goalTarget=Number($('goalTarget').value||0),goalYears=Number($('goalYears').value||0),goalStartDate=$('goalStartDate').value,goalInitial=Number($('goalInitial').value||0),planContribution=Number($('planContribution').value||0);
 if(!name||!country||!currency)throw Error('Preencha nome, país e moeda principal.');
 if(!goalName||goalTarget<=0||goalYears<=0||!goalStartDate)throw Error('Preencha nome do objetivo, valor-alvo, prazo e data inicial.');
 if(!Number.isFinite(goalInitial)||goalInitial<0)throw Error('Informe um patrimônio considerado válido.');
 if(!Number.isFinite(planContribution)||planContribution<0)throw Error('Informe um aporte mensal projetado válido.');
 const updates=[db().from('user_workspaces').update({display_name:name,country,primary_currency:currency}).eq('id',workspace.id)];
 if(goal)updates.push(db().from('goals').update({name:goalName,target_amount:goalTarget,target_years:goalYears,start_date:goalStartDate,initial_wealth:goalInitial,include_initial_wealth:goalInitial>0}).eq('id',goal.id));
 if(plan)updates.push(db().from('plans').update({projected_monthly_contribution:planContribution}).eq('id',plan.id));
 const results=await Promise.all(updates);
 const failed=results.find(r=>r.error);
 if(failed)throw failed.error;
 workspace={...workspace,display_name:name,country,primary_currency:currency};
 if(goal)goal={...goal,name:goalName,target_amount:goalTarget,target_years:goalYears,start_date:goalStartDate,initial_wealth:goalInitial,include_initial_wealth:goalInitial>0};
 if(plan)plan={...plan,projected_monthly_contribution:planContribution};
 header((await KORbuildAuth.session()).user);
 msg.className='save-message ok';msg.textContent='Alterações salvas com sucesso.';
}catch(e){console.error(e);msg.className='save-message error';msg.textContent=e.message||'Não foi possível salvar as alterações.'}finally{btn.disabled=false}};
init().catch(e=>{console.error('Settings init failed',e);$('message').className='save-message error';$('message').textContent='Não foi possível carregar a configuração.'});
})();