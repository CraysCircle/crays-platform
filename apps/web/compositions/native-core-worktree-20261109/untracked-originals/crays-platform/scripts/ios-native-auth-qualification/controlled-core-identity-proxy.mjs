// Qualification-only TLS reverse proxy. Its synthetic admission callback is
// NOT an actual Core/Auth0 grant or production identity bridge.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,X509Certificate} from 'node:crypto';
import {createServer} from 'node:https';
import {request as upstreamRequest} from 'node:http';

export function coreSubjectForCanonicalPerson(id){
 assert.equal(typeof id,'string');assert(id.length>0&&id.length<=256);
 return 'crays-core-person-'+createHash('sha256').update('crays.sdk.core-person.v1\n'+id).digest('hex');
}
export async function controlledCoreIdentityProxy({root,gatewayPort,canonicalPersonId,assertCurrent}){
 assert(root.endsWith('/private'));assert.equal(typeof assertCurrent,'function');
 const key=root+'/proxy-key.pem',cert=root+'/proxy-cert.pem';
 const generated=spawnSync('/usr/bin/openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=CRAYS isolated Core identity qualification','-addext','subjectAltName=IP:192.0.2.20'],{encoding:'utf8',timeout:15000});
 assert.equal(generated.status,0,'Own finite synthetic TLS certificate generation');
 const [keyBytes,certBytes]=await Promise.all([readFile(key),readFile(cert)]);
 const subject=coreSubjectForCanonicalPerson(canonicalPersonId),secret=randomBytes(32).toString('hex');
 const sockets=new Set();let forwarded=0,denied=0;
 const proxy=createServer({key:keyBytes,cert:certBytes},(_,response)=>{response.writeHead(404);response.end();});
 proxy.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
 proxy.on('upgrade',(request,socket,head)=>{
  void (async()=>{
   // Native/model/client input never selects the forwarded identity. All caller
   // authorization/identity/proxy headers are stripped rather than propagated.
   if(request.url!=='/own-chuck' || request.headers.authorization!=='Bearer '+secret){denied++;socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
   const person=await assertCurrent();assert.equal(person,canonicalPersonId);
   assert.equal(request.socket.remoteAddress,'192.0.2.20','Actual non-loopback client address inside this private namespace');
   const headers={host:'127.0.0.1:'+gatewayPort,connection:'Upgrade',upgrade:'websocket',
    'sec-websocket-key':request.headers['sec-websocket-key'],'sec-websocket-version':request.headers['sec-websocket-version'],
    'x-forwarded-for':request.socket.remoteAddress,'x-forwarded-proto':'https','x-forwarded-host':'core-qualification.invalid',
    'x-crays-core-person':subject,'x-crays-core-assertion':'controlled-current-core-person'};
   if(request.headers['sec-websocket-extensions'])headers['sec-websocket-extensions']=request.headers['sec-websocket-extensions'];
   assert.equal(await assertCurrent(),canonicalPersonId);
   const upstream=upstreamRequest({hostname:'127.0.0.1',port:gatewayPort,path:'/',method:'GET',headers});
   upstream.on('upgrade',(reply,peer,upstreamHead)=>{
    void (async()=>{
     assert.equal(await assertCurrent(),canonicalPersonId);forwarded++;
     socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(reply.headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');
     if(upstreamHead.length)socket.write(upstreamHead);if(head.length)peer.write(head);
     socket.pipe(peer);peer.pipe(socket);socket.on('error',()=>peer.destroy());peer.on('error',()=>socket.destroy());
     socket.on('close',()=>peer.destroy());peer.on('close',()=>socket.destroy());
    })().catch(()=>{peer.destroy();socket.destroy();});
   });
   upstream.on('response',response=>{response.resume();socket.end('HTTP/1.1 '+response.statusCode+' Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');});
   upstream.on('error',()=>socket.destroy());socket.on('close',()=>upstream.destroy());upstream.end();
  })().catch(()=>{denied++;socket.destroy();});
 });
 await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(0,'192.0.2.20',resolve);});
 return {url:`wss://192.0.2.20:${proxy.address().port}/own-chuck`,subject,
  tlsFingerprint:new X509Certificate(certBytes).fingerprint256,
  edgeAuthHeaders:{authorization:'Bearer '+secret},
  // Safe counters only; never persist the synthetic TLS key or bearer ticket.
  counters:()=>({forwarded,denied}),
  async close(){for(const s of sockets)s.destroy();await new Promise((resolve,reject)=>proxy.close(error=>error?reject(error):resolve()));}};
}
