import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ZipherProvider } from '../lib/providers.mjs';

test('wallet adapter checks command arguments and proposal fields; signing stays disabled',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'zender-wallet-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const runner=async(binary,args)=>{
    assert.equal(binary,'wallet-fixture');assert.ok(args.includes('--testnet'));assert.ok(args.includes('--data-dir'));assert.ok(args.includes('--server'));assert.ok(args.includes('propose'));assert.ok(!args.includes('confirm'));
    return {stdout:JSON.stringify({ok:true,data:{address:'utest1fixture',send_amount:12000,fee:1000,total:13000},error:null})};
  };
  const p=new ZipherProvider({binary:'wallet-fixture',dataDir:dir,server:'https://test.example',runner});
  const purchase={id:'purchase-test',recipient:'utest1fixture',amountZat:12000,feeZat:1000};
  const proposal=await p.prepare(purchase);assert.equal(proposal.totalZat,13000);assert.equal(proposal.broadcastEnabled,false);
  await assert.rejects(p.prepare({...purchase,feeZat:999}),/fee reserve/);
  await assert.rejects(p.prepare({...purchase,recipient:'utest1other'}),/differs/);
  await assert.rejects(p.pay(purchase),e=>e.definitelyNotSent===true&&e.message.includes('disabled'));
});
