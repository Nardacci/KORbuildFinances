/* KORbuild Finances — Despesas V2 */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const schema=()=>KORbuildAuth.client.schema('finances');
let workspace=null, rows=[], categories=[];
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function initials(n){return String(n||'A').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();}
function setupUser(user,name){
 $('user-name').textContent=name;$('user-email').textContent=user.email||'';$('user-avatar').textContent=initials(name);$('menu-full-name').textContent=name;$('menu-full-email').textContent=user.email||'';$('menu-avatar').textContent=initials(name);
 $('user-menu-btn')?.addEventListener('click',e=>{e.stopPropagation();$('user-menu').classList.toggle('hidden')});document.addEventListener('click',e=>{if(!document.querySelector('.user-menu-wrap')?.contains(e.target))$('user-menu')?.classList.add('hidden')});$('logout')?.addEventListener('click',async()=>{await KORbuildAuth.logout();location.replace('index.html')});
}
function monthBounds(){const d=new Date();return {start:new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10),end:new Date(d.getFullYear(),d.getMonth()+1,1).toISOString().slice(0,10)};}
function categoryName(id){return categories.find(c=>c.id===id)?.name||'Sem categoria';}
function render(){
 const {start,end}=monthBounds(), filter=$('status-filter').value;
 const month=rows.filter(r=>(r.paid_date||r.planned_date)>=start&&(r.paid_date||r.planned_date)<end);
 const realized=month.filter(r=>r.status==='realized').reduce((s,r)=>s+Number(r.amount),0);
 const planned=month.filter(r=>r.status!=='canceled').reduce((s,r)=>s+Number(r.amount),0);
 const open=month.filter(r=>r.status==='planned').reduce((s,r)=>s+Number(r.amount),0);
 $('monthTotal').textContent=money(realized);$('plannedTotal').textContent=money(planned);$('openTotal').textContent=money(open);
 const visible=rows.filter(r=>filter==='all'||r.status===filter).sort((a,b)=>String(b.paid_date||b.planned_date).localeCompare(String(a.paid_date||a.planned_date)));
 $('expense-list').innerHTML=visible.length?visible.map(r=>`<div class="expense-row"><div class="expense-main"><strong>${esc(r.description)}</strong><small>${esc(categoryName(r.category_id))} · ${r.expense_type==='recurring'?'Recorrente':r.expense_type==='installment'?'Parcelada':'Eventual'} · ${new Date((r.paid_date||r.planned_date)+'T12:00:00').toLocaleDateString('pt-BR')}</small></div><div class="expense-amount">${money(r.amount)}</div><span class="expense-status ${r.status}">${r.status==='realized'?'Realizada':r.status==='planned'?'Prevista':'Cancelada'}</span><div class="expense-actions-cell"><a class="mini-action" href="expense-edit.html?id=${encodeURIComponent(r.id)}">Editar</a><button class="mini-action" data-delete="${esc(r.id)}">Excluir</button></div></div>`).join(''):'<div class="empty-state">Nenhuma despesa encontrada.</div>';
 document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>removeExpense(b.dataset.delete)));
 const totals={};month.filter(r=>r.status==='realized').forEach(r=>{totals[r.category_id||'none']=(totals[r.category_id||'none']||0)+Number(r.amount)});const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]);const max=entries[0]?.[1]||1;
 $('category-list').innerHTML=entries.length?entries.map(([id,v])=>`<div class="category-item"><div class="category-head"><span>${esc(categoryName(id==='none'?null:id))}</span><strong>${money(v)}</strong></div><div class="category-bar"><span style="width:${Math.max(4,v/max*100)}%"></span></div></div>`).join(''):'<div class="empty-state">Ainda não há gastos realizados neste mês.</div>';
}
async function removeExpense(id){
 const r=rows.find(x=>x.id===id);if(!r)return;
 if(!confirm(`Excluir a despesa “${r.description}”?`))return;
 const {error}=await schema().from('expenses').delete().eq('id',id).eq('workspace_id',workspace.id);if(error){alert('Não foi possível excluir a despesa.');console.error(error);return;}await loadData();
}
async function loadData(){
 const [er,cr]=await Promise.all([schema().from('expenses').select('*').eq('workspace_id',workspace.id),schema().from('expense_categories').select('id,name').eq('workspace_id',workspace.id).order('name')]);if(er.error)throw er.error;if(cr.error)throw cr.error;rows=er.data||[];categories=cr.data||[];render();
}
async function init(){
 const s=await KORbuildAuth.session();if(!s?.user){location.replace('index.html');return;}const {data:w,error}=await schema().from('user_workspaces').select('id,display_name,primary_currency,setup_completed').eq('user_id',s.user.id).maybeSingle();if(error)throw error;if(!w?.setup_completed){location.replace('workspace.html');return;}workspace=w;setupUser(s.user,w.display_name||s.user.email?.split('@')[0]||'Você');$('status-filter').addEventListener('change',render);await loadData();
}
init().catch(e=>{console.error(e);$('expense-list').innerHTML='<div class="empty-state">Não foi possível carregar as despesas.</div>';});
})();