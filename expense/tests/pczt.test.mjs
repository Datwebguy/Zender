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
