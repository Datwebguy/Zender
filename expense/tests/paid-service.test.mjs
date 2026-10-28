import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceUrl, publicIpv4, paymentRequirement, paymentSignature } from '../lib/paid-service.mjs';
import { directPayment } from '../lib/providers.mjs';
const address='utest10t56q4744d9ygg4l7uku7wzgp4kqhxpdajuf8vrgqn7pj6rpecpjfg3f56z95vkvc79tm3kqem0mx27dwp9arkkft56v9duyluqdw5az';
const accepted={scheme:'exact',network:'zcash:testnet',asset:'ZEC',amount:'12000',payTo:address,maxTimeoutSeconds:120,extra:{}};
const response=challenge=>({status:402,headers:{'payment-required':Buffer.from(JSON.stringify(challenge)).toString('base64')},body:''});
const challenge=()=>({x402Version:2,validUntil:new Date(Date.now()+60000).toISOString(),accepts:[accepted]});
test('service access rejects local, credentialed and non-HTTPS destinations',()=>{
 for(const url of ['http://example.com/','https://127.0.0.1/','https://localhost/','https://user:pass@example.com/','https://example.com:8443/','https://example.com/#secret'])assert.throws(()=>resourceUrl(url));
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','192.0.2.1','224.0.0.1','::1'])assert.equal(publicIpv4(ip),false);
 assert.equal(resourceUrl('https://example.com/api'),'https://example.com/api');assert.equal(publicIpv4('8.8.8.8'),true);
});
test('x402 challenge and proof bind recipient, network, amount and confirmed transaction',()=>{
 const offer=paymentRequirement(response(challenge()),'testnet');assert.equal(offer.amountZat,12000);assert.equal(offer.recipient,address);assert.equal(offer.amountZec,'0.00012000');
 const payment={serviceId:'shielded-payment',status:'delivered',simulation:false,txid:'a'.repeat(64),recipient:address,amountZat:12000};
 const proof=JSON.parse(Buffer.from(paymentSignature(payment,offer),'base64').toString());assert.equal(proof.payload.txid,payment.txid);assert.deepEqual(proof.accepted,accepted);
 assert.throws(()=>paymentSignature({...payment,status:'broadcast'},offer),/confirmed/);assert.throws(()=>paymentSignature({...payment,simulation:true},offer),/confirmed/);assert.throws(()=>paymentSignature({...payment,amountZat:12001},offer),/terms changed/);
 assert.throws(()=>paymentRequirement(response({...challenge(),validUntil:'2000-01-01T00:00:00Z'}),'testnet'),/expired/);
 assert.throws(()=>paymentRequirement(response({...challenge(),accepts:[{...accepted,network:'zcash:mainnet'}]}),'testnet'),/active network/);
 assert.throws(()=>paymentRequirement(response({...challenge(),accepts:[{...accepted,amount:'-1'}]}),'testnet'),/amount/);
 assert.throws(()=>paymentRequirement(response({...challenge(),accepts:[accepted,accepted]}),'testnet'),/one ZEC/);
 const input={recipient:address,amountZec:offer.amountZec,resourceUrl:'https://example.com/api'};assert.equal(directPayment(input,'testnet').priceZat,12000);
 assert.throws(()=>directPayment({...input,resourceUrl:'http://localhost/'},'testnet'),/public HTTPS/);
});

test('an agent can request, pay and collect a service without sending twice',async()=>{
 const {Store}=await import('../lib/store.mjs');const {Engine}=await import('../lib/engine.mjs');const {SandboxProvider}=await import('../lib/providers.mjs');const {paidServiceWorkflow}=await import('../lib/paid-service-workflow.mjs');
 const store=new Store(':memory:');const provider=new SandboxProvider(store);provider.mode='testnet';let sends=0,changed=false,delivered=0;
 provider.pay=async p=>{sends++;return {txid:'a'.repeat(64),amountZat:p.amountZat,feeZat:1000,confirmed:true,simulation:false,result:{status:'confirmed'}};};
 const engine=new Engine(store,provider),task=engine.createTask({title:'Research',budgetZec:'0.001',approvalZec:'0.001',services:['shielded-payment'],allowedRecipients:[address]});
 const client=async(path,opts={})=>{if(path===`/api/tasks/${task.id}`)return engine.view(task.id);if(path===`/api/tasks/${task.id}/purchases`)return engine.request(task.id,opts.body);if(path.startsWith('/api/purchases/'))return engine.requirePurchase(path.split('/').pop());throw new Error('Unexpected request');};
 const fetcher=async(_url,opts={})=>{if(opts.paymentSignature){const proof=JSON.parse(Buffer.from(opts.paymentSignature,'base64').toString());assert.equal(proof.payload.txid,'a'.repeat(64));delivered++;return {status:200,headers:{'content-type':'application/json'},body:'{"result":"delivered"}'};}return response({...challenge(),accepts:[{...accepted,amount:changed?'12001':'12000'}]});};
 const workflow=paidServiceWorkflow(client,fetcher);
 try{
  const request=await workflow.request({taskId:task.id,url:'https://example.com/api',reason:'Get the service result',idempotencyKey:'service_request_1'});assert.equal(request.purchase.status,'ready');assert.equal(request.purchase.input.resourceUrl,'https://example.com/api');
  await assert.rejects(workflow.collect({purchaseId:request.purchase.id}),/confirmed/);
  assert.equal((await engine.execute(request.purchase.id)).status,'delivered');changed=true;await assert.rejects(workflow.collect({purchaseId:request.purchase.id}),/terms changed/);assert.equal(delivered,0);
  changed=false;const result=await workflow.collect({purchaseId:request.purchase.id});assert.equal(result.status,'delivered');assert.equal(result.content,'{"result":"delivered"}');assert.equal(sends,1);
 }finally{store.close();}
});

test('service fetch refuses private DNS results and pins a public address',async()=>{
 const {fetchService}=await import('../lib/paid-service.mjs');const {EventEmitter}=await import('node:events');const {Readable}=await import('node:stream');let contacted=false;
 const blockedRequest=()=>{contacted=true;throw new Error('must not connect');};
 await assert.rejects(fetchService('https://service.example/path',{resolveHost:async()=>[{address:'127.0.0.1',family:4}],requestFn:blockedRequest}),/not public/);assert.equal(contacted,false);
 await assert.rejects(fetchService('https://service.example/path',{resolveHost:async()=>[{address:'8.8.8.8',family:4},{address:'10.1.2.3',family:4}],requestFn:blockedRequest}),/not public/);assert.equal(contacted,false);
 let pinned;
 const mockRequest=(url,options,callback)=>{assert.equal(url.hostname,'service.example');assert.equal(options.headers['payment-signature'],'proof');options.lookup('service.example',{},(error,address,family)=>{assert.ifError(error);pinned={address,family};});const req=new EventEmitter();req.setTimeout=()=>req;req.end=()=>{const res=Readable.from([Buffer.from('service response')]);res.statusCode=200;res.headers={'content-type':'text/plain'};callback(res);};return req;};
 const result=await fetchService('https://service.example/path',{paymentSignature:'proof',resolveHost:async()=>[{address:'8.8.8.8',family:4}],requestFn:mockRequest});assert.deepEqual(pinned,{address:'8.8.8.8',family:4});assert.equal(result.status,200);assert.equal(result.body,'service response');
});
