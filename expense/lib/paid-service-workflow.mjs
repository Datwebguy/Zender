import { fetchService, paymentRequirement, paymentSignature, resourceUrl } from './paid-service.mjs';
export function paidServiceWorkflow(client,fetcher=fetchService){
  return {
    async request({taskId,url,reason,idempotencyKey}){
      const task=await client(`/api/tasks/${encodeURIComponent(taskId)}`,{agent:true});
      if(!['mainnet','testnet'].includes(task.mode)||task.status!=='active'||task.expired||!task.services.includes('shielded-payment'))throw new Error('This task cannot request a ZEC payment.');
      url=resourceUrl(url);const response=await fetcher(url);
      if(response.status===200)return {status:'free',resourceUrl:url,content:response.body};
      const offer=paymentRequirement(response,task.mode);
      const purchase=await client(`/api/tasks/${encodeURIComponent(taskId)}/purchases`,{agent:true,method:'POST',body:{serviceId:'shielded-payment',reason,idempotencyKey,input:{recipient:offer.recipient,amountZec:offer.amountZec,resourceUrl:url}}});
      return {status:'payment_requested',purchase,validUntil:offer.validUntil};
    },
    async collect({purchaseId}){
      const purchase=await client(`/api/purchases/${encodeURIComponent(purchaseId)}`,{agent:true});
      if(!purchase.input?.resourceUrl||!['mainnet','testnet'].includes(purchase.mode))throw new Error('This payment is not linked to a paid service.');
      if(purchase.status!=='delivered'||purchase.simulation)throw new Error('Wait for the existing ZEC payment to be confirmed. Do not send another payment.');
      const url=resourceUrl(purchase.input.resourceUrl),response=await fetcher(url);
      const offer=paymentRequirement(response,purchase.mode),proof=paymentSignature(purchase,offer);
      const delivered=await fetcher(url,{paymentSignature:proof});
      if(delivered.status!==200)throw new Error('The service has not delivered the result. Retry collection without another payment.');
      return {status:'delivered',resourceUrl:url,content:delivered.body,contentType:delivered.headers?.['content-type']||null};
    }
  };
}
