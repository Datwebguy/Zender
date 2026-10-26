import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function api(path,{method='GET',body,agent=false}={}){
  let token=process.env.ZENDER_AGENT_TOKEN;
  if(!agent&&!token)token=process.env.ZENDER_OWNER_TOKEN||readFileSync(resolve(process.env.ZENDER_DATA_DIR||resolve(root,'.zender'),'owner.key'),'utf8').trim();
  if(!token)throw new Error('Set ZENDER_AGENT_TOKEN to a task credential issued by the owner.');
  const base=process.env.ZENDER_URL||'http://127.0.0.1:4310';const url=new URL(base);
  const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(url.protocol!=='https:'&&!(local&&url.protocol==='http:'))throw new Error('Remote workspaces require HTTPS.');
  const response=await fetch(new URL(path,base),{method,redirect:'error',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed.');return result;
}
