import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../lib/store.mjs';
import {SandboxProvider} from '../lib/providers.mjs';
import {createApp} from '../server.mjs';
function wallet(){const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'secp256k1'});const jwk=publicKey.export({format:'jwk'});return {privateKey,pubkey:'04'+Buffer.from(jwk.x,'base64url').toString('hex')+Buffer.from(jwk.y,'base64url').toString('hex')};}
function signed(w,c){const prefix=Buffer.from('Zcash Signed Message:\n'),msg=Buffer.from(c.message);const size=n=>n<253?Buffer.from([n]):Buffer.from([253,n&255,n>>8]);const hash=createHash('sha256').update(Buffer.concat([size(prefix.length),prefix,size(msg.length),msg])).digest();return {nonce:c.nonce,pubkey:w.pubkey,signature:'1b'+sign('sha256',hash,{key:w.privateKey,dsaEncoding:'ieee-p1363'}).toString('hex')};}
test('wallet binding preserves existing account and requires the bound wallet for sign-in',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zender-auth-')),owner='owner_123456789012345678901234567890',store=new Store(':memory:');
 const {server,handler}=createApp({store,provider:new SandboxProvider(store),ownerToken:owner,passwordFile:join(dir,'password.json')});
 async function call(path,body={},cookie,method='POST'){const req=Readable.from(method==='GET'?[]:[Buffer.from(JSON.stringify(body))]);req.method=method;req.url=path;req.socket={remoteAddress:'127.0.0.1'};req.headers={host:'localhost:4310','content-type':'application/json',...(cookie?{cookie}:{})};const h={};let status=200,data;await handler(req,{setHeader:(k,v)=>h[k.toLowerCase()]=v,writeHead:s=>status=s,end:v=>data=JSON.parse(v)});return {status,data,cookie:h['set-cookie']?.split(';')[0]};}
 try{
 const alice=wallet(),mallory=wallet();assert.equal((await call('/api/wallet-auth/bind-challenge')).status,401);
 const old=await call('/api/session',{token:owner});assert.equal(old.status,200);
 const challenge=await call('/api/wallet-auth/bind-challenge',{},old.cookie);assert.equal(challenge.status,200);
 const proof=signed(alice,challenge.data);assert.equal((await call('/api/wallet-auth/bind',proof,old.cookie)).status,200);
 assert.equal((await call('/api/session',{token:owner})).status,401);
 let c=await call('/api/wallet-auth/challenge');let wrong=signed(mallory,c.data);assert.equal((await call('/api/wallet-auth/session',wrong)).status,401);
 c=await call('/api/wallet-auth/challenge');const good=signed(alice,c.data);const logged=await call('/api/wallet-auth/session',good);assert.equal(logged.status,200);assert.ok(logged.cookie);
 assert.equal((await call('/api/wallet-auth/session',good)).status,401);
 c=await call('/api/wallet-auth/challenge');const tampered=signed(alice,c.data);tampered.signature='1b'+'00'.repeat(64);assert.equal((await call('/api/wallet-auth/session',tampered)).status,401);
 assert.equal((await call('/api/wallet-auth/bind-challenge',{},logged.cookie)).status,403);
 assert.equal((await call('/api/workspace',{},logged.cookie,'GET')).status,200);
 }finally{server.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
