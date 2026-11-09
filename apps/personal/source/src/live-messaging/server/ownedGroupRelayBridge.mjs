import {verifyEvent} from 'nostr-tools';
import {createRelayNetwork} from '../realRelayNetwork.mjs';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),fail=()=>Error('This group relay is unavailable');
const exact=(value,fields)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===fields.split(',').sort().join(',');
/** Ciphertext-only same-host relay bridge. Original SDK/Core authenticates each
 * request before this port. The directory supplies visited/explicit group scope,
 * never the browser. No arbitrary destination, plaintext or general signer RPC.
 */
export function createOwnedGroupRelayBridge({directory,openCustody,createSocket=url=>new WebSocket(url)}){
 if(typeof directory?.relayScope!=='function'||typeof openCustody!=='function'||typeof createSocket!=='function')throw fail();
 return async({binding,command,signal,isCurrent})=>{
  if(!signal?.addEventListener||typeof isCurrent!=='function'||!exact(command,command?.action==='request'?'action,relays,filters':'action,relays,event')||!['request','publish'].includes(command.action)||!Array.isArray(command.relays)||command.relays.length!==1)throw fail();
  const check=()=>{if(signal.aborted||isCurrent()!==true)throw fail();};check();
  const scope=await directory.relayScope(binding,command.relays);check();if(!scope)throw fail();
  const targets=new Set([binding.pubkey,...scope.invitees]),routing=new Set(scope.routingIds),relays=command.relays;
  if(command.action==='request'){
   if(!Array.isArray(command.filters)||!command.filters.length||command.filters.length>4)throw fail();
   for(const filter of command.filters){
    if(!filter||Array.isArray(filter)||Object.keys(filter).some(key=>!['kinds','authors','ids','#h','#p','since','until','limit'].includes(key))||!Array.isArray(filter.kinds)||filter.kinds.length!==1||![445,1059,10050,30443].includes(filter.kinds[0]))throw fail();
    for(const key of ['authors','ids','#h','#p'])if(filter[key]!==undefined&&(!Array.isArray(filter[key])||!filter[key].length||filter[key].length>16||!filter[key].every(hex)))throw fail();
    for(const key of ['since','until'])if(filter[key]!==undefined&&(!Number.isSafeInteger(filter[key])||filter[key]<0))throw fail();
    if(filter.limit!==undefined&&(!Number.isInteger(filter.limit)||filter.limit<1||filter.limit>200))throw fail();
    const kind=filter.kinds[0];if(kind===445&&(!filter['#h']||!filter['#h'].every(id=>routing.has(id))))throw fail();
    if(kind===1059&&(filter['#p']?.length!==1||filter['#p'][0]!==binding.pubkey))throw fail();
    if([10050,30443].includes(kind)&&(!filter.authors||!filter.authors.every(key=>targets.has(key))))throw fail();
   }
  }else{
   const event=command.event;if(!event||JSON.stringify(event).length>512*1024||!verifyEvent(event))throw fail();
   if(event.kind===445){const tags=event.tags.filter(tag=>tag[0]==='h');if(tags.length!==1||tags[0].length!==2||!routing.has(tags[0][1]))throw fail();}
   else if(event.kind===1059){const tags=event.tags.filter(tag=>tag[0]==='p');if(tags.length!==1||tags[0].length!==2||!scope.invitees.includes(tags[0][1]))throw fail();}
   else if(event.kind===10050){if(event.pubkey!==binding.pubkey||event.content!==''||!event.tags.length||event.tags.length>scope.allRelays.length||new Set(event.tags.map(tag=>tag[1])).size!==event.tags.length||event.tags.some(tag=>tag.length!==2||tag[0]!=='relay'||!scope.allRelays.includes(tag[1])))throw fail();}
   else if(event.kind!==30443||event.pubkey!==binding.pubkey)throw fail();
  }
  let signer,network;
  try{
   signer=await openCustody({binding,signal,isCurrent:()=>{try{check();return directory.isRelayScopeCurrent(binding,scope)===true;}catch{return false;}},authorizeOperation:(actual,operation)=>directory.authorizeRelayOperation(actual,operation)});check();
   network=createRelayNetwork({relays,createSocket,verifyEvent,expectedAuthPubkey:binding.pubkey,signAuth:async(relay,challenge)=>{check();if(!directory.isRelayScopeCurrent(binding,scope))throw fail();return signer.signEvent({kind:22242,created_at:Math.floor(Date.now()/1000),content:'',tags:[['relay',relay],['challenge',challenge]]});}});
   const abort=()=>network.close();signal.addEventListener('abort',abort,{once:true});
   try{const value=command.action==='request'?await network.request(relays,command.filters.map(filter=>({...filter,limit:filter.limit??200}))):await network.publish(relays,command.event,{signal,beforeSend:()=>{try{check();return directory.isRelayScopeCurrent(binding,scope);}catch{return false;}}});check();if(!directory.isRelayScopeCurrent(binding,scope))throw fail();return command.action==='request'?{events:value}:{acks:value};}finally{signal.removeEventListener('abort',abort);}
  }finally{network?.close();signer?.close();}
 };
}
