import {createServer,request as upstreamRequest} from 'node:http';
import {once} from 'node:events';
import {createOriginalChuckHost} from '/srv/crays/releases/common-canonical-20261106-01/runtime-source/src/chuck/server/serve-original-host.mjs';
try {
 const original=await createOriginalChuckHost(); original.assertRuntimeCurrent();
 const handlers=original.server.listeners('request');
 const upgradeCount=original.server.listenerCount('upgrade');
 if(handlers.length!==1 || ![0,1].includes(upgradeCount)) throw Error('UNEXPECTED_ORIGINAL_LISTENERS');
 const stripHop=headers=>{
  const blocked=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade',...(String(headers.connection||'').split(',').map(v=>v.trim().toLowerCase()))]);
  return Object.fromEntries(Object.entries(headers).filter(([k])=>!blocked.has(k.toLowerCase())));
 };
 const proxyTeamUpgrade=(req,socket,head)=>{
  // Preserve the original Work handshake and authorization; no identity headers are synthesized.
  const headers=stripHop(req.headers);headers.host='member.crays.world';headers['x-forwarded-host']='member.crays.world';headers['x-forwarded-proto']='https';headers['x-forwarded-port']='443';
  headers.connection='Upgrade';headers.upgrade=req.headers.upgrade;
  const q=upstreamRequest({hostname:'127.0.0.1',port:19109,path:req.url,method:req.method,headers,timeout:45000});
  const fail=()=>{q.destroy();socket.destroy();};
  socket.on('error',()=>q.destroy());socket.on('close',()=>q.destroy());
  q.on('timeout',fail);q.on('error',()=>socket.destroy());
  const writeHead=(reply,handshake=true)=>{
   socket.write('HTTP/1.1 '+reply.statusCode+' '+reply.statusMessage+'\r\n');
   const kept=handshake?null:new Set(Object.keys(stripHop(reply.headers)).map(k=>k.toLowerCase()));
   for(let i=0;i<reply.rawHeaders.length;i+=2)if(handshake||kept.has(reply.rawHeaders[i].toLowerCase()))socket.write(reply.rawHeaders[i]+': '+reply.rawHeaders[i+1]+'\r\n');
   if(!handshake)socket.write('Connection: close\r\n');
   socket.write('\r\n');
  };
  q.on('upgrade',(reply,upstream,upstreamHead)=>{
   q.setTimeout(0);upstream.setTimeout(0);socket.setTimeout(0);
   writeHead(reply);
   if(upstreamHead.length)socket.write(upstreamHead);
   if(head.length)upstream.write(head);
   upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
   upstream.on('close',()=>socket.destroy());socket.on('close',()=>upstream.destroy());
   socket.pipe(upstream);upstream.pipe(socket);
  });
  q.on('response',reply=>{
   // A refused handshake remains the original Work status/headers/body.
   writeHead(reply,false);reply.on('error',()=>socket.destroy());reply.pipe(socket);
  });
  q.end();
 };
 const edge=createServer({maxHeaderSize:65536},(req,res)=>{
  if(req.socket.remoteAddress!=='172.24.0.1'||!['member.crays.world','team.craysclub.com'].includes(req.headers.host)) {res.writeHead(421,{'cache-control':'no-store'});res.end();return;}
  // A real fixed loopback hop retains every original request boundary; never forge socket identity.
  const headers=stripHop(req.headers);headers.host=req.headers.host;
  // Restore the original direct-request boundary behind the already checked fixed private edge.
  if(req.headers.host==='member.crays.world'&&['/api/crays/personal/chuck','/api/crays/personal/chuck/original'].includes(req.url)){
   for(const name of ['x-forwarded-for','x-forwarded-host','x-forwarded-proto','x-forwarded-port'])delete headers[name];
  }
  if(req.headers.host==='team.craysclub.com'){headers.host='member.crays.world';headers['x-forwarded-host']='member.crays.world';headers['x-forwarded-proto']='https';headers['x-forwarded-port']='443';}
  const q=upstreamRequest({hostname:'127.0.0.1',port:req.headers.host==='team.craysclub.com'?19109:8990,path:req.url,method:req.method,headers,timeout:45000},reply=>{
   res.writeHead(reply.statusCode,stripHop(reply.headers));reply.pipe(res);
   reply.on('error',()=>res.destroy());
  });
  q.on('timeout',()=>q.destroy());q.on('error',()=>{if(!res.headersSent){res.writeHead(502,{'cache-control':'no-store'});res.end();}else res.destroy();});
  req.on('aborted',()=>q.destroy());req.on('error',()=>q.destroy());res.on('close',()=>{if(!res.writableFinished)q.destroy();});req.pipe(q);
 });
 // Reuse only the one source-pinned original Nostr upgrade admission; retain real peer.
 edge.on('upgrade',(req,socket,head)=>{
  if(req.socket.remoteAddress!=='172.24.0.1'){socket.destroy();return;}
  if(req.headers.host==='team.craysclub.com'){proxyTeamUpgrade(req,socket,head);return;}
  if(req.headers.host!=='member.crays.world'||upgradeCount!==1){socket.destroy();return;}
  original.server.emit('upgrade',req,socket,head);
 });
 edge.requestTimeout=original.server.requestTimeout; edge.headersTimeout=original.server.headersTimeout;
 original.server.listen(8990,'127.0.0.1'); await once(original.server,'listening');
 edge.listen(8990,'172.24.0.2'); await once(edge,'listening');
 for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{void original.close().then(()=>{edge.close();original.server.close(()=>process.exit(0));}).catch(()=>process.exit(1));});
 process.stdout.write('CRAYS_ORIGINAL_COMMON_LOOPBACK_AND_PRIVATE_EDGE_READY\n');
} catch {process.stderr.write('CRAYS_COMMON_PRIVATE_EDGE_START_FAILED\n');process.exit(1);}
