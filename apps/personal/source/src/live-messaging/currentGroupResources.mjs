import {createGroupConnectionGate} from './groupConnectionGate.mjs';
import {Proposals} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/index.js';
import {createInviteIntent} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/group/invite.js';
import {verifyEvent} from 'nostr-tools';
import {openCurrentTextResources} from './currentTextResources.mjs';
import {createMembershipJournal} from './membershipJournal.mjs';
import {openPrivateGroupController} from './privateGroupController.mjs';
import {openPrivateGroupInvitations} from './privateGroupInvitations.mjs';
import {openPrivateGroupDeparture} from './privateGroupDeparture.mjs';

/** The canonical parent supplies an independent current group grant, eligible
 * people and permitted key-package lookup. Neither MLS membership nor a relay
 * creates a VIF connection. Network publication must retain its existing gate.
 */
export async function openCurrentGroupResources(options){
 const {binding,group,client,stores,signal,isCurrent,origin,authorizeGroup,candidates,resolvePackage,recovery}=options;
 if(!['spot','circle'].includes(binding?.kind)||binding.groupId!==group?.idStr||![authorizeGroup,candidates,resolvePackage,isCurrent].every(fn=>typeof fn==='function'))throw Error('Independent current group admission required');
 const lifetime=new AbortController();let closed=false,text,control,invitations,departure,connection,closing;
 const current=()=>{try{return !closed&&!signal.aborted&&isCurrent()===true&&authorizeGroup(binding,'read')===true&&group.status==='active'&&!group.closedSignal.aborted&&group.snapshot.members.includes(binding.pubkey);}catch{return false;}};
 const allowed=(b,action,target)=>current()&&(action==='read'||connection?.ready()===true)&&authorizeGroup(b,action,target)===true;
 const check=()=>{if(!current())throw Error('Group access is no longer available');};
 const journal=createMembershipJournal({journal:stores.conversationStore,groupId:binding.groupId,membershipId:binding.membershipId,origin,isCurrent:current});
 function close(){
  closed=true;lifetime.abort();signal.removeEventListener('abort',close);connection?.close();control?.close();invitations?.close();departure?.close();
  closing=Promise.allSettled([closing,Promise.resolve().then(()=>text?.close()),connection?.settled()]).then(()=>journal.close());return closing;
 }
 signal.addEventListener('abort',close,{once:true});
 try{
  check();text=await openCurrentTextResources({...options,signal:lifetime.signal,isCurrent:current,connect:false});check();
  control=await openPrivateGroupController({binding,group,client,journal,authorize:allowed,signal:lifetime.signal,recovery,proposals:{rename:name=>Proposals.proposeUpdateMetadata({name}),remove:pubkey=>Proposals.proposeRemoveUser(pubkey),admins:adminPubkeys=>Proposals.proposeUpdateMetadata({adminPubkeys})}});check();
  invitations=await openPrivateGroupInvitations({binding,group,journal,authorize:allowed,signal:lifetime.signal,candidates,resolvePackage,makeIntent:(event,actorPubkey)=>createInviteIntent({keyPackageEvent:event,actorPubkey,verifyEvent}),send:async intent=>{check();const results=await client.groups.send(group.id,intent);check();return results[0];}});check();
  departure=await openPrivateGroupDeparture({binding,group,journal,authorize:allowed,signal:lifetime.signal,send:async({isCurrent:canLeave})=>{check();if(!canLeave()||!allowed(binding,'leave'))throw Error('Group departure is no longer permitted');return client.groups.leave(group.id);}});check();
  connection=createGroupConnectionGate({connect:()=>client.groups.connect(group.id,{signal:lifetime.signal,backfillPageSize:200}),isCurrent:current,signal:lifetime.signal,onChange:()=>{control?.recheck();invitations?.recheck();departure?.recheck();}});
  // Already admitted durable history can render independently of network
  // catch-up. The gate keeps text/media writes and every group mutation off
  // until the actual SDK backfill/subscription succeeds. Failure remains
  // visible and retryable; it never becomes a fabricated connected state.
  void connection.start().catch(()=>{});check();
  return Object.freeze({...text,client:connection.guard(text.client),...(text.media?{media:connection.guard(text.media)}:{}),group:control,invitations,departure,close});
 }catch(error){await close();throw error;}
}
