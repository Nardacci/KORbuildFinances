const items=document.querySelectorAll('.nav-item,[data-page].link-btn');
const pages=document.querySelectorAll('.page');
const title=document.getElementById('pageTitle');
const titles={dashboard:'Visão Geral',money:'Meu Dinheiro',budget:'Gastos e Orçamento',investments:'Investimentos',wealth:'Patrimônio',planning:'Planejamento',goals:'Objetivos'};

function go(page){
  pages.forEach(p=>p.classList.toggle('active-page',p.id===page));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  title.textContent=titles[page]||'Visão Geral';
  window.scrollTo({top:0,behavior:'smooth'});
}

items.forEach(i=>i.addEventListener('click',()=>go(i.dataset.page)));

function showGoalModal(){
  document.getElementById('modal').classList.add('show');
  const box=document.querySelector('.modal-box');
  if(!document.getElementById('goalRate')){
    const label=document.createElement('label');
    label.innerHTML='Rentabilidade mensal (%)<input id="goalRate" type="number" step="0.01" value="1.05">';
    const button=box.querySelector('.full');
    box.insertBefore(label,button);
  }
}

function hideGoalModal(){document.getElementById('modal').classList.remove('show')}

function brl(value){
  return value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
}

function calculateMonthlyContribution(target,initial,months,rate){
  if(months<=0)return 0;
  const r=rate/100;
  if(r===0)return Math.max(0,(target-initial)/months);
  const futureInitial=initial*Math.pow(1+r,months);
  const factor=(Math.pow(1+r,months)-1)/r;
  return Math.max(0,(target-futureInitial)/factor);
}

function createGoal(){
  const inputs=document.querySelectorAll('#modal-box input');
  const objectiveInput=document.querySelector('.modal-box label:nth-of-type(1) input');
  const targetInput=document.querySelector('.modal-box label:nth-of-type(2) input');
  const yearsInput=document.querySelector('.modal-box label:nth-of-type(3) input');
  const initialInput=document.querySelector('.modal-box label:nth-of-type(4) input');
  const rateInput=document.getElementById('goalRate');

  const objective=objectiveInput?.value.trim()||'Construir patrimônio';
  const target=Number(targetInput?.value)||0;
  const years=Number(yearsInput?.value)||0;
  const initial=Number(initialInput?.value)||0;
  const rate=Number(rateInput?.value)||0;
  const months=Math.max(0,Math.round(years*12));
  const contribution=calculateMonthlyContribution(target,initial,months,rate);

  const goalCard=document.querySelector('#goals .goal-card');
  if(goalCard){
    goalCard.querySelector('h3').textContent=objective+' de '+brl(target);
    goalCard.querySelector('p').textContent=`Prazo: ${years} anos • Patrimônio inicial considerado: ${brl(initial)}`;
    goalCard.querySelector('.goal-side strong').textContent=target>0?`${Math.min(100,(initial/target)*100).toFixed(1)}%`:'0%';
  }

  const hero=document.querySelector('.hero-goal h2');
  if(hero)hero.textContent=objective+' de '+brl(target);
  const heroValue=document.querySelector('.goal-numbers strong');
  if(heroValue)heroValue.textContent=brl(initial);

  const progressStrong=document.querySelector('.progress-head strong');
  const progressBuilt=document.querySelector('.progress-foot span:first-child');
  const progressRemaining=document.querySelector('.progress-foot span:last-child');
  const progressBar=document.querySelector('.progress>div');
  const progress=target>0?Math.min(100,(initial/target)*100):0;
  if(progressStrong)progressStrong.textContent=`${progress.toFixed(1)}%`;
  if(progressBuilt)progressBuilt.textContent=brl(initial)+' construídos';
  if(progressRemaining)progressRemaining.textContent='Faltam '+brl(Math.max(0,target-initial));
  if(progressBar)progressBar.style.width=progress+'%';

  const metrics=document.querySelectorAll('#dashboard .metric');
  if(metrics[0])metrics[0].querySelector('strong').textContent=brl(initial);
  if(metrics[1])metrics[1].querySelector('strong').textContent=brl(contribution)+'/mês';
  if(metrics[2])metrics[2].querySelector('strong').textContent=years+' anos';
  if(metrics[2])metrics[2].querySelector('small').textContent=months+' meses';
  if(metrics[3])metrics[3].querySelector('strong').textContent=rate.toFixed(2).replace('.',',')+'% a.m.';

  const planningTarget=document.querySelector('#planning .card-title strong');
  if(planningTarget)planningTarget.textContent=brl(contribution)+'/mês';
  const planningTitle=document.querySelector('#planning .card-title div strong');
  if(planningTitle)planningTitle.textContent='🎯 Objetivo: '+brl(target);
  const base=document.querySelector('#planning .big-number');
  if(base)base.textContent=brl(contribution)+'/mês';
  const baseDescription=document.querySelector('#planning .big-number + .muted');
  if(baseDescription)baseDescription.textContent=`Aporte estimado para ${brl(target)} em ${months} meses, partindo de ${brl(initial)} e usando a premissa de ${rate.toFixed(2).replace('.',',')}% a.m.`;

  hideGoalModal();
  go('goals');
}

const createButton=document.querySelector('.modal-box .full');
if(createButton)createButton.onclick=createGoal;

const modal=document.getElementById('modal');
if(modal)modal.addEventListener('click',event=>{if(event.target===modal)hideGoalModal()});
