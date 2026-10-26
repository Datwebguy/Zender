import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Store } from './lib/store.mjs';
import { Engine, Fault } from './lib/engine.mjs';
import { SandboxProvider, ZipherProvider, CATALOG } from './lib/providers.mjs';
import { FixedPcztProvider } from './lib/pczt-provider.mjs';
const root=dirname(fileURLToPath(import.meta.url));
function clean(value){
  if(Array.isArray(value))return value.map(clean);
  if(value&&typeof value==='object'){
    if(value.serviceId&&value.fingerprint){const{quoteResult,fingerprint,idempotencyKey,...purchase}=value;return purchase;}
    if(Array.isArray(value.purchases))return{...value,purchases:value.purchases.map(clean)};
    if(Array.isArray(value.tasks))return{...value,tasks:value.tasks.map(clean)};
  }
  return value;
}
function same(a,b){const aa=Buffer.from(a||''),bb=Buffer.from(b||'');return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function createApp({store,provider,ownerToken,publicOrigin=null}){
  const published=publicOrigin?new URL(publicOrigin):null;
  if(published&&published.protocol!=='https:')throw new Error('Public workspaces require HTTPS.');
  const engine=new Engine(store,provider);engine.recoverInterrupted();
  const sessions=new Map();const logins=new Map();
  const send=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(clean(data)));};
  async function handler(req,res){
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try{
      const path=new URL(req.url,'http://localhost').pathname;
      if(path==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,mode:provider.mode});
      const host=req.headers.host||'';
      const local=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
      if(!local&&host!==published?.host)throw new Fault('Use the configured Zender address.',403,'INVALID_HOST');
      if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin);}catch{throw new Fault('Invalid origin.',403);}if(origin.host!==host||origin.origin!==(local?`http://${host}`:published?.origin))throw new Fault('Cross-origin requests are refused.',403);}
      if(!path.startsWith('/api/')){
        if(req.method!=='GET'&&req.method!=='HEAD')throw new Fault('Method not allowed.',405);
        const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
        const file=files[path];if(!file)throw new Fault('Not found.',404);
        const data=readFileSync(resolve(root,'public',file));res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]+'; charset=utf-8'});return res.end(req.method==='HEAD'?undefined:data);
      }
      let body={};
      if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
        if(!/^application\/json\b/.test(req.headers['content-type']||''))throw new Fault('Send application/json.',415);
        const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>65536)throw new Fault('Request exceeds 64 KB.',413);chunks.push(chunk);}
        try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw new Fault('Invalid JSON.');}
        if(!body||typeof body!=='object'||Array.isArray(body))throw new Fault('Send a JSON object.');
      }
      if(path==='/api/session'&&req.method==='POST'){
        const address=req.socket.remoteAddress;const window=logins.get(address)||{count:0,until:Date.now()+60000};
        if(window.until<Date.now()){window.count=0;window.until=Date.now()+60000;}
        if(++window.count>10)throw new Fault('Too many sign-in attempts. Try again in a minute.',429);logins.set(address,window);
        if(!same(body.token,ownerToken))throw new Fault('Owner key is incorrect.',401,'UNAUTHORIZED');
        const session=randomBytes(32).toString('hex');sessions.set(session,Date.now()+8*3600000);
        res.setHeader('Set-Cookie',`zender_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${published?'; Secure':''}`);return send(res,200,{ok:true});
      }
      const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');
      const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('zender_session='))?.slice(15);
      const sessionValid=cookie&&(sessions.get(cookie)||0)>Date.now();
      const owner=same(bearer,ownerToken)||!!sessionValid;
      let agentTask=null;
      if(!owner){if(!bearer)throw new Fault('Sign in to your local workspace.',401,'UNAUTHORIZED');agentTask=engine.authenticateAgent(bearer);}
      const needOwner=()=>{if(!owner)throw new Fault('Only the owner can change permissions or approve spending.',403,'OWNER_REQUIRED');};
      const scope=id=>{if(!owner&&agentTask!==id)throw new Fault('This credential belongs to another task.',403,'TASK_SCOPE');};
      if(path==='/api/session'&&req.method==='DELETE'){if(cookie)sessions.delete(cookie);res.setHeader('Set-Cookie','zender_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
      if(path==='/api/workspace'&&req.method==='GET')return send(res,200,{mode:provider.mode,provider:provider.name,liveBroadcastEnabled:provider.broadcastEnabled===true,owner,services:provider.mode==='sandbox'?CATALOG:provider.services.map(({resultUrl,...s})=>s),tasks:owner?engine.list():[engine.view(agentTask)]});
      if(path==='/api/wallet'&&req.method==='GET'){needOwner();return send(res,200,provider.status?await provider.status():{mode:'sandbox',ready:true});}
      if(path==='/api/tasks'&&req.method==='POST'){needOwner();return send(res,201,engine.createTask(body));}
      let m=path.match(/^\/api\/tasks\/([a-z0-9-]+)(?:\/(credentials|close|receipt|purchases))?$/);
      if(m){const [,id,action]=m;scope(id);
        if(req.method==='GET'&&!action)return send(res,200,engine.view(id));
        if(req.method==='GET'&&action==='receipt')return send(res,200,engine.receipt(id,{details:new URL(req.url,'http://localhost').searchParams.get('details')==='true'}));
        if(req.method==='POST'&&action==='credentials'){needOwner();return send(res,201,engine.issueCredential(id));}
        if(req.method==='POST'&&action==='close'){needOwner();return send(res,200,engine.closeTask(id));}
        if(req.method==='POST'&&action==='purchases')return send(res,201,engine.request(id,body));
      }
      m=path.match(/^\/api\/purchases\/([a-z0-9-]+)(?:\/(approve|reject|execute|recover))?$/);
      if(m){const [,id,action]=m;const purchase=engine.requirePurchase(id);scope(purchase.taskId);
        if(req.method==='GET'&&!action)return send(res,200,purchase);
        if(req.method==='POST'){
          if(action==='approve'||action==='reject'){needOwner();return send(res,200,engine.decide(id,action==='approve'));}
          if(action==='execute')return send(res,200,await engine.execute(id));
          if(action==='recover')return send(res,200,await engine.recover(id));
        }
      }
      throw new Fault('Endpoint not found.',404,'NOT_FOUND');
    }catch(error){send(res,error.status||400,{error:error.message,code:error.code||'INVALID_REQUEST'});}
  }
  return{server:http.createServer(handler),handler,engine};
}
export function start(){
  const data=resolve(process.env.ZENDER_DATA_DIR||resolve(root,'.zender'));mkdirSync(data,{recursive:true,mode:0o700});chmodSync(data,0o700);
  const keyFile=resolve(data,'owner.key');
  if(!existsSync(keyFile))writeFileSync(keyFile,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
  const ownerToken=process.env.ZENDER_OWNER_TOKEN||readFileSync(keyFile,'utf8').trim();if(ownerToken.length<32)throw new Error('Owner key must contain at least 32 characters.');
  const store=new Store(resolve(data,'expenses.sqlite'));
  let provider;
  if(process.env.ZENDER_WALLET_MODE==='pczt-testnet'){
    provider=new FixedPcztProvider({dataDir:process.env.ZENDER_WALLET_DIR||resolve(data,'wallets'),binary:process.env.ZENDER_WALLET_BIN||'zcash-devtool',inspector:process.env.ZENDER_INSPECTOR_BIN||'zender-inspect',server:process.env.ZENDER_LIGHTWALLETD||'zecrocks'});
    provider.initialize().catch(error=>{provider.startupError=error.message;console.error('Testnet wallet setup failed; spending is unavailable.');});
  }else if(process.env.ZENDER_WALLET_MODE==='testnet'){
    const services=JSON.parse(readFileSync(process.env.ZENDER_SERVICES_FILE,'utf8'));
    provider=new ZipherProvider({binary:process.env.ZENDER_WALLET_BIN||'zipher-cli',dataDir:process.env.ZENDER_WALLET_DIR,server:process.env.ZENDER_LIGHTWALLETD,services});
  }else if(process.env.ZENDER_WALLET_MODE&&process.env.ZENDER_WALLET_MODE!=='sandbox')throw new Error('Only sandbox and testnet modes are supported.');
  else provider=new SandboxProvider(store);
  const app=createApp({store,provider,ownerToken,publicOrigin:process.env.ZENDER_PUBLIC_URL||null});
  const port=Number(process.env.PORT||4310);
  app.server.on('error',error=>{console.error(`Zender could not start: ${error.message}`);process.exitCode=1;});
  app.server.listen(port,process.env.ZENDER_PUBLIC_URL?'0.0.0.0':'127.0.0.1',()=>console.log(`Zender · ${provider.name}\n${process.env.ZENDER_PUBLIC_URL||`http://127.0.0.1:${port}`}\nOwner sign-in is required. No mainnet spending is enabled.`));
  return app;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))start();
