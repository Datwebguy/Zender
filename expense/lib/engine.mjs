import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { zats, integer } from './money.mjs';
export class Fault extends Error { constructor(message,status=400,code='INVALID_REQUEST'){super(message);this.status=status;this.code=code;} }
const terminal=new Set(['delivered','rejected','blocked','cancelled']);
const reserved=new Set(['awaiting_approval','ready','executing','uncertain','broadcast']);
const digest=s=>createHash('sha256').update(s).digest('hex');
function canonical(v) {if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
export class Engine {
  constructor(store,provider){this.store=store;this.provider=provider;}
  requireTask(id){const t=this.store.getTask(id);if(!t)throw new Fault('Task not found.',404,'NOT_FOUND');return t;}
  requirePurchase(id){const p=this.store.getPurchase(id);if(!p)throw new Fault('Purchase not found.',404,'NOT_FOUND');return p;}
  assertActive(t){if(t.mode!==this.provider.mode)throw new Fault('This task belongs to a different payment environment.',409,'NETWORK_MISMATCH');if(t.status!=='active')throw new Fault('Task authorization is closed.',409,'TASK_CLOSED');if(Date.parse(t.expiresAt)<=Date.now())throw new Fault('Task authorization expired.',409,'TASK_EXPIRED');}
  totals(id){
    let spentZat=0,reservedZat=0;
    for(const p of this.store.purchases(id)){
      if(p.status==='delivered')spentZat+=p.amountZat+p.actualFeeZat;
      else if(reserved.has(p.status))reservedZat+=p.amountZat+p.feeZat;
    }
    const task=this.requireTask(id);return{spentZat,reservedZat,availableZat:Math.max(0,task.budgetZat-spentZat-reservedZat)};
  }
  view(id){const t=this.requireTask(id);return{...t,...this.totals(id),expired:Date.parse(t.expiresAt)<=Date.now(),purchases:this.store.purchases(id),events:this.store.events(id)};}
  list(){return this.store.tasks().map(t=>({...t,...this.totals(t.id),expired:Date.parse(t.expiresAt)<=Date.now()}));}
  createTask({title,budgetZec,approvalZec,services,expiresInHours=24}){
    if(typeof title!=='string'||!title.trim()||title.length>120)throw new Fault('Give the task a title of up to 120 characters.');
    const budgetZat=zats(budgetZec),approvalZat=zats(approvalZec);
    if(approvalZat>budgetZat)throw new Fault('The approval threshold cannot exceed the task budget.');
    if(!Array.isArray(services)||!services.length||services.length>30||services.some(s=>typeof s!=='string'||!s||s.length>80))throw new Fault('Choose at least one permitted service.');
    if(!Number.isFinite(expiresInHours)||expiresInHours<=0||expiresInHours>720)throw new Fault('Authorization must expire within 30 days.');
    const t={id:randomUUID(),title:title.trim(),budgetZat,approvalZat,services:[...new Set(services)],status:'active',mode:this.provider.mode,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+expiresInHours*3600000).toISOString()};
    this.store.transaction(()=>{this.store.putTask(t);this.store.event(t.id,'task.created',{title:t.title,budgetZat});});return this.view(t.id);
  }
  issueCredential(taskId){
    const task=this.requireTask(taskId);this.assertActive(task);
    const token='zender_agent_'+randomBytes(32).toString('hex');
    this.store.transaction(()=>{this.store.addCredential(digest(token),taskId);this.store.event(taskId,'agent.connected');});
    return{token,taskId,expiresAt:task.expiresAt};
  }
  authenticateAgent(token){const c=this.store.credential(digest(token));if(!c||c.revoked)throw new Fault('Agent credential is invalid or revoked.',401,'UNAUTHORIZED');return c.task_id;}
  request(taskId,{serviceId,input={},reason,idempotencyKey,simulateResponseLoss=false}){
    if(typeof idempotencyKey!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(idempotencyKey))throw new Fault('Provide a stable idempotency key of 8–100 letters, numbers, underscores or hyphens.');
    if(typeof reason!=='string'||!reason.trim()||reason.length>1000)throw new Fault('Explain why this purchase is needed (up to 1000 characters).');
    if(!input||typeof input!=='object'||Array.isArray(input)||JSON.stringify(input).length>32000)throw new Fault('Service input must be a JSON object under 32 KB.');
    if(simulateResponseLoss&&this.provider.mode!=='sandbox')throw new Fault('Fault simulation is only available in sandbox.');
    const fingerprint=digest(JSON.stringify(canonical({serviceId,input,reason,simulateResponseLoss:!!simulateResponseLoss})));
    return this.store.transaction(()=>{
      const previous=this.store.findPurchase(taskId,idempotencyKey);
      if(previous){if(previous.fingerprint!==fingerprint)throw new Fault('This idempotency key belongs to a different purchase.',409,'IDEMPOTENCY_CONFLICT');return previous;}
      const t=this.requireTask(taskId);this.assertActive(t);
      const allowed=t.services.includes(serviceId);
      let quote;
      try{quote=this.provider.quote(serviceId,input);}catch(error){throw new Fault(error.message);}
      integer(quote.priceZat);integer(quote.feeZat);
      if(quote.priceZat<=0)throw new Fault('Service price must be positive.');
      const total=quote.priceZat+quote.feeZat;integer(total);
      const available=this.totals(taskId).availableZat;
      const status=!allowed||total>available?'blocked':total>t.approvalZat?'awaiting_approval':'ready';
      const decision=!allowed?'Service is outside this task’s permissions.':total>available?'Purchase and fee exceed the remaining task budget.':status==='awaiting_approval'?'This purchase needs your approval.':'Within the task’s budget and permissions.';
      const p={id:randomUUID(),taskId,serviceId,serviceName:quote.name,recipient:quote.recipient,amountZat:quote.priceZat,feeZat:quote.feeZat,actualFeeZat:null,input,reason:reason.trim(),status,decision,idempotencyKey,fingerprint,createdAt:new Date().toISOString(),quoteResult:quote.result,simulateResponseLoss:!!simulateResponseLoss,mode:this.provider.mode};
      this.store.putPurchase(p);this.store.event(taskId,'purchase.'+status,{purchaseId:p.id,serviceId,totalZat:total});return p;
    });
  }
  decide(id,approve){
    return this.store.transaction(()=>{
      const p=this.requirePurchase(id);const t=this.requireTask(p.taskId);this.assertActive(t);
      if(p.status!=='awaiting_approval')throw new Fault('This purchase is not awaiting approval.',409,'INVALID_STATE');
      p.status=approve?'ready':'rejected';p.decision=approve?'You approved this exact purchase.':'You rejected this purchase.';p.decidedAt=new Date().toISOString();
      this.store.putPurchase(p);this.store.event(p.taskId,'purchase.'+(approve?'approved':'rejected'),{purchaseId:id,fingerprint:p.fingerprint});return p;
    });
  }
  async execute(id){
    const claim=this.store.transaction(()=>{
      const p=this.requirePurchase(id);
      if(terminal.has(p.status)||['uncertain','executing','broadcast'].includes(p.status))return {p,claimed:false};
      this.assertActive(this.requireTask(p.taskId));
      if(p.status!=='ready')throw new Fault('Owner approval is required before payment.',409,'APPROVAL_REQUIRED');
      p.status='executing';p.startedAt=new Date().toISOString();this.store.putPurchase(p);this.store.event(p.taskId,'payment.started',{purchaseId:id});return {p,claimed:true};
    });
    const {p}=claim;
    if(!claim.claimed)return p;
    // A durable claim is acquired once. Retried calls never re-enter the signer.
    if(this.inflight?.has(id))return this.requirePurchase(id);
    this.inflight??=new Set();this.inflight.add(id);
    // Executing rows from a prior process are recovered on startup, never replayed.
    try{const payment=await this.provider.pay(p,async prepared=>{
      if(!/^[a-f0-9]{64}$/.test(prepared.txid)||!Number.isSafeInteger(prepared.feeZat)||prepared.feeZat<0||prepared.feeZat>p.feeZat)throw new Fault('Prepared transaction exceeds its authorization.');
      const current=this.requirePurchase(id);this.assertActive(this.requireTask(p.taskId));
      current.txid=prepared.txid;current.actualFeeZat=prepared.feeZat;current.pcztHash=prepared.pcztHash;
      this.store.transaction(()=>{this.store.putPurchase(current);this.store.event(p.taskId,'payment.prepared',{purchaseId:id,txid:prepared.txid});});
    });return this.recordPayment(p,payment);}
    catch(error){
      const current=this.requirePurchase(id);current.status=error.definitelyNotSent===true?'ready':'uncertain';current.error=String(error.message||error).slice(0,500);
      this.store.transaction(()=>{this.store.putPurchase(current);this.store.event(p.taskId,error.definitelyNotSent===true?'payment.not_sent':'payment.uncertain',{purchaseId:id});});return current;
    }finally{this.inflight.delete(id);}
  }
  recordPayment(p,payment){
    if(!payment||!/^[a-f0-9]{64}$/i.test(payment.txid)||payment.amountZat!==p.amountZat||!Number.isSafeInteger(payment.feeZat)||payment.feeZat<0||payment.feeZat>p.feeZat)throw new Fault('Payment evidence does not match the authorized purchase.',502,'EVIDENCE_MISMATCH');
    p=this.requirePurchase(p.id);p.txid=payment.txid;p.actualFeeZat=payment.feeZat;p.simulation=!!payment.simulation;
    const delivered=payment.confirmed===true&&Object.hasOwn(payment,'result')&&payment.result!==undefined;
    p.status=delivered?'delivered':'broadcast';p.error=null;
    if(delivered){p.result=payment.result;p.resultHash=digest(JSON.stringify(payment.result));p.deliveredAt=new Date().toISOString();}
    if(payment.evidence)p.evidence=payment.evidence;
    this.store.transaction(()=>{this.store.putPurchase(p);this.store.event(p.taskId,delivered?'purchase.delivered':'payment.broadcast',{purchaseId:p.id,txid:p.txid});});return p;
  }
  async recover(id){
    const p=this.requirePurchase(id);
    if(p.status==='delivered')return p;
    if(!['uncertain','broadcast'].includes(p.status))throw new Fault('Only an uncertain or broadcast payment needs recovery.',409,'INVALID_STATE');
    try{const payment=await this.provider.recover(p);if(payment)return this.recordPayment(p,payment);}
    catch(error){p.error=String(error.message||error).slice(0,500);this.store.putPurchase(p);}
    return this.requirePurchase(id);
  }
  closeTask(id){return this.store.transaction(()=>{
    const t=this.requireTask(id);t.status='closed';t.closedAt=new Date().toISOString();
    for(const p of this.store.purchases(id))if(['ready','awaiting_approval'].includes(p.status)){p.status='cancelled';this.store.putPurchase(p);}
    this.store.putTask(t);this.store.revoke(id);this.store.event(id,'task.closed');return this.view(id);
  });}
  recoverInterrupted(){for(const t of this.store.tasks())for(const p of this.store.purchases(t.id))if(p.status==='executing'){p.status='uncertain';p.error='Service restarted during payment. Reconcile before any further spend.';this.store.putPurchase(p);}}
  receipt(id,{details=false}={}){
    const t=this.view(id);
    return {schema:'zender.task-expenses/v1',taskId:t.id,title:t.title,mode:t.mode,status:t.status,budgetZat:t.budgetZat,spentZat:t.spentZat,reservedZat:t.reservedZat,exportedAt:new Date().toISOString(),purchases:t.purchases.map(p=>({id:p.id,service:p.serviceName,status:p.status,amountZat:p.amountZat,feeZat:p.actualFeeZat,resultHash:p.resultHash||null,...(details?{reason:p.reason,recipient:p.recipient,txid:p.txid||null,input:p.input,result:p.result,evidence:p.evidence}: {})})),disclosure:details?'Detailed export includes recipients, transaction identifiers, task inputs and results.':'Recipients, transaction identifiers, task inputs and results omitted. Task title and expense amounts remain visible.'};
  }
}
