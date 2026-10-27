import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeEffects } from '../lib/pczt-provider.mjs';

test('fixed transaction authorization rejects fee drift, changed recipients and extra payments',()=>{
  const p={recipient:'utest1merchant',amountZat:25000,feeZat:20000};
  const effects={txid:'a'.repeat(64),feeZat:10000,outputs:[{pool:'ironwood',address:p.recipient,valueZat:25000,change:false},{pool:'ironwood',address:null,valueZat:50000,change:true}]};
  assert.equal(authorizeEffects(effects,p).feeZat,10000);
  assert.throws(()=>authorizeEffects({...effects,feeZat:20001},p),/fee/);
  assert.throws(()=>authorizeEffects({...effects,outputs:[{pool:'ironwood',address:'utest1other',valueZat:25000,change:false}]},p),/recipient/);
  assert.throws(()=>authorizeEffects({...effects,outputs:[...effects.outputs,{pool:'ironwood',address:'utest1other',valueZat:1,change:false}]},p),/unauthorized/);
  assert.throws(()=>authorizeEffects({...effects,outputs:[{...effects.outputs[0],pool:'transparent'}]},p),/shielded/);
});

import { FixedPcztProvider } from '../lib/pczt-provider.mjs';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function signerFixture({drift=false,sendFailure=false}={}){
  const dir=mkdtempSync(join(tmpdir(),'zender-pczt-')),calls=[];
  const txid='b'.repeat(64),p={id:'purchase-test',recipient:'utest1merchant',amountZat:25000,feeZat:20000};
  let inspections=0;
  const runner=async(binary,args)=>{
    calls.push(binary==='inspector'?'inspect':args[0]==='wallet'?'sync':args[3]);
    if(binary==='inspector')return{stdout:JSON.stringify({txid:drift&&++inspections===2?'c'.repeat(64):txid,feeZat:10000,outputs:[{pool:'orchard',address:p.recipient,valueZat:25000,change:false}]})};
    const action=args[3];
    if(['create','sign','prove'].includes(action))writeFileSync(args[args.indexOf('--output')+1],action);
    if(action==='send'&&sendFailure)throw new Error('response lost');
    return{stdout:action==='send'?txid:''};
  };
  const provider=new FixedPcztProvider({dataDir:dir,binary:'wallet',inspector:'inspector',runner});provider.ready=true;
  return{provider,p,calls,txid,cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}
test('persists exact transaction identity before signing and sends only after final inspection',async()=>{
  const f=signerFixture();try{
    const result=await f.provider.pay(f.p,async prepared=>{f.calls.push('persist');assert.equal(prepared.txid,f.txid);assert.equal(prepared.pcztHash.length,64);});
    assert.deepEqual(f.calls,['sync','create','inspect','persist','sign','prove','inspect','persist','send']);
    assert.equal(result.confirmed,false);assert.equal(result.simulation,false);
  }finally{f.cleanup();}
});
test('a changed signed transaction is rejected before broadcast',async()=>{
  const f=signerFixture({drift:true});try{
    await assert.rejects(f.provider.pay(f.p,async()=>{}),e=>e.definitelyNotSent&&/differs/.test(e.message));
    assert.equal(f.calls.includes('send'),false);
  }finally{f.cleanup();}
});
test('submission response loss is uncertain rather than safe to pay again',async()=>{
  const f=signerFixture({sendFailure:true});try{
    await assert.rejects(f.provider.pay(f.p,async()=>{}),e=>!e.definitelyNotSent&&/response lost/.test(e.message));
    assert.equal(f.calls.filter(x=>x==='send').length,1);
  }finally{f.cleanup();}
});
