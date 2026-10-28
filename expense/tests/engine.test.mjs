import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../lib/store.mjs';
import { Engine } from '../lib/engine.mjs';
import { SandboxProvider } from '../lib/providers.mjs';
import { zats, zec } from '../lib/money.mjs';
const setup=()=>{const store=new Store(':memory:');const provider=new SandboxProvider(store);return{store,provider,engine:new Engine(store,provider)};};
const task=(e,overrides={})=>e.createTask({title:'Research suppliers',budgetZec:'0.001',approvalZec:'0.0003',services:['document-extract','supplier-compare','report-export'],...overrides});
const request=(e,t,key='request_0001',overrides={})=>e.request(t.id,{serviceId:'document-extract',reason:'Extract quote details.',input:{text:'Quote $42'},idempotencyKey:key,...overrides});

test('amounts are exact integer zatoshis; exponent, negative and excessive precision fail',()=>{
  assert.equal(zats('0.00000001'),1);assert.equal(zec(zats('1.23456789')),'1.23456789');
  for(const v of ['1e-8','-1','0','1.123456789','01','Infinity',1])assert.throws(()=>zats(v));
});
test('a pending approval reserves the full amount and fee; approving does not pay',()=>{
  const{engine:e,store}=setup();const t=task(e);const p=request(e,t,'request_0001',{serviceId:'report-export',input:{title:'Report',findings:'Facts'}});
  assert.equal(p.status,'awaiting_approval');assert.equal(e.totals(t.id).reservedZat,46000);
  e.decide(p.id,true);assert.equal(e.requirePurchase(p.id).status,'ready');assert.equal(store.payment(p.id),undefined);
});
test('cannot pay before approval and cannot approve a purchase twice',async()=>{
  const{engine:e}=setup();const t=task(e);const p=request(e,t,'request_0001',{serviceId:'report-export',input:{title:'R',findings:'F'}});
  await assert.rejects(e.execute(p.id),/approval/);e.decide(p.id,true);assert.throws(()=>e.decide(p.id,true));
});
test('budget includes reserved purchases and fees, preventing overspend',()=>{
  const{engine:e}=setup();const t=task(e,{budgetZec:'0.0002',approvalZec:'0.0002'});
  assert.equal(request(e,t).status,'ready');assert.equal(request(e,t,'request_0002').status,'blocked');assert.equal(e.totals(t.id).reservedZat,13000);
});
test('service allowlist is a hard boundary',()=>{
  const{engine:e}=setup();const t=task(e,{services:['supplier-compare']});const p=request(e,t);
  assert.equal(p.status,'blocked');assert.throws(()=>e.decide(p.id,true));assert.equal(e.totals(t.id).reservedZat,0);
});
test('idempotent requests match semantic JSON and reject changed purchase input',()=>{
  const{engine:e}=setup();const t=task(e);const p=request(e,t);assert.equal(request(e,t).id,p.id);
  assert.throws(()=>request(e,t,'request_0001',{input:{text:'Different'}}),/different purchase/);assert.equal(e.view(t.id).purchases.length,1);
});
test('response loss recovers the same payment and result, with no second payment',async()=>{
  const{engine:e,store}=setup();const t=task(e);const p=request(e,t,'request_0001',{simulateResponseLoss:true});
  const uncertain=await e.execute(p.id);assert.equal(uncertain.status,'uncertain');assert.equal(e.totals(t.id).reservedZat,13000);
  await e.execute(p.id);const payment=store.payment(p.id);const recovered=await e.recover(p.id);
  assert.equal(recovered.status,'delivered');assert.equal(recovered.txid,payment.txid);assert.equal(recovered.result.wordCount,2);
  assert.equal(store.db.prepare('SELECT count(*) n FROM sandbox_payments').get().n,1);
  assert.deepEqual(e.totals(t.id),{spentZat:13000,reservedZat:0,availableZat:87000});
  assert.equal((await e.recover(p.id)).txid,payment.txid);
});
test('concurrent execution claims the signer once, including across engines',async()=>{
  const{store,engine:e,provider}=setup();let calls=0,release;
  const original=provider.pay.bind(provider);provider.pay=async p=>{calls++;await new Promise(r=>release=r);return original(p);};
  const t=task(e),p=request(e,t);const first=e.execute(p.id);const other=new Engine(store,provider);
  assert.equal((await other.execute(p.id)).status,'executing');assert.equal(calls,1);release();await first;assert.equal(calls,1);
});
test('restart preserves reservations and marks interrupted signing uncertain',()=>{
  const dir=mkdtempSync(join(tmpdir(),'zender-'));const file=join(dir,'db.sqlite');let store=new Store(file),e=new Engine(store,new SandboxProvider(store));
  const t=task(e),p=request(e,t);p.status='executing';store.putPurchase(p);store.close();
  store=new Store(file);e=new Engine(store,new SandboxProvider(store));e.recoverInterrupted();
  assert.equal(e.requirePurchase(p.id).status,'uncertain');assert.equal(e.totals(t.id).reservedZat,13000);store.close();rmSync(dir,{recursive:true});
});
test('closing revokes credentials, cancels unstarted requests, but preserves uncertain liability',async()=>{
  const{engine:e}=setup();const t=task(e);const credential=e.issueCredential(t.id);assert.equal(e.authenticateAgent(credential.token),t.id);
  const p=request(e,t,'request_0001',{simulateResponseLoss:true});await e.execute(p.id);const ready=request(e,t,'request_0002');
  e.closeTask(t.id);assert.throws(()=>e.authenticateAgent(credential.token));assert.equal(e.requirePurchase(ready.id).status,'cancelled');
  assert.equal(e.totals(t.id).reservedZat,13000);assert.throws(()=>request(e,t,'request_0003'),/closed/);
  assert.equal((await e.recover(p.id)).status,'delivered');
});
test('expiry prevents approvals and new payment execution',async()=>{
  const{engine:e,store}=setup();const t=task(e),p=request(e,t);const raw=e.requireTask(t.id);raw.expiresAt=new Date(0).toISOString();store.putTask(raw);
  assert.throws(()=>request(e,t,'request_0002'),/expired/);await assert.rejects(e.execute(p.id),/expired/);
});
test('redacted exports omit identifiers, inputs and results',async()=>{
  const{engine:e}=setup();const t=task(e),p=request(e,t);await e.execute(p.id);
  const receipt=e.receipt(t.id);const item=receipt.purchases[0];assert.equal(item.status,'delivered');
  for(const key of ['input','result','recipient','txid','reason'])assert.equal(Object.hasOwn(item,key),false);
  assert.equal(e.receipt(t.id,{details:true}).purchases[0].result.wordCount,2);
});

test('shielded payments require approval and reserve the exact amount and fee',async()=>{
 const{engine:e}=setup(),address='utest10t56q4744d9ygg4l7uku7wzgp4kqhxpdajuf8vrgqn7pj6rpecpjfg3f56z95vkvc79tm3kqem0mx27dwp9arkkft56v9duyluqdw5az';const t=task(e,{services:['shielded-payment'],budgetZec:'0.001',approvalZec:'0.001'});
 const p=request(e,t,'direct_pay_01',{serviceId:'shielded-payment',input:{recipient:address,amountZec:'0.0001'}});
 assert.equal(p.status,'awaiting_approval');assert.equal(p.recipient,address);assert.equal(p.amountZat,10000);assert.equal(e.totals(t.id).reservedZat,11000);
 await assert.rejects(e.execute(p.id),/approval/);e.decide(p.id,true);const complete=await e.execute(p.id);assert.equal(complete.status,'delivered');assert.equal(complete.simulation,true);assert.equal(complete.result.status,'simulated');assert.equal(complete.result.recipient,address);
 assert.throws(()=>request(e,t,'direct_pay_02',{serviceId:'shielded-payment',input:{recipient:'not-an-address',amountZec:'0.1'}}),/address/);
 assert.throws(()=>request(e,t,'direct_pay_03',{serviceId:'shielded-payment',input:{recipient:address,amountZec:'1e-4'}}),/amount/);
});
