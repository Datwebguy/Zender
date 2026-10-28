import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../lib/store.mjs';
import {SandboxProvider} from '../lib/providers.mjs';
import {createApp} from '../server.mjs';

test('owner sets a password, signs in with it, and the bootstrap key is retired',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zender-login-')),passwordFile=join(dir,'password.json');
 const owner='owner_123456789012345678901234567890',store=new Store(':memory:');const {server,handler}=createApp({store,provider:new SandboxProvider(store),ownerToken:owner,passwordFile});
 async function call(path,body,cookie){const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method='POST';req.url=path;req.socket={remoteAddress:'127.0.0.1'};req.headers={host:'localhost:4310','content-type':'application/json',...(cookie?{cookie}:{})};const h={};let status=200,data;await handler(req,{setHeader:(k,v)=>h[k.toLowerCase()]=v,writeHead:(s)=>status=s,end:v=>data=JSON.parse(v)});return {status,data,cookie:h['set-cookie']?.split(';')[0]};}
 try{
  assert.equal((await call('/api/password',{password:'long enough password'})).status,401);
  const session=await call('/api/session',{token:owner});assert.equal(session.status,200);
  assert.equal((await call('/api/password',{password:'long enough password'},session.cookie)).status,200);
  assert.ok(!readFileSync(passwordFile,'utf8').includes('long enough password'));
  assert.equal((await call('/api/session',{token:owner})).status,401);
  assert.equal((await call('/api/session',{password:'incorrect password'})).status,401);
  assert.equal((await call('/api/session',{password:'long enough password'})).status,200);
 }finally{server.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
