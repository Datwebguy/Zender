#!/usr/bin/env node
import { api } from './client.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
export async function runCli(args) {
const [group,command,id]=args;
const flag=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1];};
const post=(path,body={})=>api(path,{method:'POST',body});
  let result;
  if(group==='owner-key'){
    if(process.env.ZENDER_AGENT_TOKEN)throw new Error('Owner key access is unavailable in an agent session.');
    const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
    result={ownerKey:readFileSync(resolve(process.env.ZENDER_DATA_DIR||resolve(root,'.zender'),'owner.key'),'utf8').trim()};
  }else if(group==='status')result=await api('/api/workspace');
  else if(group==='task'&&command==='create')result=await post('/api/tasks',{title:flag('title'),budgetZec:flag('budget-zec'),approvalZec:flag('approval-zec'),services:flag('services','').split(',').filter(Boolean),expiresInHours:Number(flag('hours','24'))});
  else if(group==='task'&&command==='inspect')result=await api(`/api/tasks/${id}`);
  else if(group==='task'&&command==='close')result=await post(`/api/tasks/${id}/close`);
  else if(group==='task'&&command==='token')result=await post(`/api/tasks/${id}/credentials`);
  else if(group==='task'&&command==='receipt')result=await api(`/api/tasks/${id}/receipt${args.includes('--details')?'?details=true':''}`);
  else if(group==='purchase'&&command==='request')result=await post(`/api/tasks/${id}/purchases`,{serviceId:flag('service'),reason:flag('reason'),input:JSON.parse(flag('input','{}')),idempotencyKey:flag('key'),simulateResponseLoss:args.includes('--lose-response')});
  else if(group==='purchase'&&['execute','recover','approve','reject'].includes(command))result=await post(`/api/purchases/${id}/${command}`);
  else if(group==='purchase'&&command==='inspect')result=await api(`/api/purchases/${id}`);
  else if(group==='demo'){
    const workspace=await api('/api/workspace');if(workspace.mode!=='sandbox')throw new Error('The walkthrough runs only in sandbox.');
    const task=await post('/api/tasks',{title:'Compare supplier quotes',budgetZec:'0.0012',approvalZec:'0.0003',services:['document-extract','supplier-compare','report-export'],expiresInHours:24});
    const input={quotes:[{name:'North Paper',unitCostCents:4200,shippingCents:800},{name:'Studio Supply',unitCostCents:4500,shippingCents:200}]};
    const purchase=await post(`/api/tasks/${task.id}/purchases`,{serviceId:'supplier-compare',input,reason:'Choose the lowest delivered quote for the brief.',idempotencyKey:randomUUID(),simulateResponseLoss:true});
    const interrupted=await post(`/api/purchases/${purchase.id}/execute`);
    const recovered=await post(`/api/purchases/${purchase.id}/recover`);
    const approval=await post(`/api/tasks/${task.id}/purchases`,{serviceId:'report-export',input:{title:'Supplier decision',findings:JSON.stringify(recovered.result)},reason:'Create the final comparison report.',idempotencyKey:randomUUID()});
    result={mode:'sandbox',taskId:task.id,responseLoss:interrupted.status,recovery:recovered.status,result:recovered.result,approvalPurchaseId:approval.id,approvalStatus:approval.status,next:'Open the workspace to approve the report purchase. No ZEC has moved.'};
  }else{
    result={usage:[
      'zender status','zender owner-key',
      'zender task create --title "Supplier research" --budget-zec 0.01 --approval-zec 0.001 --services document-extract,supplier-compare,report-export',
      'zender task inspect <id>','zender task token <id>','zender task close <id>','zender task receipt <id> [--details]',
      'zender purchase request <task-id> --service supplier-compare --reason "Compare quotes" --input \'{"quotes":[{"name":"A","unitCostCents":100,"shippingCents":20}]}\' --key <stable-request-key>',
      'zender purchase approve|reject|execute|recover|inspect <purchase-id>','zender demo'
    ]};
  }
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await runCli(process.argv.slice(2)),null,2)+'\n'); }
  catch(error) { process.stderr.write(JSON.stringify({error:error.message})+'\n');process.exitCode=1; }
}
