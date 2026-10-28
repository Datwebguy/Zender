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
    await assert.rejects(f.provider.pay(f.p,async()=>{}),e=>!e.definitelyNotSent&&/response lost/.test(e.cause?.message));
    assert.equal(f.calls.filter(x=>x==='send').length,1);
  }finally{f.cleanup();}
});


test('mainnet and testnet use their own address formats and mainnet has no faucet',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zender-network-'));
 try{
  const main=new FixedPcztProvider({dataDir:join(dir,'mainnet'),network:'mainnet'});
  const testnet=new FixedPcztProvider({dataDir:join(dir,'testnet'),network:'testnet'});
  assert.equal(main.mode,'mainnet');assert.equal(main.confirmations,10);
  assert.equal(main.addressFrom('Receiver(orchard): u1'+'q'.repeat(80)),'u1'+'q'.repeat(80));
  assert.equal(main.addressFrom('utest10t56q4744d9ygg4l7uku7wzgp4kqhxpdajuf8vrgqn7pj6rpecpjfg3f56z95vkvc79tm3kqem0mx27dwp9arkkft56v9duyluqdw5az'),null);
  assert.equal(testnet.addressFrom('u1'+'q'.repeat(80)),null);
  await assert.rejects(main.fund(),/mainnet address/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('wallet errors give actionable messages without process arguments',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zender-errors-'));
 try{
 const provider=new FixedPcztProvider({dataDir:dir,runner:async()=>{throw new Error('Command failed: wallet --identity secret-path: Insufficient balance');}});
 await assert.rejects(provider.run(['wallet']),e=>/Add ZEC/.test(e.message)&&!e.message.includes('secret-path'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('receipt verification checks confirmations and equivalent shielded receivers',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zender-receipt-'));
 let tip=99,matches=true,memo='Zender p';
 const tx={txid:'d'.repeat(64),mined_height:100,outputs:[{incoming:true,change:false,valueZat:25000,pool:'Shielded(Ironwood)',address:'canonical-address'}]};
 const provider=new FixedPcztProvider({dataDir:dir,confirmations:2,inspector:'inspector',runner:async(binary,args)=>{
  if(binary==='inspector')return{stdout:JSON.stringify({matches})};
  if(args.includes('list-tx'))return{stdout:JSON.stringify([{...tx,outputs:tx.outputs.map(o=>({...o,memo}))}])};
  if(args.includes('get-info'))return{stdout:JSON.stringify({chain_name:'test',chain_tip_height:tip})};
  return{stdout:''};
 }});
 const p={id:'p',txid:tx.txid,recipient:'approved-address',amountZat:25000,actualFeeZat:10000,serviceId:'document-extract',input:{text:'Verified receipt'}};
 try{
  assert.equal(await provider.recover(p),null);tip=100;assert.equal(await provider.recover(p),null);
  tip=101;const receipt=await provider.recover(p);assert.equal(receipt.confirmed,true);assert.equal(receipt.evidence.confirmations,2);assert.equal(receipt.result.wordCount,2);
  matches=false;await assert.rejects(provider.recover(p),/Receiving address differs/);
  matches=true;memo='Zender another-purchase';await assert.rejects(provider.recover(p),/purchase memo/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('external shielded payment uses exact network, amount and sender confirmation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zender-direct-'));let height=99;const txid='e'.repeat(64),address='utest10t56q4744d9ygg4l7uku7wzgp4kqhxpdajuf8vrgqn7pj6rpecpjfg3f56z95vkvc79tm3kqem0mx27dwp9arkkft56v9duyluqdw5az';
 const provider=new FixedPcztProvider({dataDir:dir,confirmations:2,runner:async(_binary,args)=>{
  if(args.includes('list-tx'))return {stdout:JSON.stringify([{txid,mined_height:100}])};
  if(args.includes('get-info'))return {stdout:JSON.stringify({chain_name:'test',chain_tip_height:height})};return {stdout:''};
 }});provider.ready=true;
 try{
  const quote=provider.quote('shielded-payment',{recipient:address,amountZec:'0.01'});assert.equal(quote.recipient,address);assert.equal(quote.priceZat,1000000);assert.equal(quote.alwaysApproval,true);
  assert.throws(()=>provider.quote('shielded-payment',{recipient:'u1'+'q'.repeat(80),amountZec:'0.01'}),/current Zcash network/);
  const p={id:'direct-p',txid,recipient:address,amountZat:1000000,actualFeeZat:10000,serviceId:'shielded-payment',input:{recipient:address,amountZec:'0.01'}};
  assert.equal(await provider.recover(p),null);height=100;assert.equal(await provider.recover(p),null);height=101;const confirmed=await provider.recover(p);assert.equal(confirmed.confirmed,true);assert.equal(confirmed.evidence.confirmations,2);assert.equal(confirmed.result.recipient,address);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
