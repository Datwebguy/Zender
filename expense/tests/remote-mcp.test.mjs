import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Store } from '../lib/store.mjs';
import { SandboxProvider } from '../lib/providers.mjs';
import { createApp } from '../server.mjs';
const address='utest10t56q4744d9ygg4l7uku7wzgp4kqhxpdajuf8vrgqn7pj6rpecpjfg3f56z95vkvc79tm3kqem0mx27dwp9arkkft56v9duyluqdw5az';
test('remote MCP enforces task scope and uses the normal approval and payment engine',async()=>{
 const store=new Store(':memory:'),provider=new SandboxProvider(store),owner='owner_123456789012345678901234567890';const {server,engine}=createApp({store,provider,ownerToken:owner});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 const task=engine.createTask({title:'Remote agent',budgetZec:'0.001',approvalZec:'0.001',services:['shielded-payment'],expiresInHours:1}),other=engine.createTask({title:'Other task',budgetZec:'0.001',approvalZec:'0.001',services:['shielded-payment'],expiresInHours:1}),token=engine.issueCredential(task.id).token;
 const post=async(body,credential)=>fetch(base+'/api/mcp',{method:'POST',headers:{'content-type':'application/json',...(credential?{authorization:'Bearer '+credential}:{})},body:JSON.stringify(body)});
 const call=(name,args,id=1)=>({jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args}});
 try{
  assert.equal((await post({jsonrpc:'2.0',id:1,method:'ping'})).status,401);assert.equal((await post({jsonrpc:'2.0',id:1,method:'ping'},owner)).status,403);
  const unsupported=await fetch(base+'/api/mcp',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token,'mcp-protocol-version':'2099-01-01'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'ping'})});assert.equal(unsupported.status,400);
  const init=await (await post({jsonrpc:'2.0',id:2,method:'initialize',params:{protocolVersion:'2025-06-18'}},token)).json();assert.equal(init.result.protocolVersion,'2025-06-18');
  assert.equal((await post({jsonrpc:'2.0',method:'notifications/initialized'},token)).status,202);
  const ctx=await (await post(call('zender_task_context',{}),token)).json();assert.equal(JSON.parse(ctx.result.content[0].text).task.id,task.id);
  const denied=await (await post(call('zender_task',{taskId:other.id}),token)).json();assert.equal(denied.result.isError,true);
  const requested=await (await post(call('zender_request_purchase',{taskId:task.id,serviceId:'shielded-payment',reason:'Pay the approved invoice',idempotencyKey:'remote_test_1',input:{recipient:address,amountZec:'0.0001'}}),token)).json();const payment=JSON.parse(requested.result.content[0].text);assert.equal(payment.status,'awaiting_approval');
  const tooSoon=await (await post(call('zender_execute_purchase',{purchaseId:payment.id}),token)).json();assert.equal(tooSoon.result.isError,true);engine.decide(payment.id,true);
  const paid=await (await post(call('zender_execute_purchase',{purchaseId:payment.id}),token)).json();assert.equal(JSON.parse(paid.result.content[0].text).status,'delivered');
  const forbidden=await (await post(call('approve_purchase',{purchaseId:payment.id}),token)).json();assert.equal(forbidden.error.code,-32602);
  engine.closeTask(task.id);assert.equal((await post({jsonrpc:'2.0',id:8,method:'ping'},token)).status,401);
 }finally{server.close();store.close();}
});
