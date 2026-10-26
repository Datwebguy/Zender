const $=s=>document.querySelector(s);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=z=>((z||0)/1e8).toFixed(8).replace(/0+$/,'').replace(/\.$/,'');
const statusLabel=s=>({awaiting_approval:'Needs approval',ready:'Ready to pay',executing:'Payment in progress',uncertain:'Needs recovery',broadcast:'Awaiting delivery',delivered:'Delivered',blocked:'Blocked',closed:'Closed',active:'Active',expired:'Expired',cancelled:'Cancelled',rejected:'Rejected'}[s]||s);
const badge=s=>`<span class="badge ${escape(s)}">${escape(statusLabel(s))}</span>`;
let workspace,selectedTask=null,view='tasks',filter='all',taskDetail,purchaseKey;
async function api(path,{method='GET',body}={}){
  const response=await fetch(path,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await response.json();if(response.status===401){$('#workspace').classList.add('hidden');$('#login').classList.remove('hidden');}
  if(!response.ok)throw new Error(result.error||'Something went wrong.');return result;
}
const post=(path,body={})=>api(path,{method:'POST',body});
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),5000);}
function age(date){return new Date(date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}
async function refresh(){
  workspace=await api('/api/workspace');$('#login').classList.add('hidden');$('#workspace').classList.remove('hidden');
  const sandbox=workspace.mode==='sandbox';$('#mode-label').textContent=workspace.provider;$('#mode-sidebar').textContent=sandbox?'Sandbox · no real funds':'Zcash testnet';
  $('#notice').classList.remove('hidden');$('#fault-label').classList.toggle('hidden',!sandbox);
  if(!sandbox){$('#notice strong').textContent=workspace.liveBroadcastEnabled?'Live testnet workspace':'Testnet integration preview';$('#notice div>span').textContent=workspace.liveBroadcastEnabled?'Real shielded payments using valueless test ZEC. Each purchase is verified by a separate receiving wallet.':'Wallet proposals can be checked. Automatic broadcasting is disabled pending exact-proposal signing.';$('#walkthrough').classList.add('hidden');}
  $('#task-count').textContent=workspace.tasks.length;
  const details=await Promise.all(workspace.tasks.map(t=>api(`/api/tasks/${t.id}`)));
  const approvals=details.flatMap(t=>t.purchases.filter(p=>p.status==='awaiting_approval').map(p=>({...p,taskTitle:t.title,taskExpired:t.expired,taskClosed:t.status==='closed'})));
  $('#approval-count').textContent=approvals.length;
  renderTasks();$('#approval-list').innerHTML=approvals.length?approvals.map(p=>`<article class="approval-card">${purchaseCard(p,true,p.taskExpired||p.taskClosed)}</article>`).join(''):empty('Nothing waiting on you.','Purchases above a task’s approval threshold will appear here.');
  if(selectedTask){taskDetail=details.find(t=>t.id===selectedTask);if(taskDetail)renderDetail(taskDetail);}
  $('#service-options').innerHTML=workspace.services.map(s=>`<label class="checkbox-label"><input type="checkbox" name="services" value="${escape(s.id)}" checked>${escape(s.name)} <small>${money(s.priceZat)} ZEC</small></label>`).join('');
  const previous=$('#connect-task').value;
  $('#connect-task').innerHTML='<option value="">Select a task account</option>'+workspace.tasks.filter(t=>t.status==='active'&&!t.expired).map(t=>`<option value="${t.id}">${escape(t.title)}</option>`).join('');
  if(previous)$('#connect-task').value=previous;
}
function empty(title,text,button=''){return `<div class="empty"><span class="privacy-mark">◒</span><h2>${title}</h2><p>${text}</p>${button}</div>`;}
function stat(label,value,caption,unit=''){return `<div><span class="stat-label">${label}</span><div class="stat-value">${escape(value)}${unit?`<small>${unit}</small>`:''}</div><div class="stat-caption">${caption}</div></div>`;}
function renderTasks(){
  const ts=workspace.tasks,active=ts.filter(t=>t.status==='active'&&!t.expired);
  $('#active-count').textContent=ts.length;
  $('#summary').innerHTML=stat('Active task accounts',String(active.length),'Each with its own permissions')+stat('Spent on tasks',money(ts.reduce((n,t)=>n+t.spentZat,0)),'Delivered purchases, including fees','ZEC')+stat('Reserved for purchases',money(ts.reduce((n,t)=>n+t.reservedZat,0)),'Held while approval or delivery is pending','ZEC')+stat('Available to spend',money(active.reduce((n,t)=>n+t.availableZat,0)),'Across active task budgets','ZEC');
  const list=ts.filter(t=>filter==='all'||(filter==='active'?t.status==='active'&&!t.expired:t.status==='closed'));
  $('#task-list').innerHTML=list.length?list.map(t=>`<button class="task-card" data-task="${t.id}"><div class="card-top"><span class="task-icon">⌁</span>${badge(t.status==='closed'?'closed':t.expired?'expired':'active')}</div><h3>${escape(t.title)}</h3><div class="task-meta">${t.services.length} permitted services · ${t.mode==='sandbox'?'Simulated payments':'Testnet payments'}</div><div class="budget-line"><strong>${money(t.spentZat)}</strong> / ${money(t.budgetZat)} ZEC spent</div><progress max="${t.budgetZat}" value="${t.spentZat+t.reservedZat}" aria-label="Spent and reserved task budget"></progress><div class="task-meta">${money(t.availableZat)} ZEC available · ${money(t.reservedZat)} reserved</div><div class="card-bottom"><span>${t.status==='closed'?'Authorization closed':'Expires '+age(t.expiresAt)}</span><span class="arrow">↗</span></div></button>`).join(''):empty('Good work starts with a clear brief.','Create a task account, choose its services, and set the spending boundaries.','<button class="button dark" data-new-task>＋ Create your first task</button>');
}
function purchaseCard(p,approvalOnly=false,inactive=false){
  const buttons=[];
  if(p.status==='awaiting_approval'&&!inactive){buttons.push(`<button class="button dark" data-action="approve" data-purchase="${p.id}">Approve exact purchase</button>`,`<button class="button" data-action="reject" data-purchase="${p.id}">Reject</button>`);}
  if(p.status==='ready'&&!inactive)buttons.push(`<button class="button dark" data-action="execute" data-purchase="${p.id}">${p.mode==='sandbox'?'Run sandbox purchase':'Authorize testnet payment'} ↗</button>`);
  if(['uncertain','broadcast'].includes(p.status))buttons.push(`<button class="button dark" data-action="recover" data-purchase="${p.id}">Recover purchase ↻</button>`);
  return `<div class="purchase"><div class="purchase-header"><div><h3>${escape(p.serviceName)}</h3>${p.taskTitle?`<p>${escape(p.taskTitle)}</p>`:''}</div>${badge(p.status)}</div><p>${escape(p.reason)}</p><div class="price">${money(p.amountZat)} ZEC <span>+ ${money(p.actualFeeZat??p.feeZat)} ${p.actualFeeZat===null?'maximum ':''}fee</span></div><p>${escape(p.decision)}</p>${p.error?`<p class="error">${escape(p.error)}</p>`:''}${p.status==='uncertain'?'<div class="mini-note">The budget stays reserved. Recovery checks the existing payment; it does not send another.</div>':''}${p.status==='broadcast'?'<p>Broadcast recorded. Confirmation and service delivery are still pending.</p>':''}<details><summary>Review exact input & payment details</summary><pre>${escape(JSON.stringify({input:p.input,recipient:p.recipient,amountZat:p.amountZat,maximumFeeZat:p.feeZat,purchaseId:p.id,txid:p.txid||null},null,2))}</pre></details>${p.status==='delivered'?`<details open><summary>Purchased result ${p.simulation?'· sandbox':''}</summary><pre>${escape(JSON.stringify(p.result,null,2))}</pre></details>`:''}<div class="purchase-actions">${buttons.join('')}</div></div>`;
}
function renderDetail(t){
  const inactive=t.status!=='active'||t.expired;
  $('#detail-view').innerHTML=`<button class="text-button back" data-back>← All task accounts</button><div class="page-heading detail-heading"><div><p class="eyebrow">TASK EXPENSE ACCOUNT</p><h1>${escape(t.title)}<span class="accent">.</span></h1><p>Created ${age(t.createdAt)} · ${t.mode==='sandbox'?'Simulated payments; no ZEC moves':'Valueless testnet ZEC'}</p><div class="detail-status">${badge(t.status==='closed'?'closed':t.expired?'expired':'active')}</div></div><div class="detail-actions"><button class="button" data-export="${t.id}">↓ Expense record</button>${!inactive?'<button class="button dark" id="request-purchase">＋ Request purchase</button>':''}</div></div><div class="summary">${stat('Task budget',money(t.budgetZat),'Maximum spend, including fees','ZEC')}${stat('Spent',money(t.spentZat),'Paid and delivered','ZEC')}${stat('Reserved',money(t.reservedZat),'Pending purchases','ZEC')}${stat('Available',money(t.availableZat),inactive?'Authorization is no longer active':'Within this task’s permissions','ZEC')}</div><div class="detail-grid"><div><div class="section-heading"><h2>Purchases <span class="subtle-count">${t.purchases.length}</span></h2></div>${t.purchases.length?t.purchases.map(p=>purchaseCard(p,false,inactive)).join(''):empty('Ready when your agent is.','Connect an agent or request a purchase to exercise this task’s permissions.')}</div><aside><article class="panel"><p class="eyebrow">THE BOUNDARIES</p><h2>Permission, with a purpose.</h2><div class="policy-list"><div><span>Approval above</span><strong>${money(t.approvalZat)} ZEC<br>including fee reserve</strong></div><div><span>Expires</span><strong>${age(t.expiresAt)}</strong></div><div><span>Permitted services</span><strong>${t.services.map(s=>escape(workspace.services.find(x=>x.id===s)?.name||s)).join('<br>')}</strong></div></div><div class="mini-note">Requests outside this budget or service list are blocked. Your agent cannot change these rules.</div>${t.status==='active'?`<button class="text-button error" data-close-task="${t.id}">Close authorization ↗</button>`:''}</article><article class="panel"><p class="eyebrow">ACTIVITY</p><ul class="timeline">${t.events.slice(0,12).map(e=>`<li>${escape(e.kind.replaceAll('.',' ').replaceAll('_',' '))}<small>${age(e.at)}</small></li>`).join('')}</ul></article></aside></div>`;
}
function navigate(next){view=next;for(const name of ['tasks','approvals','connect','detail'])$('#'+name+'-view').classList.toggle('hidden',name!==next);document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===next||(next==='detail'&&b.dataset.nav==='tasks')));$('#breadcrumb').textContent='Workspace / '+({tasks:'Task accounts',approvals:'Approvals',connect:'Connect an agent',detail:'Task account'}[next]);}
function openTaskDialog(){ $('#task-error').textContent='';$('#task-dialog').showModal(); }
const samples={
  'document-extract':{text:'North Paper: $42 per unit, $8 shipping. Studio Supply: $45 per unit, $2 shipping.'},
  'supplier-compare':{quotes:[{name:'North Paper',unitCostCents:4200,shippingCents:800},{name:'Studio Supply',unitCostCents:4500,shippingCents:200}]},
  'report-export':{title:'Supplier decision',findings:'Add your verified findings here.'}
};
function openPurchase(){
  purchaseKey=crypto.randomUUID();
  $('#purchase-form').reset();$('#purchase-error').textContent='';
  $('#purchase-service').innerHTML=workspace.services.map(s=>`<option value="${escape(s.id)}">${escape(s.name)} · ${money(s.priceZat)} ZEC</option>`).join('');
  updateSample();$('#purchase-dialog').showModal();
}
function updateSample(){$('#purchase-input').value=JSON.stringify(samples[$('#purchase-service').value]||{},null,2);}
$('#purchase-service').addEventListener('change',updateSample);
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();try{await post('/api/session',{token:new FormData(e.target).get('token')});e.target.reset();await refresh();}catch(error){$('#login-error').textContent=error.message;}});
$('#task-form').addEventListener('submit',async e=>{
  e.preventDefault();const b=e.submitter;b.disabled=true;
  try{const f=new FormData(e.target);const t=await post('/api/tasks',{title:f.get('title'),budgetZec:f.get('budgetZec'),approvalZec:f.get('approvalZec'),expiresInHours:Number(f.get('expiresInHours')),services:f.getAll('services')});$('#task-dialog').close();e.target.reset();selectedTask=t.id;await refresh();navigate('detail');toast('Task account created.');}
  catch(error){$('#task-error').textContent=error.message;}finally{b.disabled=false;}
});
$('#purchase-form').addEventListener('submit',async e=>{
  e.preventDefault();const b=e.submitter;b.disabled=true;
  try{const f=new FormData(e.target);await post(`/api/tasks/${selectedTask}/purchases`,{serviceId:f.get('serviceId'),reason:f.get('reason'),input:JSON.parse(f.get('input')),simulateResponseLoss:f.get('simulateResponseLoss')==='on',idempotencyKey:purchaseKey});$('#purchase-dialog').close();await refresh();toast('Purchase checked against task permissions.');}
  catch(error){$('#purchase-error').textContent=error.message;}finally{b.disabled=false;}
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
    if(b.dataset.nav)navigate(b.dataset.nav);
    if(b.dataset.close)$('#'+b.dataset.close).close();
    if(b.id==='new-task'||b.hasAttribute('data-new-task'))openTaskDialog();
    if(b.dataset.filter){filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));renderTasks();}
    if(b.dataset.task){selectedTask=b.dataset.task;taskDetail=await api(`/api/tasks/${selectedTask}`);renderDetail(taskDetail);navigate('detail');}
    if(b.hasAttribute('data-back')){selectedTask=null;navigate('tasks');}
    if(b.id==='request-purchase')openPurchase();
    if(b.dataset.action){b.disabled=true;const p=await post(`/api/purchases/${b.dataset.purchase}/${b.dataset.action}`);await refresh();toast(statusLabel(p.status)+'.');}
    if(b.dataset.closeTask){if(!confirm('Close this authorization? Unstarted purchases will be cancelled and agent credentials revoked. Payments already in progress may still finish.'))return;b.disabled=true;await post(`/api/tasks/${b.dataset.closeTask}/close`);await refresh();toast('Task authorization closed.');}
    if(b.dataset.export){const receipt=await api(`/api/tasks/${b.dataset.export}/receipt`);const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zender-expenses.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Redacted expense record exported.');}
    if(b.id==='issue-token'){
      const id=$('#connect-task').value;if(!id)throw new Error('Choose an active task first.');
      const credential=await post(`/api/tasks/${id}/credentials`);
      $('#credential-result').innerHTML=`<div class="credential"><strong>Copy once. Keep it private.</strong><p>This credential grants spending access within the selected task’s rules.</p><code>${escape(credential.token)}</code><button type="button" class="button" id="copy-credential">Copy credential</button></div>`;
      $('#copy-credential').onclick=async()=>{try{await navigator.clipboard.writeText(credential.token);toast('Credential copied.');}catch{toast('Select and copy the credential above.');}};
    }
    if(b.id==='logout'){await api('/api/session',{method:'DELETE',body:{}});location.reload();}
    if(b.id==='walkthrough'){
      b.disabled=true;
      const task=await post('/api/tasks',{title:'Research packaging suppliers',budgetZec:'0.0012',approvalZec:'0.0003',services:['document-extract','supplier-compare','report-export'],expiresInHours:24});
      const purchase=await post(`/api/tasks/${task.id}/purchases`,{serviceId:'supplier-compare',reason:'Find the lowest delivered cost among the supplier quotes.',input:samples['supplier-compare'],idempotencyKey:crypto.randomUUID(),simulateResponseLoss:true});
      await post(`/api/purchases/${purchase.id}/execute`);
      const recovered=await post(`/api/purchases/${purchase.id}/recover`);
      await post(`/api/tasks/${task.id}/purchases`,{serviceId:'report-export',reason:'Package the comparison into a decision report.',input:{title:'Supplier decision',findings:JSON.stringify(recovered.result,null,2)},idempotencyKey:crypto.randomUUID()});
      selectedTask=task.id;await refresh();navigate('detail');toast('Lost response recovered without another payment. Review the report purchase.');
    }
  }catch(error){toast(error.message);}finally{b.disabled=false;}
});
const setupToken=new URLSearchParams(location.hash.slice(1)).get('setup');
if(setupToken){history.replaceState(null,'',location.pathname);post('/api/session',{token:setupToken}).then(refresh).catch(error=>{$('#login').classList.remove('hidden');$('#login-error').textContent=error.message;});}
else refresh().catch(error=>{if(!$('#login').classList.contains('hidden'))return;toast(error.message);});
setInterval(()=>{if(workspace&&!document.querySelector('dialog[open]')&&!$('#workspace').classList.contains('hidden'))refresh().catch(()=>{});},7000);
