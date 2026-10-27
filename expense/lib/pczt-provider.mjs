import { execFile } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { CATALOG, resultFor } from './providers.mjs';
const exec=(binary,args,options)=>new Promise((resolve,reject)=>{
  const child=execFile(binary,args,options,(error,stdout,stderr)=>error?reject(error):resolve({stdout,stderr}));
  child.stdin?.end();
});
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const unsent=message=>Object.assign(new Error(message),{definitelyNotSent:true});

export function authorizeEffects(effects,purchase){
  if(!/^[a-f0-9]{64}$/.test(effects.txid)||!Number.isSafeInteger(effects.feeZat)||effects.feeZat<0||effects.feeZat>purchase.feeZat)throw unsent('Transaction fee or identity does not match this authorization.');
  if(!Array.isArray(effects.outputs))throw unsent('Transaction outputs are unavailable.');
  if(effects.outputs.some(o=>!Number.isSafeInteger(o.valueZat)||o.valueZat<0||!['transparent','sapling','orchard','ironwood'].includes(o.pool)))throw unsent('Invalid transaction output.');
  const positive=effects.outputs.filter(o=>o.valueZat>0);
  if(positive.some(o=>!Number.isSafeInteger(o.valueZat)||o.valueZat<0||o.pool==='transparent'))throw unsent('Only shielded outputs are authorized.');
  const payments=positive.filter(o=>o.address===purchase.recipient);
  if(payments.length!==1||payments[0].valueZat!==purchase.amountZat)throw unsent('The transaction recipient or amount differs from the approved purchase.');
  if(positive.some(o=>o.address!==purchase.recipient&&!o.change))throw unsent('The transaction contains an unauthorized output.');
  return effects;
}

export class FixedPcztProvider {
  constructor({dataDir,binary='zcash-devtool',inspector='zender-inspect',server='zecrocks',runner=exec}){
    this.mode='testnet';this.name='Zcash testnet';this.broadcastEnabled=true;this.ready=false;
    this.dataDir=resolve(dataDir);this.binary=binary;this.inspector=inspector;this.server=server;this.runner=runner;this.queue=Promise.resolve();
    this.sender=join(this.dataDir,'payer');this.receiver=join(this.dataDir,'merchant');this.identity=join(this.sender,'identity.txt');
    this.services=CATALOG.map(s=>({...s,feeZat:20000}));
    mkdirSync(this.dataDir,{recursive:true,mode:0o700});chmodSync(this.dataDir,0o700);
  }
  async run(args,{binary=this.binary,timeout=300000}={}){
    const r=await this.runner(binary,args,{timeout,maxBuffer:4*1024*1024});return r.stdout;
  }
  async serial(fn){const previous=this.queue;let release;this.queue=new Promise(r=>release=r);await previous;try{return await fn();}finally{release();}}
  async initialize(){
    return this.serial(async()=>{
      for(const [dir,name]of[[this.sender,'Zender agent'],[this.receiver,'Zender services']]){
        mkdirSync(dir,{recursive:true,mode:0o700});
        if(!existsSync(join(dir,'keys.toml')))await this.run(['wallet','-w',dir,'init','--name',name,'--identity',join(dir,'identity.txt'),'--network','test','--server',this.server]);
        chmodSync(join(dir,'identity.txt'),0o600);
      }
      const addresses=await this.run(['wallet','-w',this.receiver,'list-addresses','--receiver','orchard']);
      this.recipient=addresses.match(/utest1[0-9a-z]{60,}/)?.[0];
      if(!this.recipient)throw new Error('The receiving wallet did not expose a testnet Unified Address.');
      this.services=this.services.map(s=>({...s,recipient:this.recipient}));this.ready=true;
      return {ready:true,mode:this.mode};
    });
  }
  quote(id,input){
    if(!this.ready)throw new Error('The testnet wallets are starting. Try again shortly.');
    const service=this.services.find(s=>s.id===id);if(!service)throw new Error('Unknown service.');
    // Validate the tool input now; compute the delivered output only after receipt verification.
    resultFor(id,input);
    return {...service,result:null};
  }
  async inspect(path){return JSON.parse(await this.run([path],{binary:this.inspector,timeout:30000}));}
  async pay(p,onPrepared){
    return this.serial(async()=>{
      if(!this.ready)throw unsent('The testnet wallet is not ready.');
      const dir=join(this.dataDir,'purchases',p.id);mkdirSync(dir,{recursive:true,mode:0o700});
      const created=join(dir,'created.pczt'),signed=join(dir,'signed.pczt'),proven=join(dir,'proven.pczt');
      let sent=false;
      try{
        await this.run(['wallet','-w',this.sender,'sync','--server',this.server]);
        await this.run(['pczt','-w',this.sender,'create','--address',p.recipient,'--value',String(p.amountZat),'--memo',`Zender ${p.id}`,'--target-note-count','1','--output',created]);
        const approved=authorizeEffects(await this.inspect(created),p),createdHash=hash(created);
        // Persist the deterministic transaction ID before signing or network submission.
        await onPrepared({txid:approved.txid,feeZat:approved.feeZat,pcztHash:createdHash});
        if(hash(created)!==createdHash)throw unsent('The prepared transaction changed before signing.');
        await this.run(['pczt','-w',this.sender,'sign','--identity',this.identity,created,'--output',signed]);
        await this.run(['pczt','-w',this.sender,'prove',signed,'--output',proven],{timeout:600000});
        const final=authorizeEffects(await this.inspect(proven),p);
        if(final.txid!==approved.txid||final.feeZat!==approved.feeZat)throw unsent('The signed transaction differs from its authorization.');
        await onPrepared({txid:approved.txid,feeZat:approved.feeZat,pcztHash:createdHash});
        sent=true;
        const output=await this.run(['pczt','-w',this.sender,'send',proven,'--server',this.server]);
        if(!output.includes(approved.txid))throw new Error('Transaction submission needs reconciliation.');
        return {txid:approved.txid,amountZat:p.amountZat,feeZat:approved.feeZat,confirmed:false,simulation:false};
      }catch(error){if(!sent)error.definitelyNotSent=true;throw error;}
    });
  }
  async recover(p){
    return this.serial(async()=>{
      if(!p.txid)return null;
      await this.run(['wallet','-w',this.receiver,'sync','--server',this.server]);
      const txs=JSON.parse(await this.run(['wallet','-w',this.receiver,'list-tx','--json']));
      const tx=txs.find(t=>t.txid===p.txid&&t.mined_height>0);
      if(!tx)return null;
      const outputs=(tx.outputs||[]).filter(o=>o.incoming&&!o.change&&o.valueZat===p.amountZat&&o.memo===`Zender ${p.id}`&&!String(o.pool).includes('Transparent'));
      if(outputs.length!==1)throw new Error('The receiving wallet did not verify the expected shielded amount and purchase memo.');
      const output=outputs[0];if(output.address&&output.address!==p.recipient)throw new Error('Receiving address differs from this purchase.');
      return {txid:p.txid,amountZat:p.amountZat,feeZat:p.actualFeeZat,confirmed:true,simulation:false,result:resultFor(p.serviceId,p.input),evidence:{network:'testnet',height:tx.mined_height,pool:output.pool,amountZat:output.valueZat,memo:output.memo,verifiedBy:'separate receiving wallet'}};
    });
  }
  async status(){
    if(!this.ready)return{ready:false,mode:'testnet',error:this.startupError||null};
    return this.serial(async()=>{
    await this.run(['wallet','-w',this.sender,'sync','--server',this.server]);
    const balance=JSON.parse(await this.run(['wallet','-w',this.sender,'balance','--json']));
    const addresses=await this.run(['wallet','-w',this.sender,'list-addresses','--receiver','orchard']);
    return {ready:true,mode:'testnet',balance,address:addresses.match(/utest1[0-9a-z]{60,}/)?.[0]||null};
    });
  }
  async fund(){
    if(!this.ready)throw new Error('Wallet initialization is still in progress.');
    const path=join(this.dataDir,'faucet-claim.json');
    if(existsSync(path)){
      const claim=JSON.parse(readFileSync(path,'utf8'));
      if(claim.id){
        const response=await fetch(`https://faucet.testnet.valargroup.dev/api/claim/${encodeURIComponent(claim.id)}`,{signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('The testnet faucet status is unavailable.');
        const current=await response.json();
        Object.assign(claim,{status:current.status,message:current.message||null,txid:current.txid||null});
        writeFileSync(path,JSON.stringify(claim),{mode:0o600});
      }
      return claim;
    }
    const addresses=await this.run(['wallet','-w',this.sender,'list-addresses','--receiver','orchard']);
    const address=addresses.match(/utest1[0-9a-z]{60,}/)?.[0];if(!address)throw new Error('No testnet funding address is available.');
    const response=await fetch('https://faucet.testnet.valargroup.dev/api/claim',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address}),signal:AbortSignal.timeout(30000)});
    const body=await response.json();if(!response.ok)throw new Error(body.error||'The testnet faucet is unavailable or rate-limited.');
    const claim={id:body.id,status:body.status,address,requestedAt:new Date().toISOString(),network:'testnet'};
    writeFileSync(path,JSON.stringify(claim),{mode:0o600});return claim;
  }
}
