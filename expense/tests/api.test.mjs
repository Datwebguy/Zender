import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../lib/store.mjs';
import { SandboxProvider } from '../lib/providers.mjs';
import { createApp } from '../server.mjs';
import { Readable } from 'node:stream';

test('HTTP journey enforces owner/agent separation, task scopes, and same-origin access',async t=>{
  const store=new Store(':memory:');const{server,handler}=createApp({store,provider:new SandboxProvider(store),ownerToken:'owner_test_key_1234567890123456789012345'});
  t.after(()=>{server.close();store.close();});
  const owner='owner_test_key_1234567890123456789012345';
  async function call(path,token,body,headers={}){
    const req=Readable.from(body?[Buffer.from(JSON.stringify(body))]:[]);
    req.method=body?'POST':'GET';req.url=path;req.socket={remoteAddress:'127.0.0.1'};
    req.headers={host:'127.0.0.1:4310','content-type':'application/json',...(token?{authorization:`Bearer ${token}`} : {}),...headers};
    const values=new Map();let status=200,data;
    const res={setHeader:(k,v)=>values.set(k.toLowerCase(),v),writeHead:(s,hs={})=>{status=s;for(const[k,v]of Object.entries(hs))values.set(k.toLowerCase(),v);},end:value=>{data=value;}};
    await handler(req,res);
    return{status,headers:{get:k=>values.get(k.toLowerCase())},data:JSON.parse(data)};
  }
  assert.equal((await call('/api/workspace')).status,401);
  const login=await call('/api/session',null,{token:owner});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/workspace',null,undefined,{cookie})).status,200);
  const data={title:'Research',budgetZec:'0.001',approvalZec:'0.0001',services:['document-extract']};
  const a=(await call('/api/tasks',owner,data)).data,b=(await call('/api/tasks',owner,{...data,title:'Other'})).data;
  const token=(await call(`/api/tasks/${a.id}/credentials`,owner,{})).data.token;
  assert.equal((await call(`/api/tasks/${b.id}`,token)).status,403);
  assert.equal((await call('/api/tasks',token,data)).status,403);
  const p=(await call(`/api/tasks/${a.id}/purchases`,token,{serviceId:'document-extract',input:{text:'Supplier $42'},reason:'Read quote',idempotencyKey:'api_request_0001'})).data;
  assert.equal(p.status,'awaiting_approval');assert.equal(Object.hasOwn(p,'quoteResult'),false);
  assert.equal((await call(`/api/purchases/${p.id}/approve`,token,{})).status,403);
  assert.equal((await call(`/api/purchases/${p.id}/execute`,token,{})).status,409);
  assert.equal((await call(`/api/purchases/${p.id}/approve`,owner,{})).status,200);
  assert.equal((await call(`/api/purchases/${p.id}/execute`,token,{})).data.status,'delivered');
  assert.equal((await call('/api/tasks',owner,data,{origin:'https://evil.example'})).status,403);
  assert.equal((await call(`/api/tasks/${a.id}/close`,owner,{})).status,200);
  assert.equal((await call(`/api/tasks/${a.id}`,token)).status,401);
});
