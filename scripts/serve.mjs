import http from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runCampaign,sourceHash} from './research.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4173),origin=`http://127.0.0.1:${port}`;
const currentHash=(await sourceHash()).slice(0,12);
let campaign=0;
try { const files=await readdir(path.join(ROOT,'research','campaigns')); const complete=files.filter(f=>f.endsWith(`-${currentHash}.json`)).map(f=>Number(f.split('-')[1])); if(complete.length)campaign=Math.max(...complete)+1; } catch {}
let state={running:false,done:0,total:432,campaign,message:'Ready. Completed trials resume automatically.'},controller;
const json=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain'};
const server=http.createServer(async(req,res)=>{
  try{
    if(![new URL(origin).host,`localhost:${port}`].includes(req.headers.host))return json(res,403,{error:'Local access only.'});
    const url=new URL(req.url,origin),p=decodeURIComponent(url.pathname);
    if(p.startsWith('/api/')){
      if(req.method==='GET'&&p==='/api/status')return json(res,200,{...state,persistent:true});
      if(req.method!=='POST'||req.headers.origin!==origin&&req.headers.origin!==`http://localhost:${port}`)return json(res,403,{error:'Use the local dashboard.'});
      if(p==='/api/start'){
        if(state.running)return json(res,409,{error:'A campaign is already running.'});
        controller=new AbortController();state={...state,running:true,error:null,message:'Running the fixed protocol.'};
        const campaign=state.campaign;
        runCampaign({campaign,signal:controller.signal,onProgress:p=>{state={...state,...p};}}).then(report=>{
          state={...state,running:false,campaign:campaign+1,message:`Saved ${report.runCount} trials. ${report.assessment.status}.`};
        }).catch(e=>{state={...state,running:false,error:e.message,message:e.message};});
        return json(res,202,state);
      }
      if(p==='/api/stop'){controller?.abort();return json(res,200,{message:'Stopping after the current trial.'});}
      return json(res,404,{error:'Unknown action.'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
    // Explicit public directories only; never serve research databases or credentials.
    if(!(/^\/(assets|src|data|docs)\//.test(p)||['/','/index.html'].includes(p))||p.split('/').includes('..'))return json(res,404,{error:'Not found.'});
    const file=path.resolve(ROOT,'.'+(p==='/'?'/index.html':p));
    if(!file.startsWith(ROOT))return json(res,403,{error:'Invalid path.'});
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(e){json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found.':'Request failed.'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`AI Evolution Lab: ${origin}\nCtrl+C stops the server. Research checkpoints are retained.`));
process.on('SIGINT',()=>{controller?.abort();server.close();});
