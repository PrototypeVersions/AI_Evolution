import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.PORT||4173);
const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.md':'text/plain'};
const server=http.createServer(async(req,res)=>{
  try{
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))throw new Error();
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('This observatory is read only.');}
    const p=decodeURIComponent(new URL(req.url,`http://127.0.0.1:${port}`).pathname);
    if(!(/^\/(assets|src|data|docs)\//.test(p)||p==='/'||p==='/index.html'||p==='/continuum.html')||p.split('/').includes('..'))throw new Error();
    const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root))throw new Error();
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`AI Evolution observatory: http://127.0.0.1:${port}`));
process.on('SIGINT',()=>server.close());
