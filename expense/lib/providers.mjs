import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
const exec = promisify(execFile);
export const CATALOG = [
  { id:'document-extract', name:'Document extraction', description:'Turn your supplied text into structured facts.', priceZat:12000, feeZat:1000, category:'Documents' },
  { id:'supplier-compare', name:'Supplier comparison', description:'Compare the quotes you supply by delivered cost.', priceZat:25000, feeZat:1000, category:'Research' },
  { id:'report-export', name:'Report export', description:'Package supplied findings into a Markdown report.', priceZat:45000, feeZat:1000, category:'Reports' },
];
function resultFor(service, input) {
  if (service === 'document-extract') {
    const text = String(input.text || '');
    if (!text.trim()) throw new Error('Provide text to extract.');
    return { text, lines:text.split(/\n+/).filter(Boolean), wordCount:text.trim().split(/\s+/).length, amounts:text.match(/(?:\$|USD\s*)\d+(?:\.\d+)?/g) || [] };
  }
  if (service === 'supplier-compare') {
    if (!Array.isArray(input.quotes) || !input.quotes.length || input.quotes.length>30) throw new Error('Provide 1–30 supplier quotes.');
    const quotes=input.quotes.map(q=>{
      if(typeof q.name!=='string'||!Number.isSafeInteger(q.unitCostCents)||q.unitCostCents<0||!Number.isSafeInteger(q.shippingCents)||q.shippingCents<0) throw new Error('Quote prices must be nonnegative integer cents.');
      return {name:q.name,deliveredCostCents:q.unitCostCents+q.shippingCents};
    }).sort((a,b)=>a.deliveredCostCents-b.deliveredCostCents);
    return { recommendation:quotes[0].name, reason:'Lowest delivered cost among the supplied quotes.', quotes, source:'User-supplied quotes; no external market lookup.' };
  }
  if (!input.title || !input.findings) throw new Error('Provide a report title and findings.');
  return { markdown:`# ${String(input.title)}\n\n${String(input.findings)}\n`, filename:'findings.md' };
}
export class SandboxProvider {
  constructor(store) { this.store=store; this.mode='sandbox'; this.name='Local sandbox'; }
  quote(serviceId,input) {
    const s=CATALOG.find(s=>s.id===serviceId); if(!s) throw new Error('Unknown service.');
    const result=resultFor(serviceId,input);
    return {...s,recipient:`sandbox:${serviceId}`,result};
  }
  async pay(p) {
    let payment=this.store.payment(p.id);
    if(!payment) {
      payment={ txid:createHash('sha256').update(`sandbox:${p.id}`).digest('hex'), amountZat:p.amountZat, feeZat:p.feeZat, confirmed:true, result:p.quoteResult, paidAt:new Date().toISOString(), simulation:true };
      this.store.putPayment(p.id,payment);
    }
    if(p.simulateResponseLoss) throw new Error('Sandbox response lost after payment. Recover this purchase; do not pay again.');
    return payment;
  }
  async recover(p) { return this.store.payment(p.id) || null; }
}

// A dedicated testnet wallet must belong to this service process, not the agent.
// No seed phrase is passed through tool arguments or the Zender HTTP API.
export class ZipherProvider {
  constructor({binary='zipher-cli',dataDir,server,services=[],runner=exec}) {
    if(!dataDir || !server) throw new Error('Wallet data directory and testnet server are required.');
    this.mode='testnet'; this.name='Zcash testnet'; this.binary=binary; this.dataDir=resolve(dataDir);this.server=server;this.services=services;this.runner=runner;
    mkdirSync(this.dataDir,{recursive:true,mode:0o700});
  }
  async command(args) {
    const {stdout}=await this.runner(this.binary,['--testnet','--data-dir',this.dataDir,'--server',this.server,...args],{timeout:180000,maxBuffer:2*1024*1024});
    let value;try{value=JSON.parse(stdout);}catch{throw new Error('Wallet returned invalid JSON.');}
    if(value.ok===false || value.success===false || value.error) throw new Error('Wallet operation failed; inspect the local wallet logs.');
    return value.data ?? value.result ?? value;
  }
  quote(serviceId,input) {
    const s=this.services.find(s=>s.id===serviceId);
    if(!s) throw new Error('Service is not configured for Zcash testnet.');
    if(!/^utest1[0-9a-z]+$/.test(s.recipient)||!Number.isSafeInteger(s.priceZat)||!Number.isSafeInteger(s.feeZat)||s.priceZat<=0||s.feeZat<0) throw new Error('Invalid testnet service configuration.');
    const url=new URL(s.resultUrl);if(url.protocol!=='https:')throw new Error('A service result endpoint must use HTTPS.');
    return {...s,result:null};
  }
  async locked(fn) {
    const path=resolve(this.dataDir,'.zender-send.lock');let fd;
    try{fd=openSync(path,'wx',0o600);}catch{throw new Error('Wallet is busy or requires operator recovery.');}
    try{return await fn();}finally{closeSync(fd);unlinkSync(path);}
  }
  async prepare(p) {
    return this.locked(async()=>{
      const q=await this.command(['send','propose','--to',p.recipient,'--amount',String(p.amountZat),'--memo',`Zender ${p.id}`,'--context-id',p.id]);
      if(q.address!==p.recipient||q.send_amount!==p.amountZat||!Number.isSafeInteger(q.fee)||q.fee>p.feeZat) throw new Error('Wallet proposal differs from the authorized purchase or exceeds the fee reserve.');
      return {recipient:q.address,amountZat:q.send_amount,feeZat:q.fee,totalZat:q.send_amount+q.fee,broadcastEnabled:false};
    });
  }
  async pay(p) {
    await this.prepare(p);
    const error=new Error('Live broadcast is disabled: the wallet confirmation command rebuilds its proposal. A signer bound to the approved outputs and fee is required. No payment was sent.');
    error.definitelyNotSent=true;
    throw error;
  }
  async recover(p) {
    // Only use a recorded broadcast. Unknown sends stay reserved for operator reconciliation.
    if(!p.txid) return null;
    await this.command(['sync','start']);
    const txs=await this.command(['transactions','--limit','1000']);
    const tx=Array.isArray(txs)?txs.find(t=>t.txid===p.txid):null;
    if(!tx||!(tx.height>0))return null;
    const service=this.services.find(s=>s.id===p.serviceId);
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(service.resultUrl,{method:'POST',redirect:'error',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({purchaseId:p.id,txid:p.txid,input:p.input})});
      if(!response.ok)throw new Error('Payment confirmed; the service result is not ready. Recover later.');
      const text=await response.text();if(text.length>1000000)throw new Error('Service result exceeds the size limit.');
      const body=JSON.parse(text);if(body.purchaseId!==p.id||body.txid!==p.txid||body.status!=='delivered')throw new Error('Service has not verified and delivered this purchase.');
      return {txid:p.txid,amountZat:p.amountZat,feeZat:p.actualFeeZat,confirmed:true,result:body.result,simulation:false};
    }finally{clearTimeout(timeout);}
  }
}
