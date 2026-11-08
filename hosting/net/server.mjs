// Serve the unchanged published Primal SPA with its original Vercel fallback.
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
export function createPrimalServer(){
 return createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.includes('\0')||pathname.includes('\\')){res.writeHead(400);res.end();return;}
   let file=resolve(root,'.'+pathname);
   if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
   let info;
   try{info=await stat(file);}catch{}
   if(!info?.isFile()){
    // Original deployment rewrites /Cryptonomicon and all SPA routes to index.
    file=resolve(root,'index.html');info=await stat(file);
   }
   const immutable=file.startsWith(root+sep+'assets'+sep)&&/[-.][a-f\d]{8,}\./i.test(file);
   const headers={'Content-Type':types[extname(file).toLowerCase()]??'application/octet-stream','Content-Length':info.size,'Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'};
   if(file===resolve(root,'imageCacheWorker.js'))headers['Service-Worker-Allowed']='/';
   res.writeHead(200,headers);
   if(req.method==='HEAD'){res.end();return;}
   const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch{if(!res.headersSent)res.writeHead(400);res.end();}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 createPrimalServer().listen(Number(process.env.PORT||8080),process.env.HOST||'0.0.0.0');
}
