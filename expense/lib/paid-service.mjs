import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { isUnifiedAddress } from './address.mjs';
import { zec } from './money.mjs';

const blocked = new BlockList();
for (const [net,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(net,bits,'ipv4');
export function resourceUrl(value){
  if(typeof value!=='string'||value.length>2048)throw new Error('Enter a valid service URL.');
  let u;try{u=new URL(value);}catch{throw new Error('Enter a valid service URL.');}
  if(u.protocol!=='https:'||u.username||u.password||u.hash||(u.port&&u.port!=='443')||!u.hostname.includes('.')||isIP(u.hostname.replace(/^\[|\]$/g,'')))throw new Error('Service URLs must use a public HTTPS domain.');
  return u.href;
}
export function publicIpv4(address){return isIP(address)===4&&!blocked.check(address,'ipv4');}
export async function fetchService(value,{paymentSignature,resolveHost=lookup,requestFn=request}={}){
  const url=new URL(resourceUrl(value));
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Service lookup timed out.')),10000);});
  let addresses;try{addresses=await Promise.race([resolveHost(url.hostname,{all:true,verbatim:true}),timeout]);}finally{clearTimeout(timer);}
  if(!addresses.length||addresses.length>32||addresses.some(a=>a.family===4&&!publicIpv4(a.address))||!addresses.some(a=>a.family===4&&publicIpv4(a.address)))throw new Error('Service address is not public.');
  const target=addresses.find(a=>a.family===4&&publicIpv4(a.address));
  return new Promise((resolve,reject)=>{
    const req=requestFn(url,{method:'GET',family:4,lookup:(_host,_options,cb)=>cb(null,target.address,4),headers:{accept:'application/json, text/plain',...(paymentSignature?{'payment-signature':paymentSignature}:{})}},res=>{
      const chunks=[];let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>262144){req.destroy(new Error('Service response is too large.'));return;}chunks.push(chunk);});
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));res.on('error',reject);
    });req.setTimeout(15000,()=>req.destroy(new Error('Service request timed out.')));req.on('error',reject);req.end();
  });
}
export function paymentRequirement(response,network){
  if(response.status!==402)throw new Error('The service did not request payment.');
  let challenge;try{const header=response.headers?.['payment-required'];challenge=JSON.parse(header?Buffer.from(header,'base64').toString('utf8'):response.body);}catch{throw new Error('The payment request is invalid.');}
  if(challenge?.x402Version!==2||!Array.isArray(challenge.accepts)||challenge.accepts.length>20)throw new Error('The payment request is not supported.');
  if(typeof challenge.validUntil!=='string'||!Number.isFinite(Date.parse(challenge.validUntil))||Date.parse(challenge.validUntil)<=Date.now())throw new Error('The payment request has expired or has no expiry.');
  const offers=challenge.accepts.filter(x=>x&&x.scheme==='exact'&&x.asset==='ZEC'&&x.network==='zcash:'+network);
  if(offers.length!==1)throw new Error('The service must offer one ZEC payment for the active network.');
  const accepted=offers[0],amount=accepted.amount;
  if(typeof amount!=='string'||!/^[1-9]\d{0,15}$/.test(amount)||BigInt(amount)>2100000000000000n)throw new Error('The service payment amount is invalid.');
  if(!isUnifiedAddress(accepted.payTo,network==='mainnet'?'u':'utest'))throw new Error('The service recipient address is invalid.');
  return {accepted,recipient:accepted.payTo,amountZat:Number(amount),amountZec:zec(Number(amount)),validUntil:challenge.validUntil};
}
export function paymentSignature(p,requirement){
  if(!p||p.serviceId!=='shielded-payment'||p.status!=='delivered'||p.simulation||!(/^[a-f0-9]{64}$/i.test(p.txid||'')))throw new Error('A confirmed Zcash payment is required.');
  if(requirement.recipient!==p.recipient||requirement.amountZat!==p.amountZat)throw new Error('The service payment terms changed. Do not pay again.');
  return Buffer.from(JSON.stringify({x402Version:2,payload:{txid:p.txid},accepted:requirement.accepted})).toString('base64');
}
