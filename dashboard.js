/* KORbuild Finances — Dashboard V5 */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  const db=()=>KORbuildAuth.client.schema('finances');
  function setText(id,value){const e=$(id);if(e)e.textContent=value;}
  function showError(message){const e=$('status');if(e){e.textContent=message;e.classList.remove('hidden');}}
  function deadline(start,years){if(!start||!years)return null;const d=new Date(start+'T12:00:00');d.setFullYear(d.getFullYear()+Number(years));return d;}
  function initials(name){return String(name||'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'A';}
  function lang(){return localStorage.getItem('korbuild-language')||'pt-BR';}
  function setupHeader(user,name){
    setText('user-name',name);setText('user-email',user.email||'');setText('user-avatar',initials(name));setText('menu-full-name',name);setText('menu-full-email',user.email||'');setText('menu-avatar',initials(name));
    $('user-menu-btn')?.addEventListener('click',e=>{e.stopPropagation();const m=$('user-menu');m?.classList.toggle('hidden');$('user-menu-btn')?.setAttribute('aria-expanded',m?.classList.contains('hidden')?'false':'true');});
    document.addEventListener('click',e=>{const wrap=document.querySelector('.user-menu-wrap');if(wrap&&!wrap.contains(e.target)){$('user-menu')?.classList.add('hidden');$('user-menu-btn')?.setAttribute('aria-expanded','false');}});
    $('logout')?.addEventListener('click',async()=>{await KORbuildAuth.logout();window.location.replace('index.html');});
    $('language-toggle')?.addEventListener('click',()=>{localStorage.setItem('korbuild-language',lang()==='pt-BR'?'en-US':'pt-BR');window.location.reload();});
  }
  function wireQuickLaunch(){
    const btn=$('quick-launch'),menu=$('quick-menu'),mobile=$('mobile-launch');
    const toggle=e=>{e.stopPropagation();menu?.classList.toggle('hidden');};
    btn?.addEventListener('click',toggle);mobile?.addEventListener('click',toggle);
    document.addEventListener('click',e=>{if(menu&&!menu.contains(e.target)&&e.target!==btn&&e.target!==mobile)menu.classList.add('hidden');});
  }
  async function load(){
    const session=await KORbuildAuth.session();if(!session?.user){window.location.replace('index.html');return;}
    const {data:w,error:we}=await db().from('user_workspaces').select('id,display_name,country,primary_currency,setup_completed').eq('user_id',session.user.id).maybeSingle();if(we)throw we;if(!w){window.location.replace('workspace.html');return;}if(!w.setup_completed){window.location.replace('workspace.html');return;}
    const now=new Date(),monthStart=new Date(now.getFullYear(),now.getMonth(),1),nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1),startISO=monthStart.toISOString().slice(0,10),endISO=nextMonth.toISOString().slice(0,10);
    const [{data:g,error:ge},{data:accounts,error:ae},{data:incomes,error:ie},{data:plans,error:pe},{data:positions,error:pose},{data:investmentTx,error:te}]=await Promise.all([
      db().from('goals').select('id,name,target_amount,target_years,start_date,initial_wealth,include_initial_wealth,created_at').eq('workspace_id',w.id).order('created_at',{ascending:false}).limit(1),
      db().from('accounts').select('opening_balance,currency').eq('workspace_id',w.id),
      db().from('incomes').select('amount,currency,frequency,description').eq('workspace_id',w.id),
      db().from('plans').select('goal_id,projected_monthly_contribution,projected_monthly_rate,created_at').eq('workspace_id',w.id).order('created_at',{ascending:false}).limit(1),
      db().from('investment_positions').select('investment_id,position_value,cost_basis,result,return_pct,currency,valuation_status').eq('workspace_id',w.id),
      db().from('investment_transactions').select('transaction_type,amount,currency,transaction_date').eq('workspace_id',w.id).gte('transaction_date',startISO).lt('transaction_date',endISO)
    ]);
    if(ge||ae||ie||pe||pose||te)throw(ge||ae||ie||pe||pose||te);
    const goal=(g||[])[0]||null,plan=(plans||[])[0]||null,accountRows=accounts||[],incomeRows=incomes||[],positionRows=positions||[],txRows=investmentTx||[];
    const balance=accountRows.reduce((s,a)=>s+Number(a.opening_balance||0),0);
    const income=incomeRows.reduce((s,a)=>s+Number(a.amount||0),0);
    const investmentValue=positionRows.reduce((s,a)=>s+Number(a.position_value||0),0);
    const investedThisMonth=txRows.filter(t=>['contribution','adjustment'].includes(t.transaction_type)).reduce((s,t)=>s+Number(t.amount||0),0);
    const target=Number(goal?.target_amount||0);
    const considered=goal?.include_initial_wealth?Number(goal.initial_wealth||0):balance+investmentValue;
    const progress=target>0?Math.min(100,Math.max(0,(considered/target)*100)):0;
    const remaining=Math.max(0,target-considered);
    const d=deadline(goal?.start_date,goal?.target_years);
    const en=lang()==='en-US';
    const primary=w.primary_currency||'BRL';
    const currencyLabel=primary.split(' — ')[0]||'BRL';
    const money=v=>currencyLabel==='BRL'?brl(v):Number(v||0).toLocaleString(en?'en-US':'pt-BR',{style:'currency',currency:currencyLabel,maximumFractionDigits:0});
    setupHeader(session.user,w.display_name||session.user.email?.split('@')[0]||'André');
    setText('hello',`${en?'Hello':'Olá'}, ${w.display_name||'você'}`);
    setText('goalName',goal?.name||'Nenhum sonho configurado');setText('goalTarget',money(target));setText('wealth',money(considered));setText('balance',money(balance));setText('investmentValue',money(investmentValue));
    setText('investmentNote',positionRows.length?`${positionRows.length} ${positionRows.length===1?'investimento':'investimentos'}`:'Nenhum investimento ainda');
    setText('wealthNote',goal?.include_initial_wealth?'Patrimônio inicial considerado':'Contas + investimentos');
    const bar=$('progressBar');if(bar)bar.style.width=progress+'%';setText('progressLabel',progress.toLocaleString(en?'en-US':'pt-BR',{maximumFractionDigits:1})+'%');setText('remaining',money(remaining));setText('deadline',d?d.toLocaleDateString(en?'en-US':'pt-BR',{month:'long',year:'numeric'}):'—');
    setText('goalStatus',goal?(progress>=100?'Objetivo alcançado':(plan?'Você está no caminho':'Objetivo configurado')):'Configure seu sonho');
    setText('accountCount',`${accountRows.length} ${accountRows.length===1?'conta':'contas'}`);
    setText('flowIncome',money(income));
    setText('flowTransfer','—');
    setText('flowInvestment',money(investedThisMonth));
    setText('flowExpense','—');
    setText('surplus','—');
    setText('surplusNote','A sobra será calculada quando receitas, transferências e despesas do período estiverem conectadas ao motor financeiro.');
    setText('evolutionValue',money(considered));
    setText('evolutionNote','O histórico real será formado pelos fechamentos patrimoniais mensais.');
    setText('insightTitle',goal?'Seu painel está pronto para acompanhar sua jornada.':'Comece definindo seu sonho.');
    setText('insightText',goal?'Conforme você registra receitas, investimentos e despesas, o sistema poderá comparar sua evolução com o ritmo necessário para o objetivo.':'Defina seu objetivo financeiro para transformar seus números em uma jornada clara.');
    setText('monthLabel',now.toLocaleDateString(en?'en-US':'pt-BR',{month:'long',year:'numeric'}));
    wireQuickLaunch();
  }
  load().catch(error=>{console.error('Finance dashboard load failed:',error);showError('Não foi possível carregar os dados do seu espaço financeiro.');});
})();