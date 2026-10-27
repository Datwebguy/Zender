import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { Store } from '../lib/store.mjs';
import { SandboxProvider } from '../lib/providers.mjs';
import { createApp } from '../server.mjs';
import { runCli } from '../bin/zender.mjs';
import { handleRequest } from '../bin/mcp.mjs';

test('CLI and MCP complete the shared purchase, approval and recovery flow',async t=>{
  const owner='test_owner_123456789012345678901234567890';
  const store=new Store(':memory:');const{handler,server}=createApp({store,provider:new SandboxProvider(store),ownerToken:owner});
  const previousFetch=globalThis.fetch,previousOwner=process.env.ZENDER_OWNER_TOKEN,previousAgent=process.env.ZENDER_AGENT_TOKEN;
  process.env.ZENDER_OWNER_TOKEN=owner;delete process.env.ZENDER_AGENT_TOKEN;
  t.after(()=>{globalThis.fetch=previousFetch;if(previousOwner===undefined)delete process.env.ZENDER_OWNER_TOKEN;else process.env.ZENDER_OWNER_TOKEN=previousOwner;if(previousAgent===undefined)delete process.env.ZENDER_AGENT_TOKEN;else process.env.ZENDER_AGENT_TOKEN=previousAgent;server.close();store.close();});
  globalThis.fetch=async(url,init={})=>{
    const u=new URL(url),req=Readable.from(init.body?[Buffer.from(init.body)]:[]);
    req.method=init.method||'GET';req.url=u.pathname+u.search;req.socket={remoteAddress:'127.0.0.1'};
    req.headers={host:u.host,...Object.fromEntries(Object.entries(init.headers||{}).map(([k,v])=>[k.toLowerCase(),v]))};
    const headers={};let status=200,payload;
    await handler(req,{setHeader:(k,v)=>headers[k]=v,writeHead:(s,hs)=>{status=s;Object.assign(headers,hs||{});},end:b=>payload=b});
    return new Response(payload,{status,headers});
  };
  const demo=await runCli(['demo']);assert.equal(demo.responseLoss,'uncertain');assert.equal(demo.recovery,'delivered');assert.equal(demo.approvalStatus,'awaiting_approval');
  const issued=await runCli(['task','token',demo.taskId]);assert.ok(issued.token.startsWith('zender_agent_'));process.env.ZENDER_AGENT_TOKEN=issued.token;
  const response=await handleRequest({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'zender_task',arguments:{taskId:demo.taskId}}});
  assert.equal(response.id,1);assert.equal(response.result.isError,undefined);assert.equal(JSON.parse(response.result.content[0].text).id,demo.taskId);
  await assert.rejects(runCli(['purchase','approve',demo.approvalPurchaseId]),/Only the owner/);
  delete process.env.ZENDER_AGENT_TOKEN;
  await runCli(['purchase','approve',demo.approvalPurchaseId]);const paid=await runCli(['purchase','execute',demo.approvalPurchaseId]);assert.equal(paid.status,'delivered');
  const receipt=await runCli(['task','receipt',demo.taskId]);assert.equal(receipt.purchases.length,2);assert.equal(receipt.mode,'sandbox');
  await runCli(['task','close',demo.taskId]);assert.equal((await runCli(['task','inspect',demo.taskId])).status,'closed');
});
test('MCP exposes no owner approval or permission-changing tool',async()=>{
  const initialized=await handleRequest({jsonrpc:'2.0',id:1,method:'initialize',params:{}});assert.equal(initialized.result.serverInfo.name,'zender');
  const response=await handleRequest({jsonrpc:'2.0',id:2,method:'tools/list'});const tools=response.result.tools;
  assert.equal(tools.length,5);assert.ok(tools.every(t=>!/(approve|create_task|close|policy)/.test(t.name)));
  const denied=await handleRequest({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'approve_purchase',arguments:{}}});assert.equal(denied.error.code,-32602);
});
