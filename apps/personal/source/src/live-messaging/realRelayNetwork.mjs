function snapshotFilters(filters) {
 const rows=JSON.parse(JSON.stringify(Array.isArray(filters)?filters:[filters]));
 if(!rows.length||rows.some(f=>!f||typeof f!=='object'||Array.isArray(f)))throw Error('Invalid subscription filters');
 return rows;
}
function matchesFilters(event,filters){return filters.some(f=>
 (!f.ids||f.ids.some(id=>event.id.startsWith(id)))&&
 (!f.authors||f.authors.some(pk=>event.pubkey.startsWith(pk)))&&
 (!f.kinds||f.kinds.includes(event.kind))&&
 (f.since===undefined||event.created_at>=f.since)&&
 (f.until===undefined||event.created_at<=f.until)&&
 Object.keys(f).filter(k=>k.startsWith('#')).every(k=>event.tags.some(t=>t[0]===k.slice(1)&&f[k].includes(t[1])))
 );}
/** Actual Nostr I/O port. Caller supplies a current admitted relay allowlist and verifier; no fallback relays. */
export function createRelayNetwork({relays,createSocket,verifyEvent,signAuth,expectedAuthPubkey,timeoutMs=8000,onDisconnect}) {
 if(signAuth&&(!/^[a-f0-9]{64}$/.test(expectedAuthPubkey||'')))throw Error('Authentication requires an explicit account public key');
 const allowed=new Set(relays),connections=new Map();let counter=0,closed=false;
 if(!allowed.size||typeof verifyEvent!=='function'||onDisconnect!==undefined&&typeof onDisconnect!=='function')throw Error('Explicit relay scope and event verifier required');
 function connection(url){
  if(closed||!allowed.has(url))throw Error('Relay outside this communication scope');
  if(connections.has(url))return connections.get(url);
  const ws=createSocket(url),subscriptions=new Map(),acks=new Map();
  let resolveOpen,rejectOpen,authId=null,authStarted=false;
  const ready=new Promise((resolve,reject)=>{resolveOpen=resolve;rejectOpen=reject;});
  const opening=setTimeout(()=>{rejectOpen(Error('Relay connection deadline'));ws.close();},timeoutMs);
  const c={ws,ready,subscriptions,acks};connections.set(url,c);
  ws.addEventListener('open',()=>{if(!signAuth){clearTimeout(opening);resolveOpen();}});
  ws.addEventListener('error',()=>{clearTimeout(opening);rejectOpen(Error('Relay connection unavailable'));});
  ws.addEventListener('close',()=>{clearTimeout(opening);rejectOpen(Error('Relay closed before readiness'));connections.delete(url);for(const s of subscriptions.values())s.error?.(Error('Relay disconnected'));for(const a of acks.values())a({from:url,ok:false,uncertain:true,message:'Connection ended before acknowledgement'});acks.clear();if(!closed&&onDisconnect){try{onDisconnect(url);}catch{}}});
  ws.addEventListener('message',async frame=>{
   let m;try{m=JSON.parse(String(frame.data));}catch{return;}if(!Array.isArray(m))return;
   if(m[0]==='AUTH'&&signAuth){
    if(authStarted||typeof m[1]!=='string'||!m[1]||m[1].length>4096){rejectOpen(Error('Invalid authentication challenge'));ws.close();return;}
    authStarted=true;
    try{const challenge=m[1],e=await signAuth(url,challenge);
     const exactTag=(name,value)=>e.tags.filter(t=>t[0]===name).length===1&&e.tags.some(t=>t[0]===name&&t[1]===value);
     if(!verifyEvent(e)||e.kind!==22242||e.pubkey!==expectedAuthPubkey||Math.abs(Date.now()/1000-e.created_at)>60||!exactTag('relay',url)||!exactTag('challenge',challenge))throw Error('Invalid authentication');
     authId=e.id;ws.send(JSON.stringify(['AUTH',e]));
    }catch{rejectOpen(Error('Relay authentication failed'));ws.close();}return;
   }
   if(m[0]==='OK'&&authId&&m[1]===authId){if(m[2]===true){clearTimeout(opening);resolveOpen();}else{rejectOpen(Error('Relay authentication rejected'));ws.close();}return;}
   if(m[0]==='OK'){const done=acks.get(m[1]);if(done){acks.delete(m[1]);done({from:url,ok:m[2]===true,message:typeof m[3]==='string'?m[3]:undefined});}return;}
   const s=subscriptions.get(m[1]);if(!s)return;
   if(m[0]==='EVENT'){if(verifyEvent(m[2])&&matchesFilters(m[2],s.filters))s.next?.(m[2]);return;}
   if(m[0]==='EOSE')s.eose?.();
   if(m[0]==='CLOSED')s.error?.(Error('Relay rejected subscription'));
  });
  return c;
 }
 function check(urls){if(!urls.length||urls.some(url=>!allowed.has(url)))throw Error('Relay outside this communication scope');}
 function subscription(urls,filters){check(urls);const scopedFilters=snapshotFilters(filters);return{subscribe(observer){let stopped=false;const cleanups=[];for(const url of urls){const c=connection(url),id='crays-live-'+(++counter);c.ready.then(()=>{if(stopped)return;c.subscriptions.set(id,{...observer,filters:scopedFilters});c.ws.send(JSON.stringify(['REQ',id,...scopedFilters]));cleanups.push(()=>{c.subscriptions.delete(id);if(c.ws.readyState===1)c.ws.send(JSON.stringify(['CLOSE',id]));});}).catch(e=>observer.error?.(e));}return{unsubscribe(){stopped=true;for(const cleanup of cleanups)cleanup();}};}};}
 async function request(urls,filters){check(urls);const scopedFilters=snapshotFilters(filters);const rows=await Promise.all(urls.map(async url=>{const c=connection(url);await c.ready;const id='crays-read-'+(++counter);return new Promise((resolve,reject)=>{const events=[];let done=false;const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);c.subscriptions.delete(id);if(c.ws.readyState===1)c.ws.send(JSON.stringify(['CLOSE',id]));error?reject(error):resolve(events);};const timer=setTimeout(()=>finish(Error('Relay query deadline')),timeoutMs);c.subscriptions.set(id,{filters:scopedFilters,next(e){if(events.length>=2048){finish(Error('Relay query exceeded bound'));return;}events.push(e);},eose:()=>finish(),error:finish});c.ws.send(JSON.stringify(['REQ',id,...scopedFilters]));});}));return [...new Map(rows.flat().map(e=>[e.id,e])).values()];}
 async function publish(urls,event,{signal,beforeSend}={}){
  check(urls);if(!verifyEvent(event))throw Error('Unsigned or invalid event');
  const cancelled=(url,uncertain=false)=>({from:url,ok:false,uncertain,message:'Publication cancelled'});
  const entries=await Promise.all(urls.map(async url=>{
   if(signal?.aborted)return[url,cancelled(url)];const c=connection(url);try{await c.ready;}catch{return[url,{from:url,ok:false,uncertain:false,message:'Relay connection failed before send'}];}
   if(signal?.aborted)return[url,cancelled(url)];if(beforeSend){let admitted=false;try{admitted=beforeSend()===true;}catch{}if(!admitted)return[url,cancelled(url)];}if(c.acks.has(event.id))throw Error('This exact event already has an outstanding publish');
   const result=await new Promise(resolve=>{let sent=false,done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);c.acks.delete(event.id);resolve(value);},abort=()=>finish(cancelled(url,sent)),timer=setTimeout(()=>finish({from:url,ok:false,uncertain:true,message:'No relay acknowledgement; reconcile exact event'}),timeoutMs);
    c.acks.set(event.id,finish);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
    try{sent=true;c.ws.send(JSON.stringify(['EVENT',event]));}catch{finish({from:url,ok:false,uncertain:true,message:'Transport interrupted'});}
   });return[url,result];
  }));return Object.fromEntries(entries);
 }

 return{publish,request,subscription,async getUserInboxRelays(pubkey){const rows=await request([...allowed],{kinds:[10050],authors:[pubkey]});const newest=rows.sort((a,b)=>b.created_at-a.created_at)[0];return newest?[...new Set(newest.tags.filter(t=>t[0]==='relay'&&allowed.has(t[1])).map(t=>t[1]))]:[];},close(){closed=true;for(const c of connections.values())c.ws.close();connections.clear();}};
}
