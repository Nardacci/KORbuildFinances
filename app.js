const STORAGE_KEY='korbuild-finances-wizard-v2';
const wizardState=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
let step=Number(wizardState.step)||1;
const $=id=>document.getElementById(id);
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const saveWizard=()=>{wizardState.step=step;localStorage.setItem(STORAGE_KEY,JSON.stringify(wizardState));};
function readWizard(){
  const values={name:'wName',country:'wCountry',currency:'wCurrency',account:'wAccount',accountType:'wAccountType',accountCurrency:'wAccountCurrency',balance:'wBalance',incomeDesc:'wIncomeDesc',incomeCategory:'wIncomeCategory',income:'wIncome',frequency:'wFrequency',incomeDay:'wIncomeDay',goalName:'wGoalName',goalTarget:'wGoalTarget',goalYears:'wGoalYears',startDate:'wStartDate',initial:'wInitial'};
  Object.entries(values).forEach(([key,id])=>{const el=$(id);if(el) wizardState[key]=el.type==='number'?(Number(el.value)||0):el.value;});
  saveWizard();
}
function fillWizard(){
  const values={name:'wName',country:'wCountry',currency:'wCurrency',account:'wAccount',accountType:'wAccountType',accountCurrency:'wAccountCurrency',balance:'wBalance',incomeDesc:'wIncomeDesc',incomeCategory:'wIncomeCategory',income:'wIncome',frequency:'wFrequency',incomeDay:'wIncomeDay',goalName:'wGoalName',goalTarget:'wGoalTarget',goalYears:'wGoalYears',startDate:'wStartDate',initial:'wInitial'};
  Object.entries(values).forEach(([key,id])=>{const el=$(id);if(el&&wizardState[key]!==undefined)el.value=wizardState[key];});
  if(wizardState.includeInitial){$('initialWealthWrap').classList.remove('hidden');document.querySelector('[data-choice="yes"]').classList.add('selected');}else{document.querySelector('[data-choice="no"]').classList.add('selected');}
}
function valid(){
  if(step===1)return !!wizardState.name&&!!wizardState.country&&!!wizardState.currency;
  if(step===2)return !!wizardState.account&&!!wizardState.accountType&&wizardState.balance>=0;
  if(step===3)return !!wizardState.incomeDesc&&!!wizardState.incomeCategory&&wizardState.income>0&&!!wizardState.frequency;
  if(step===4)return !!wizardState.goalName&&wizardState.goalTarget>0&&wizardState.goalYears>0&&!!wizardState.startDate;
  return true;
}
function estimatedDate(){
  if(!wizardState.startDate||!wizardState.goalYears)return null;
  const d=new Date(wizardState.startDate+'T12:00:00');
  d.setFullYear(d.getFullYear()+Number(wizardState.goalYears));
  return d;
}
function dateBR(d){return d?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';}
function updateEstimatedDate(){
  const d=estimatedDate();
  $('estimatedDateValue').textContent=dateBR(d);
  $('estimatedDateText').textContent=d?`Com base em ${wizardState.goalYears} anos a partir de ${dateBR(new Date(wizardState.startDate+'T12:00:00'))}.`:'Informe os anos e a data inicial para calcular.';
}
function contribution(target,initial,months,rate=1.05){
  const r=rate/100;if(months<=0)return 0;if(r===0)return Math.max(0,(target-initial)/months);
  const f=Math.pow(1+r,months);return Math.max(0,(target-initial*f)/((f-1)/r));
}
function updatePlan(){
  readWizard();
  $('summaryGoal').textContent=wizardState.goalName||'—';
  $('summaryTarget').textContent=brl(wizardState.goalTarget);
  $('summaryYears').textContent=wizardState.goalYears?`${wizardState.goalYears} anos`:'—';
  const d=estimatedDate();$('summaryDeadline').textContent=dateBR(d);
  const initial=wizardState.includeInitial?wizardState.initial:0;$('summaryInitial').textContent=brl(initial);
  const months=Math.max(1,Number(wizardState.goalYears||0)*12);
  $('summaryContribution').textContent=brl(contribution(wizardState.goalTarget,initial,months))+'/mês';
}
function renderStep(){
  document.querySelectorAll('.step').forEach(x=>x.classList.toggle('step-active',Number(x.dataset.step)===step));
  document.querySelectorAll('.wizard-step').forEach(x=>{const n=Number(x.dataset.stepLink);x.classList.toggle('active',n===step);x.classList.toggle('done',n<step);});
  $('stepCounter').textContent=`${step} de 5`;$('stepProgress').style.width=(step*20)+'%';
  $('backBtn').disabled=step===1;$('nextBtn').textContent=step===5?'Começar minha jornada →':'Continuar →';$('nextBtn').disabled=!valid();
  if(step===4)updateEstimatedDate();
  if(step===5)updatePlan();
  saveWizard();
}
function goNext(){readWizard();if(!valid())return;if(step<5){step++;renderStep();}else finish();}
function goBack(){if(step>1){readWizard();step--;renderStep();}}
function finish(){saveWizard();localStorage.setItem('korbuild-finances-onboarding-complete','true');alert('Tudo pronto! O próximo passo será entrar no Dashboard.');}
document.querySelectorAll('.step input,.step select').forEach(e=>e.addEventListener('input',()=>{readWizard();renderStep();}));
document.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{wizardState.includeInitial=b.dataset.choice==='yes';document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('initialWealthWrap').classList.toggle('hidden',!wizardState.includeInitial);readWizard();renderStep();}));
document.querySelectorAll('.wizard-step').forEach(b=>b.addEventListener('click',()=>{const target=Number(b.dataset.stepLink);readWizard();if(target<=step||valid()){step=target;renderStep();}}));
$('nextBtn').addEventListener('click',goNext);$('backBtn').addEventListener('click',goBack);fillWizard();renderStep();