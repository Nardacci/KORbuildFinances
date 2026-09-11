/* KORbuild Finances — Accounts V3 */
(() => {
'use strict';
const $=id=>document.getElementById(id); const db=()=>KORbuildAuth.client.schema('finances'); let workspace=null;
const currencyCode=v=>String(v||'').trim().split(/\s+—\s+/)[0].trim().toUpperCase();
const brl=(v,c='BRL')=>{const code=currencyCode(c);return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:['BRL','USD','EUR','GBP'].includes(code)?code:'BRL',maximumFractionDigits:2})};
const initials=n=>String(n||'').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'A';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function header(user){const n=workspace?.display_name||user.user_metadata?.full_name||user.email?.split('@')[0]||'André';$('user-name').textContent=n;$('user-email').textContent=user.email||'';$('user-avatar').textContent=initials(n);$('menu-full-name').textContent=n;$('menu-full-email').textContent=user.email||'';$('menu-avatar').textContent=initials(n);$('user-menu-btn').onclick=e=>{e.stopPropagation();$('user-menu').classList.toggle('hidden')};document.addEventListener('click',e=>{if(!document.querySelector('.user-menu-wrap').contains(e.target))$('user-menu').classList.add('hidden')});$('logout').onclick=async()=>{await KORbuildAuth.logout();location.replace('index.html')};}
function show(msg,kind=''){const e=$('message');e.textContent=msg;e.className='message '+kind;}
async function loadAccounts(){
  const [{data,error:ae},{data:transfers,error:te}]=await Promise.all([
    db().from('accounts').select('id,name,account_type,currency,opening_balance,created_at').eq('workspace_id',workspace.id).order('created_at',{ascending:true}),
    db().from('transfers').select('source_account_id,destination_account_id,source_amount,destination_amount,source_currency,destination_currency,transfer_date').eq('workspace_id',workspace.id)
  ]);
  if(ae)throw ae;if(te)throw te;
  const rows=data||[], tx=transfers||[];
  const balances=new Map(rows.map(a=>[a.id,Number(a.opening_balance||0)]));
  tx.forEach(t=>{
    const source=balances.get(t.source_account_id);
    const destination=balances.get(t.destination_account_id);
    if(source!==undefined)balances.set(t.source_account_id,source-Number(t.source_amount||0));
    if(destination!==undefined)balances.set(t.destination_account_id,destination+Number(t.destination_amount||0));
  });
  const body=$('accounts-body');body.innerHTML='';$('empty').classList.toggle('hidden',!!rows.length);
  rows.forEach(row=>{const tr=document.createElement('tr');const balance=balances.get(row.id)||0;tr.innerHTML=`<td><strong>${esc(row.name)}</strong></td><td>${esc(row.account_type)}</td><td>${esc(row.currency)}</td><td>${brl(balance,row.currency)}</td><td><div class="actions"><a class="action" href="account-edit.html?id=${encodeURIComponent(row.id)}">Editar</a><button class="action danger" data-delete="${row.id}">Excluir</button></div></td>`;body.appendChild(tr)});
  body.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeAccount(b.dataset.delete));
}
async function removeAccount(id){if(!confirm('Excluir esta conta? Esta ação não pode ser desfeita.'))return;show('Excluindo…');const {error}=await db().from('accounts').delete().eq('id',id).eq('workspace_id',workspace.id);if(error){show(error.message,'error');return}show('Conta excluída.','ok');await loadAccounts();}
async function init(){const s=await KORbuildAuth.session();if(!s?.user){location.replace('index.html');return}const {data,error}=await db().from('user_workspaces').select('id,display_name,setup_completed').eq('user_id',s.user.id).maybeSingle();if(error)throw error;if(!data||!data.setup_completed){location.replace('workspace.html');return}workspace=data;header(s.user);await loadAccounts();const p=new URLSearchParams(location.search);if(p.get('created'))show('Conta cadastrada com sucesso.','ok');if(p.get('updated'))show('Conta atualizada com sucesso.','ok');}
init().catch(e=>{console.error(e);show('Não foi possível carregar suas contas.','error')});
})();