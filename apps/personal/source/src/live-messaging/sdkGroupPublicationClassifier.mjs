import {welcomeContextDigest} from './welcomeContextDigest.mjs';
// Candidate-only pinned SDK bridge. Private pending MLS states stay inside this
// closure; the network gate receives public routing and state fingerprints only.
import {PendingPublicationStore} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/runtime/pending-publication.js';
import {mediaSourceStateToken,getMarmotGroupView,getGroupMemberPubkeys,createWelcomeRumor} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/core/index.js';
export async function groupChangeDigest(change){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([change.type,change.value])));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
async function intentDigest(work){
 const before=getMarmotGroupView(work.pending.parentState),after=getMarmotGroupView(work.pending.newState);if(!before||!after)return undefined;
 const oldMembers=getGroupMemberPubkeys(work.pending.parentState).sort(),newMembers=getGroupMemberPubkeys(work.pending.newState).sort();
 const metadata=view=>{const {imageSource,...rest}=view;return rest;};
 const old=metadata(before),next=metadata(after);
 if(JSON.stringify(oldMembers)===JSON.stringify(newMembers)&&old.name!==next.name&&JSON.stringify({...old,name:next.name})===JSON.stringify(next))return groupChangeDigest({type:'rename',value:next.name});
 if(JSON.stringify(oldMembers)===JSON.stringify(newMembers)&&JSON.stringify({...old,adminPubkeys:next.adminPubkeys})===JSON.stringify(next)){
  const added=next.adminPubkeys.filter(key=>!old.adminPubkeys.includes(key)),demoted=old.adminPubkeys.filter(key=>!next.adminPubkeys.includes(key));
  if(added.length===1&&demoted.length===0&&oldMembers.includes(added[0]))return groupChangeDigest({type:'promote',value:added[0]});
  if(demoted.length===1&&added.length===0&&next.adminPubkeys.some(key=>newMembers.includes(key)))return groupChangeDigest({type:'demote',value:demoted[0]});
 }
 const removed=oldMembers.filter(key=>!newMembers.includes(key));
 if(removed.length===1&&newMembers.every(key=>oldMembers.includes(key))&&JSON.stringify({...old,adminPubkeys:old.adminPubkeys.filter(key=>key!==removed[0])})===JSON.stringify(next))return groupChangeDigest({type:'remove',value:removed[0]});
 return undefined;
}
export function createSdkGroupPublicationClassifier({rewindStore,pubkey,isCurrent,authorizeInvite=()=>false}){
 const groups=new Map();
 return Object.freeze({
  register(group){if(!isCurrent()||!group?.idStr||groups.size>=64)throw Error('Current bounded SDK group required');groups.set(group.idStr,group);},
  unregister(groupId){groups.delete(groupId);},
  canSend(event){if(!isCurrent())return false;if(event?.kind!==445)return true;const routing=(event.tags??[]).filter(tag=>tag[0]==='h');if(routing.length!==1||routing[0].length!==2)return false;return [...groups.values()].some(group=>{const value=group.snapshot.groupData?.nostrGroupId,hex=typeof value==='string'?value:value instanceof Uint8Array?Array.from(value,b=>b.toString(16).padStart(2,'0')).join(''):null;return hex===routing[0][1]&&group.status==='active'&&!group.closedSignal?.aborted&&group.snapshot.members.includes(pubkey);});},
  canPublish({groupId,invitees=[]}){const group=groups.get(groupId);return isCurrent()&&group?.status==='active'&&!group.closedSignal?.aborted&&group.snapshot.members.includes(pubkey)&&group.snapshot.groupData?.adminPubkeys.includes(pubkey)===true&&invitees.every(target=>authorizeInvite(target)===true);},
  async classify(event){
   if(!isCurrent())throw Error('SDK publication account no longer current');
   if(event?.kind!==445)return null;
   for(const group of groups.values()){
    const routing=group.snapshot.groupData?.nostrGroupId;
    const hex=typeof routing==='string'?routing:routing instanceof Uint8Array?Array.from(routing,b=>b.toString(16).padStart(2,'0')).join(''):null;
    if(!hex||!event.tags?.some(tag=>tag[0]==='h'&&tag[1]===hex))continue;
    const record=await new PendingPublicationStore(rewindStore,group.idStr).read();
    if(!isCurrent())throw Error('SDK publication account no longer current');
    if(!record||record.work.envelope.id!==event.id)continue;
    if(record.work.kind!=='groupEvolution')return null;
    if(record.work.actorPubkey!==pubkey)throw Error('Pending SDK actor mismatch');
    return{groupId:group.idStr,parentToken:mediaSourceStateToken(record.work.pending.parentState),actorPubkey:pubkey,invitees:(record.work.welcomeRecipients??[]).map(row=>row.pubkey),invitations:await Promise.all((record.work.welcomeRecipients??[]).map(async row=>({pubkey:row.pubkey,keyPackageEventId:row.keyPackageEventId,welcomeDigest:await welcomeContextDigest({welcomeRumor:createWelcomeRumor({welcome:record.work.welcome.welcome,author:pubkey,groupRelays:record.relays,keyPackageEventId:row.keyPackageEventId}),recipient:row,author:pubkey})}))),intentDigest:await intentDigest(record.work)};
   }
   return null;
  },
  async retryOriginal({group,entry,gate,signal}){
   if(!isCurrent()||signal.aborted||!groups.has(group.idStr))throw Error('Current group recovery required');
   const digest=await groupChangeDigest(entry),row=gate.inspect(group.idStr);
   if(!isCurrent()||signal.aborted||!row||row.parentToken!==entry.expectedParent||row.intentDigest!==digest)throw Error('Exact original group change unavailable');
   if(row.state==='acknowledged')return{status:'sent-to-relay'};
   const pending=await new PendingPublicationStore(rewindStore,group.idStr).read();
   if(!pending||pending.work.envelope.id!==row.eventId)throw Error('Original pending publication unavailable');
   const descriptor=await this.classify(pending.work.envelope);
   if(!isCurrent()||signal.aborted||descriptor?.parentToken!==entry.expectedParent||descriptor?.intentDigest!==digest)throw Error('Original publication differs from reviewed change');
   gate.permitOriginalRetry(row);
   await group.retryPendingPublication();
   if(!isCurrent()||signal.aborted)throw Error('Group recovery no longer current');
   return{status:gate.inspect(group.idStr)?.state==='acknowledged'?'sent-to-relay':'unconfirmed'};
  },
  close(){groups.clear();},
 });
}
