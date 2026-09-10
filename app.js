/* KORbuild Finances — Workspace Setup */
(function(){
  const style=document.createElement('style');
  style.textContent=`
    .wizard-content{padding-top:10px!important;padding-bottom:16px!important}
    .step-icon{display:none!important}
    .wizard-step b{font-size:0!important}
    .wizard-step b::after{font-size:18px;line-height:1}
    .wizard-step[data-step-link="1"] b::after{content:'👤'}
    .wizard-step[data-step-link="2"] b::after{content:'💰'}
    .wizard-step[data-step-link="3"] b::after{content:'💵'}
    .wizard-step[data-step-link="4"] b::after{content:'🎯'}
    .wizard-step[data-step-link="5"] b::after{content:'📐'}
  `;
  document.head.appendChild(style);
})();

const STORAGE_KEY='korbuild-finances-wizard-v2';
const wizardState=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
let step=Number(wizardState.step)||1;
let currentUser=null;
let saveTimer=null;
const $=id=>document.getElementById(id);
const db=()=>KORbuildAuth.client.schema('finances');
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function saveLocal(){wizardState.step=step;localStorage.setItem(STORAGE_KEY,JSON.stringify(wizardState));}
function collectWizard(){const values={name:'wName',country:'wCountry',currency:'wCurrency',account:'wAccount',accountType:'wAccountType',accountCurrency:'wAccountCurrency',balance:'wBalance',incomeDesc:'wIncomeDesc',incomeCategory:'wIncomeCategory',income:'wIncome',frequency:'wFrequency',incomeDay:'wIncomeDay',goalName:'wGoalName',goalTarget:'wGoalTarget',goalYears:'wGoalYears',startDate:'wStartDate',initial:'wInitial'};Object.entries(values).forEach(([key,id])=>{const el=$(id);if(el)wizardState[key]=el.type==='number'?(Number(el.value)||0):el.value;});saveLocal();}
function draftData(){const data={...wizardState};delete data.step;return data;}
async function persistDraft(){if(!currentUser)return;collectWizard();clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{const {error}=await db().from('setup_drafts').upsert({user_id:currentUser.id,current_step:step,data:draftData()},{onConflict:'user_id'});if(error)throw error;const status=document.querySelector('.save-status');if(status)status.textContent='Salvo com segurança.';}catch(error){console.error('Falha ao salvar configuração:',error);const status=document.querySelector('.save-status');if(status)status.textContent='Salvo neste dispositivo.';}},450);}
async function loadDraft(){if(!currentUser)return;const {data,error}=await db().from('setup_drafts').select('current_step,data').eq('user_id',currentUser.id).maybeSingle();if(error){console.error('Falha ao carregar configuração:',error);return;}if(data?.data){Object.assign(wizardState,data.data);step=Number(data.current_step)||1;saveLocal();}}
async function getWorkspace(){const {data,error}=await db().from('user_workspaces').select('id,setup_completed').eq('user_id',currentUser.id).maybeSingle();if(error)throw error;return data;}
function setupPayload(){collectWizard();return {name:wizardState.name||'',country:wizardState.country||'',currency:wizardState.currency||'',account:wizardState.account||'',accountType:wizardState.accountType||'',accountCurrency:wizardState.accountCurrency||'',balance:Number(wizardState.balance||0),incomeDesc:wizardState.incomeDesc||'',incomeCategory:wizardState.incomeCategory||'',income:Number(wizardState.income||0),frequency:wizardState.frequency||'',incomeDay:wizardState.incomeDay?String(wizardState.incomeDay):'',goalName:wizardState.goalName||'',goalTarget:Number(wizardState.goalTarget||0),goalYears:Number(wizardState.goalYears||0),startDate:wizardState.startDate||'',includeInitial:Boolean(wizardState.includeInitial),initial:Number(wizardState.initial||0)};}
async function completeSetup(){if(!currentUser)throw new Error('Sessão não encontrada.');const payload=setupPayload();const {data,error}=await KORbuildAuth.client.rpc('complete_setup',{payload});if(error)throw error;localStorage.setItem('korbuild-finances-onboarding-complete','true');return {workspaceId:data?.workspace_id,goalId:data?.goal_id,alreadyComplete:Boolean(data?.already_complete)};}
function fillWizard(){const values={name:'wName',country:'wCountry',currency:'wCurrency',account:'wAccount',accountType:'wAccountType',accountCurrency:'wAccountCurrency',balance:'wBalance',incomeDesc:'wIncomeDesc',incomeCategory:'wIncomeCategory',income:'wIncome',frequency:'wFrequency',incomeDay:'wIncomeDay',goalName:'wGoalName',goalTarget:'wGoalTarget',goalYears:'wGoalYears',startDate:'wStartDate',initial:'wInitial'};Object.entries(values).forEach(([key,id])=>{const el=$(id);if(el&&wizardState[key]!==undefined)el.value=wizardState[key];});const yes=document.querySelector('[data-choice="yes"]'),no=document.querySelector('[data-choice="no"]');if(wizardState.includeInitial){$('initialWealthWrap').classList.remove('hidden');yes.classList.add('selected');no.classList.remove('selected');}else{no.classList.add('selected');yes.classList.remove('selected');}}
function valid(){if(step===1)return !!wizardState.name&&!!wizardState.country&&!!wizardState.currency;if(step===2)return !!wizardState.account&&!!wizardState.accountType&&wizardState.balance>=0;if(step===3)return !!wizardState.incomeDesc&&!!wizardState.incomeCategory&&wizardState.income>0&&!!wizardState.frequency;if(step===4)return !!wizardState.goalName&&wizardState.goalTarget>0&&wizardState.goalYears>0&&!!wizardState.startDate;return true;}
function estimatedDate(){if(!wizardState.startDate||!wizardState.goalYears)return null;const d=new Date(wizardState.startDate+'T12:00:00');d.setFullYear(d.getFullYear()+Number(wizardState.goalYears));return d;}
function dateBR(d){return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';}
function updateEstimatedDate(){const d=estimatedDate();$('estimatedDateValue').textContent=dateBR(d);$('estimatedDateText').textContent=d?`Com base em ${wizardState.goalYears} anos a partir de ${dateBR(new Date(wizardState.startDate+'T12:00:00'))}.`:'Informe os anos e a data inicial para calcular.';}
function contribution(target,initial,months,rate=1.05){const r=rate/100;if(months<=0)return 0;if(r===0)return Math.max(0,(target-initial)/months);const f=Math.pow(1+r,months);return Math.max(0,(target-initial*f)/((f-1)/r));}
function updatePlan(){collectWizard();$('summaryGoal').textContent=wizardState.goalName||'—';$('summaryTarget').textContent=brl(wizardState.goalTarget);$('summaryYears').textContent=wizardState.goalYears?`${wizardState.goalYears} anos`:'—';const d=estimatedDate();$('summaryDeadline').textContent=dateBR(d);const initial=wizardState.includeInitial?wizardState.initial:0;$('summaryInitial').textContent=brl(initial);const months=Math.max(1,Number(wizardState.goalYears||0)*12);$('summaryContribution').textContent=brl(contribution(wizardState.goalTarget,initial,months))+'/mês';}
function renderStep(){document.querySelectorAll('.step').forEach(x=>x.classList.toggle('step-active',Number(x.dataset.step)===step));document.querySelectorAll('.wizard-step').forEach(x=>{const n=Number(x.dataset.stepLink);x.classList.toggle('active',n===step);x.classList.toggle('done',n<step);});$('stepCounter').textContent=`${step} de 5`;$('stepProgress').style.width=(step*20)+'%';$('backBtn').disabled=step===1;$('nextBtn').textContent=step===5?'Começar minha jornada →':'Continuar →';$('nextBtn').disabled=!valid();if(step===4)updateEstimatedDate();if(step===5)updatePlan();saveLocal();}
function goNext(){collectWizard();if(!valid())return;if(step<5){step++;renderStep();persistDraft();}else finish();}
function goBack(){if(step>1){collectWizard();step--;renderStep();persistDraft();}}
async function finish(){const button=$('nextBtn');button.disabled=true;button.textContent='Finalizando…';try{const result=await completeSetup();alert(result.alreadyComplete?'Seu espaço financeiro já está configurado.':'Tudo pronto! Seu espaço financeiro foi configurado com sucesso.');window.location.replace('dashboard.html');}catch(error){console.error('Falha ao concluir onboarding:',error);alert(error.message||'Não foi possível concluir a configuração. Seus dados locais foram preservados.');button.disabled=false;button.textContent='Começar minha jornada →';}}
document.querySelectorAll('.step input,.step select').forEach(e=>e.addEventListener('input',()=>{collectWizard();renderStep();persistDraft();}));
document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{wizardState.includeInitial=b.dataset.choice==='yes';document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('initialWealthWrap').classList.toggle('hidden',!wizardState.includeInitial);collectWizard();renderStep();persistDraft();}));
document.querySelectorAll('.wizard-step').forEach(b=>b.addEventListener('click',()=>{const target=Number(b.dataset.stepLink);collectWizard();if(target<=step||valid()){step=target;renderStep();persistDraft();}}));
$('nextBtn').addEventListener('click',goNext);$('backBtn').addEventListener('click',goBack);
(async()=>{try{const session=await KORbuildAuth.session();currentUser=session?.user||null;if(!currentUser){window.location.replace('login.html');return;}const workspace=await getWorkspace();if(workspace?.setup_completed){window.location.replace('dashboard.html');return;}await loadDraft();fillWizard();renderStep();}catch(error){console.error('Inicialização do Wizard:',error);const status=document.querySelector('.save-status');if(status)status.textContent='Não foi possível conectar ao espaço financeiro.';}})();
