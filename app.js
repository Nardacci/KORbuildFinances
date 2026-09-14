/* KORbuild Finances — Workspace Setup */
const STORAGE_KEY='korbuild-finances-wizard-v2';
const wizardState=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
let step=Number(wizardState.step)||1;
let currentUser=null;
let workspace=null;
let saveTimer=null;
const mode=new URLSearchParams(location.search).get('mode')==='review'?'review':'onboarding';
// Estado exclusivo do modo revisao (pos-onboarding): ids das linhas reais para
// editar/gravar direto no banco, e os dados somente-leitura das duas telas
// (conta e receita) que sao editadas fora do wizard (account-edit.html / income-edit.html).
let reviewIds={accountId:null,incomeId:null,goalId:null,planId:null};
let reviewSummary={account:null,firstIncome:null};
let reviewPlanContribution=0;
let reviewPristine=null;
let monthlyIncomeTotal=0;
const $=id=>document.getElementById(id);
const db=()=>KORbuildAuth.client.schema('finances');
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const code=v=>String(v||'').trim().split(/\s+—\s+/)[0].toUpperCase();
function saveLocal(){wizardState.step=step;localStorage.setItem(STORAGE_KEY,JSON.stringify(wizardState));}
function collectWizard(){const values={name:'wName',country:'wCountry',currency:'wCurrency',account:'wAccount',accountType:'wAccountType',accountCurrency:'wAccountCurrency',balance:'wBalance',incomeDesc:'wIncomeDesc',incomeCategory:'wIncomeCategory',income:'wIncome',frequency:'wFrequency',incomeDay:'wIncomeDay',goalName:'wGoalName',goalTarget:'wGoalTarget',goalYears:'wGoalYears',startDate:'wStartDate',initial:'wInitial'};Object.entries(values).forEach(([key,id])=>{const el=$(id);if(el)wizardState[key]=el.type==='number'?(Number(el.value)||0):el.value;});saveLocal();}
function draftData(){const data={...wizardState};delete data.step;return data;}
async function persistDraft(){if(mode==='review')return;if(!currentUser)return;collectWizard();clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{const {error}=await db().from('setup_drafts').upsert({user_id:currentUser.id,current_step:step,data:draftData()},{onConflict:'user_id'});if(error)throw error;const status=document.querySelector('.save-status');if(status)status.textContent='Salvo com segurança.';}catch(error){console.error('Falha ao salvar configuração:',error);const status=document.querySelector('.save-status');if(status)status.textContent='Salvo neste dispositivo.';}},450);}
async function loadDraft(){if(!currentUser)return;const {data,error}=await db().from('setup_drafts').select('current_step,data').eq('user_id',currentUser.id).maybeSingle();if(error){console.error('Falha ao carregar configuração:',error);return;}if(data?.data){Object.assign(wizardState,data.data);step=Number(data.current_step)||1;saveLocal();}}
async function getWorkspace(){const {data,error}=await db().from('user_workspaces').select('id,setup_completed,display_name,country,primary_currency').eq('user_id',currentUser.id).maybeSingle();if(error)throw error;return data;}
function setupPayload(){collectWizard();return {name:wizardState.name||'',country:wizardState.country||'',currency:wizardState.currency||'',account:wizardState.account||'',accountType:wizardState.accountType||'',accountCurrency:wizardState.accountCurrency||'',balance:Number(wizardState.balance||0),incomeDesc:wizardState.incomeDesc||'',incomeCategory:wizardState.incomeCategory||'',income:Number(wizardState.income||0),frequency:wizardState.frequency||'',incomeDay:wizardState.incomeDay?String(wizardState.incomeDay):'',goalName:wizardState.goalName||'',goalTarget:Number(wizardState.goalTarget||0),goalYears:Number(wizardState.goalYears||0),startDate:wizardState.startDate||'',includeInitial:Boolean(wizardState.includeInitial),initial:Number(wizardState.initial||0)};}
async function completeSetup(){if(!currentUser)throw new Error('Sessão não encontrada.');const payload=setupPayload();const {data,error}=await KORbuildAuth.client.rpc('complete_setup',{payload});if(error)throw error;localStorage.setItem('korbuild-finances-onboarding-complete','true');return {workspaceId:data?.workspace_id,goalId:data?.goal_id,alreadyComplete:Boolean(data?.already_complete)};}
function fillWizard(){const values={name:'wName',country:'wCountry',currency:'wCurrency',account:'wAccount',accountType:'wAccountType',accountCurrency:'wAccountCurrency',balance:'wBalance',incomeDesc:'wIncomeDesc',incomeCategory:'wIncomeCategory',income:'wIncome',frequency:'wFrequency',incomeDay:'wIncomeDay',goalName:'wGoalName',goalTarget:'wGoalTarget',goalYears:'wGoalYears',startDate:'wStartDate',initial:'wInitial'};Object.entries(values).forEach(([key,id])=>{const el=$(id);if(el&&wizardState[key]!==undefined)el.value=wizardState[key];});const yes=document.querySelector('[data-choice="yes"]'),no=document.querySelector('[data-choice="no"]');if(wizardState.includeInitial){$('initialWealthWrap').classList.remove('hidden');yes.classList.add('selected');no.classList.remove('selected');}else{no.classList.add('selected');yes.classList.remove('selected');$('initialWealthWrap').classList.add('hidden');}}
function valid(){if(step===1)return !!wizardState.name&&!!wizardState.country&&!!wizardState.currency;if(step===2)return !!wizardState.account&&!!wizardState.accountType&&wizardState.balance>=0;if(step===3)return !!wizardState.incomeDesc&&!!wizardState.incomeCategory&&wizardState.income>0&&!!wizardState.frequency;if(step===4)return !!wizardState.goalName&&wizardState.goalTarget>0&&wizardState.goalYears>0&&!!wizardState.startDate;return true;}
function reviewPlanFieldValid(){const v=Number($('rPlanContribution')?.value||0);return Number.isFinite(v)&&v>=0;}
function estimatedDate(){if(!wizardState.startDate||!wizardState.goalYears)return null;const d=new Date(wizardState.startDate+'T12:00:00');d.setFullYear(d.getFullYear()+Number(wizardState.goalYears));return d;}
function dateBR(d){return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';}
function updateEstimatedDate(){const d=estimatedDate();$('estimatedDateValue').textContent=dateBR(d);$('estimatedDateText').textContent=d?`Com base em ${wizardState.goalYears} anos a partir de ${dateBR(new Date(wizardState.startDate+'T12:00:00'))}.`:'Informe os anos e a data inicial para calcular.';}
function contribution(target,initial,months,rate=1.05){const r=rate/100;if(months<=0)return 0;if(r===0)return Math.max(0,(target-initial)/months);const f=Math.pow(1+r,months);return Math.max(0,(target-initial*f)/((f-1)/r));}
function monthlyIncomeValue(){const income=Number(wizardState.income||0);const freqFactor={'Mensal':1,'Quinzenal':2,'Semanal':4.33,'Anual':1/12}[wizardState.frequency];return freqFactor?income*freqFactor:0;}
// Formato tolerante a duas convencoes de frequencia encontradas nos dados reais:
// texto em portugues (usado pelo proprio wizard) e tokens em ingles (usado por income-new.html).
function monthlyEquivalentTolerant(row){const key=String(row.frequency||'').toLowerCase();const factor={monthly:1,mensal:1,biweekly:2,quinzenal:2,weekly:4.33,semanal:4.33,yearly:1/12,anual:1/12}[key];return factor?Number(row.amount||0)*factor:0;}
function updateWarningEl(el,contributionValue){if(!el)return;const ratio=monthlyIncomeTotal>0?contributionValue/monthlyIncomeTotal:0;if(monthlyIncomeTotal>0&&ratio>0.75){el.classList.remove('hidden');el.textContent=ratio>=1?`⚠️ O aporte mensal projetado (${brl(contributionValue)}) ultrapassa sua receita mensal (${brl(monthlyIncomeTotal)}). Considere ajustar o valor ou o prazo do objetivo.`:`⚠️ O aporte mensal projetado (${brl(contributionValue)}) representa ${Math.round(ratio*100)}% da sua receita mensal (${brl(monthlyIncomeTotal)}). Considere ajustar o valor ou o prazo do objetivo.`;}else{el.classList.add('hidden');}}
function updatePlan(){collectWizard();$('summaryGoal').textContent=wizardState.goalName||'—';$('summaryTarget').textContent=brl(wizardState.goalTarget);$('summaryYears').textContent=wizardState.goalYears?`${wizardState.goalYears} anos`:'—';const d=estimatedDate();$('summaryDeadline').textContent=dateBR(d);const initial=wizardState.includeInitial?wizardState.initial:0;$('summaryInitial').textContent=brl(initial);const months=Math.max(1,Number(wizardState.goalYears||0)*12);const monthlyContribution=contribution(wizardState.goalTarget,initial,months);$('summaryContribution').textContent=brl(monthlyContribution)+'/mês';const income=monthlyIncomeValue();monthlyIncomeTotal=income;updateWarningEl($('contributionWarning'),monthlyContribution);}

// ---- Modo revisao (pos-onboarding) ----
async function loadReviewData(){
  const [accR,incAllR,goalR,planR]=await Promise.all([
    db().from('accounts').select('id,name,account_type,currency,opening_balance').eq('workspace_id',workspace.id).order('created_at',{ascending:true}).limit(1).maybeSingle(),
    db().from('incomes').select('id,description,category,amount,currency,frequency,status').eq('workspace_id',workspace.id).order('created_at',{ascending:true}),
    db().from('goals').select('id,name,target_amount,target_years,start_date,initial_wealth,include_initial_wealth').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    db().from('plans').select('id,goal_id,projected_monthly_contribution').eq('workspace_id',workspace.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(accR.error)throw accR.error;if(incAllR.error)throw incAllR.error;if(goalR.error)throw goalR.error;if(planR.error)throw planR.error;
  const account=accR.data,incomes=incAllR.data||[],goal=goalR.data,plan=planR.data;
  const firstIncome=incomes[0]||null;
  reviewIds={accountId:account?.id||null,incomeId:firstIncome?.id||null,goalId:goal?.id||null,planId:plan?.id||null};
  reviewSummary={account,firstIncome};
  wizardState.name=workspace.display_name||'';wizardState.country=workspace.country||'';wizardState.currency=workspace.primary_currency||'';
  wizardState.goalName=goal?.name||'';wizardState.goalTarget=goal?.target_amount||0;wizardState.goalYears=goal?.target_years||0;wizardState.startDate=goal?.start_date||'';wizardState.includeInitial=!!goal?.include_initial_wealth;wizardState.initial=goal?.initial_wealth||0;
  reviewPlanContribution=plan?.projected_monthly_contribution??0;
  const primary=code(workspace.primary_currency);
  monthlyIncomeTotal=incomes.filter(r=>r.status==='realized'&&code(r.currency)===primary).reduce((s,r)=>s+monthlyEquivalentTolerant(r),0);
  // Copia "limpa" dos campos editaveis pelo wizard em modo revisao — usada
  // para descartar edicoes nao salvas (botao "Voltar ao resumo"), ja que o
  // listener generico de input grava direto em wizardState a cada tecla.
  reviewPristine={name:wizardState.name,country:wizardState.country,currency:wizardState.currency,goalName:wizardState.goalName,goalTarget:wizardState.goalTarget,goalYears:wizardState.goalYears,startDate:wizardState.startDate,includeInitial:wizardState.includeInitial,initial:wizardState.initial};
}
function renderReviewSummary(){
  $('rvName').textContent=wizardState.name||'—';
  $('rvSub').textContent=[wizardState.country,code(wizardState.currency)].filter(Boolean).join(' · ')||'—';
  const acc=reviewSummary.account;
  if(acc){$('rvAccountName').textContent=acc.name;$('rvAccountSub').textContent=`${acc.account_type} · ${code(acc.currency)} · ${brl(acc.opening_balance)}`;$('rvEditAccount').href=`account-edit.html?id=${encodeURIComponent(acc.id)}&return=review`;}
  else{$('rvAccountName').textContent='Nenhuma conta cadastrada';$('rvAccountSub').textContent='';$('rvEditAccount').href='accounts.html';}
  const inc=reviewSummary.firstIncome;
  if(inc){$('rvIncomeName').textContent=inc.description;$('rvIncomeSub').textContent=`${inc.category} · ${brl(inc.amount)}`;$('rvEditIncome').href=`income-edit.html?id=${encodeURIComponent(inc.id)}&return=review`;}
  else{$('rvIncomeName').textContent='Nenhuma receita cadastrada';$('rvIncomeSub').textContent='';$('rvEditIncome').href='incomes.html';}
  $('rvGoalName').textContent=wizardState.goalName||'—';
  $('rvGoalSub').textContent=wizardState.goalTarget?`${brl(wizardState.goalTarget)} em ${wizardState.goalYears} anos`:'—';
  $('rvPlanName').textContent=brl(reviewPlanContribution)+'/mês';
  $('rvPlanSub').textContent='Aporte mensal projetado';
  updateWarningEl($('reviewContributionWarning'),reviewPlanContribution);
}
function enterReviewStep(n){
  if(n===1)fillWizard();
  if(n===4){fillWizard();$('rPlanContribution').value=reviewPlanContribution;}
  if(n===5)renderReviewSummary();
  step=n;renderStep();
}
async function saveReviewStep1(){
  collectWizard();if(!valid())return;
  const btn=$('saveBtn'),original=btn.textContent;btn.disabled=true;btn.textContent='Salvando…';
  try{
    const {error}=await db().from('user_workspaces').update({display_name:wizardState.name,country:wizardState.country,primary_currency:wizardState.currency}).eq('id',workspace.id);
    if(error)throw error;
    workspace={...workspace,display_name:wizardState.name,country:wizardState.country,primary_currency:wizardState.currency};
    reviewPristine={...reviewPristine,name:wizardState.name,country:wizardState.country,currency:wizardState.currency};
    enterReviewStep(5);
  }catch(e){console.error(e);alert(e.message||'Não foi possível salvar.');}
  finally{btn.disabled=false;btn.textContent=original;}
}
async function saveReviewStep4(){
  collectWizard();
  if(!valid()||!reviewPlanFieldValid())return;
  const planContributionValue=Number($('rPlanContribution').value||0);
  const btn=$('saveBtn'),original=btn.textContent;btn.disabled=true;btn.textContent='Salvando…';
  try{
    const updates=[];
    if(reviewIds.goalId)updates.push(db().from('goals').update({name:wizardState.goalName,target_amount:wizardState.goalTarget,target_years:wizardState.goalYears,start_date:wizardState.startDate,initial_wealth:wizardState.includeInitial?Number(wizardState.initial||0):0,include_initial_wealth:!!wizardState.includeInitial}).eq('id',reviewIds.goalId));
    if(reviewIds.planId)updates.push(db().from('plans').update({projected_monthly_contribution:planContributionValue}).eq('id',reviewIds.planId));
    const results=await Promise.all(updates);
    const failed=results.find(r=>r.error);
    if(failed)throw failed.error;
    reviewPlanContribution=planContributionValue;
    reviewPristine={...reviewPristine,goalName:wizardState.goalName,goalTarget:wizardState.goalTarget,goalYears:wizardState.goalYears,startDate:wizardState.startDate,includeInitial:wizardState.includeInitial,initial:wizardState.initial};
    enterReviewStep(5);
  }catch(e){console.error(e);alert(e.message||'Não foi possível salvar.');}
  finally{btn.disabled=false;btn.textContent=original;}
}

function renderStep(){
  document.querySelectorAll('.step').forEach(x=>x.classList.toggle('step-active',Number(x.dataset.step)===step));
  document.querySelectorAll('.wizard-step').forEach(x=>{const n=Number(x.dataset.stepLink);x.classList.toggle('active',n===step);x.classList.toggle('done',mode==='onboarding'?n<step:n!==step);});
  $('topbarFill').style.width=(step*20)+'%';
  $('backBtn').textContent='← Voltar';
  if(mode==='review'){
    $('step5-onboarding').classList.add('hidden');
    $('step5-review').classList.toggle('hidden',step!==5);
    $('step4-review-plan').classList.toggle('hidden',step!==4);
    if(step===4){updateEstimatedDate();updateWarningEl($('rContributionWarning'),Number($('rPlanContribution').value||0));}
    if(step===5)renderReviewSummary();
    const reviewing=step===5;
    $('backBtn').disabled=reviewing;
    $('saveBtn').textContent='Salvar e continuar →';
    $('saveBtn').disabled=reviewing||(step===4?!(valid()&&reviewPlanFieldValid()):!valid());
    $('confirmBtn').textContent='Voltar ao Dashboard ✓';
    $('confirmBtn').disabled=!reviewing;
  }else{
    $('step5-onboarding').classList.remove('hidden');
    $('step5-review').classList.add('hidden');
    $('step4-review-plan').classList.add('hidden');
    $('backBtn').disabled=step===1;
    const isLast=step===5;
    $('saveBtn').textContent='Salvar e continuar →';
    $('saveBtn').disabled=isLast||!valid();
    $('confirmBtn').textContent='Começar minha jornada →';
    $('confirmBtn').disabled=!isLast||!valid();
    if(step===4)updateEstimatedDate();
    if(step===5)updatePlan();
  }
  saveLocal();
}
function goNext(){collectWizard();if(!valid()||step>=5)return;step++;renderStep();persistDraft();}
function goBack(){if(step>1){collectWizard();step--;renderStep();persistDraft();}}
async function finish(){const button=$('confirmBtn');button.disabled=true;button.textContent='Finalizando…';try{const result=await completeSetup();alert(result.alreadyComplete?'Seu espaço financeiro já está configurado.':'Tudo pronto! Seu espaço financeiro foi configurado com sucesso.');window.location.replace('dashboard.html');}catch(error){console.error('Falha ao concluir onboarding:',error);alert(error.message||'Não foi possível concluir a configuração. Seus dados locais foram preservados.');button.disabled=false;button.textContent='Começar minha jornada →';}}
document.querySelectorAll('.step input,.step select').forEach(e=>e.addEventListener('input',()=>{collectWizard();renderStep();persistDraft();}));
document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{wizardState.includeInitial=b.dataset.choice==='yes';document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('initialWealthWrap').classList.toggle('hidden',!wizardState.includeInitial);collectWizard();renderStep();persistDraft();}));
$('rvEditYou').addEventListener('click',()=>enterReviewStep(1));
$('rvEditGoal').addEventListener('click',()=>enterReviewStep(4));
$('rvEditPlan').addEventListener('click',()=>enterReviewStep(4));
$('saveBtn').addEventListener('click',()=>{
  if(mode==='review'){
    if(step===1){saveReviewStep1();return;}
    if(step===4){saveReviewStep4();return;}
    return;
  }
  goNext();
});
$('confirmBtn').addEventListener('click',()=>{
  if(mode==='review'){location.href='dashboard.html';return;}
  finish();
});
$('backBtn').addEventListener('click',()=>{
  if(mode==='review'){
    if(step!==5){if(reviewPristine)Object.assign(wizardState,reviewPristine);enterReviewStep(5);}
    return;
  }
  goBack();
});
(async()=>{
  try{
    const session=await KORbuildAuth.session();currentUser=session?.user||null;
    if(!currentUser){window.location.replace('login.html');return;}
    workspace=await getWorkspace();
    if(mode==='review'&&workspace?.setup_completed){
      await loadReviewData();
      enterReviewStep(5);
      return;
    }
    if(workspace?.setup_completed){window.location.replace('dashboard.html');return;}
    await loadDraft();fillWizard();renderStep();
  }catch(error){console.error('Inicialização do Wizard:',error);const status=document.querySelector('.save-status');if(status)status.textContent='Não foi possível conectar ao espaço financeiro.';}
})();
