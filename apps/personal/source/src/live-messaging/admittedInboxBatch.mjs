import {OwnedPrivateInboxPeer,unwrapPrivateInboxEvent} from './ownedPrivateInbox.mjs';
import {parsePrivateFileMessage} from './privateFileMessage.mjs';
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const fail=()=>Error('Current admitted inbox required');
/** One real relay read for all independently admitted peers on the same Spot.
 * No seed-text/catalogue summaries and no inferred VIF from shared membership.
 * The canonical server must first admit every row to the current account. */
export async function readAdmittedInboxBatch({identity,admissions,registry,signer,isCurrent,signal,createPeer=options=>new OwnedPrivateInboxPeer(options),decodedCache=new Map(),rumorCache,rumorCacheScope}){
 if(!identity?.accountId||!hex(identity.pubkey)||!Array.isArray(admissions)||!admissions.length||admissions.length>60||typeof isCurrent!=='function'||!signal?.addEventListener)throw fail();
 if(rumorCache&&!rumorCacheScope?.length)throw fail();
 const yieldToChat=()=>new Promise(resolve=>setTimeout(resolve,0));
 const check=()=>{if(signal.aborted||isCurrent()!==true)throw fail();};check();
 const groups=new Map(),ids=new Set();
 for(const row of admissions){if(row.kind!=='person'||!/^person:[a-zA-Z0-9:._-]{1,180}$/.test(row.conversationId)||ids.has(row.conversationId)||!hex(row.peerPubkey)||!hex(row.groupId)||!hex(row.membershipId)||typeof row.spotId!=='string')throw fail();ids.add(row.conversationId);if(!groups.has(row.spotId))groups.set(row.spotId,[]);const g=groups.get(row.spotId);if(g.some(p=>p.peerPubkey===row.peerPubkey))throw fail();g.push(Object.freeze({...row}));}
 if(groups.size>10)throw fail();
 const entries=[],sources=[];let cursor=0;const work=[...groups];
 async function next(){while(cursor<work.length){const [spotId,rows]=work[cursor++];check();let peer;try{
   peer=createPeer({spotId,registry,recipient:identity.pubkey,signer,isCurrent,signal});await peer.ready();check();
   const events=await peer.readInbox({limit:200});check();if(!Array.isArray(events)||events.length>200)throw fail();
   const latest=new Map(),received=new Map(rows.map(r=>[r.peerPubkey,new Map()]));const byPeer=new Map(rows.map(r=>[r.peerPubkey,r]));let rejected=0;
   let processed=0;
   for(const event of events){if(++processed%8===0){await yieldToChat();}check();const address=identity.pubkey+':'+event.id;let message=decodedCache.get(address);
    if(!message){let rumor;try{rumor=rumorCache?await rumorCache.unwrap({scope:[...rumorCacheScope,identity.accountId,identity.pubkey,spotId],event,recipient:identity.pubkey,signer,isCurrent}):await unwrapPrivateInboxEvent({event,recipient:identity.pubkey,signer,isCurrent});}catch{check();rejected++;continue;}
     const recipients=rumor.tags.filter(t=>t[0]==='p');if(recipients.length!==1)continue;
     const peerKey=rumor.pubkey===identity.pubkey?recipients[0][1]:rumor.pubkey;
     if(!byPeer.has(peerKey)||rumor.pubkey!==identity.pubkey&&recipients[0][1]!==identity.pubkey)continue;
     if(rumor.created_at<0||rumor.created_at>253402300799)continue;
     let attachment;try{attachment=rumor.kind===15?parsePrivateFileMessage(rumor):null;}catch{rejected++;continue;}
     message=Object.freeze({peerKey,messageId:rumor.id,createdAt:rumor.created_at,author:rumor.pubkey,text:(attachment?attachment.caption:rumor.content).slice(0,300),...(attachment?{mediaType:attachment.mediaType}:{}),status:rumor.pubkey===identity.pubkey?'sent-to-relay':'received'});
     decodedCache.set(address,message);while(decodedCache.size>4096)decodedCache.delete(decodedCache.keys().next().value);
    }else{decodedCache.delete(address);decodedCache.set(address,message);}
    // Cached metadata is never an admission. Every batch still reads signed
    // originals from the exact authenticated relay and filters the current ACL.
    const peerKey=message.peerKey;if(!byPeer.has(peerKey))continue;
    if(message.author!==identity.pubkey)received.get(peerKey).set(message.messageId,message.createdAt);
    const previous=latest.get(peerKey);if(previous&&(previous.createdAt>message.createdAt||previous.createdAt===message.createdAt&&previous.messageId.localeCompare(message.messageId)>=0))continue;
    const {peerKey:internal,...visible}=message;latest.set(peerKey,visible);
   }
   check();const complete=events.length<200&&rejected===0;sources.push({spotId,state:complete?'ready':'partial',eventsRead:events.length,rejected});
   for(const row of rows)entries.push({conversationId:row.conversationId,groupId:row.groupId,membershipId:row.membershipId,state:complete?'ready':'partial',latest:latest.get(row.peerPubkey)||null,receivedIds:[...received.get(row.peerPubkey).keys()],receivedTimes:[...received.get(row.peerPubkey)].map(([messageId,createdAt])=>({messageId,createdAt}))});
  }catch{check();sources.push({spotId,state:'unavailable'});for(const row of rows)entries.push({conversationId:row.conversationId,groupId:row.groupId,membershipId:row.membershipId,state:'unavailable',latest:null,receivedIds:[]});}
  finally{peer?.close();}
 }}
 await Promise.all([next(),next()]);check();return Object.freeze({entries:Object.freeze(entries),sources:Object.freeze(sources)});
}
