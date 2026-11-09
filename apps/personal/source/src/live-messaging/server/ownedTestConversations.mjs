import {createPrivateRumorCache} from '../privateRumorCache.mjs';
import {readFileSync,lstatSync} from 'node:fs';import {createHash} from 'node:crypto';
import {openExistingFileSigner} from './existingFileSigner.mjs';
import {authorizeCurrentCustodyOperation} from './currentCustodyPolicy.mjs';
import {createOwnedPrivateConversation} from '../ownedPrivateConversation.mjs';
import {openPrivateFileStore} from './privateFileStore.mjs';
import {createPrivateBlossomStore,authorizePrivateBlossomOperation} from './privateBlossomStore.mjs';
import {openPrivateIntentJournal} from './privateIntentJournal.mjs';
import {readAdmittedInboxBatch} from '../admittedInboxBatch.mjs';
const fail=()=>Error('This private conversation is unavailable');
/** Explicit owner-approved seeded TEST connections, independently of Core's
 * real customer contacts. Only the genuine canonical owner may use this index.
 * It never grants a production VIF, a visit, another account or a Marmot group.
 */
export function createOwnedTestConversationResolver({indexPath,journalRoot,fileRoot,blossom=false,assertRuntimeCurrent,contactContext,requestBoundaryRuntimeGuard=false}){
 const fileVersion=()=>{const s=lstatSync(indexPath,{bigint:true});if(!s.isFile()||s.isSymbolicLink())throw fail();return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs,s.mode,s.uid,s.nlink].join(':');};
 const before=fileVersion(),bytes=readFileSync(indexPath),pin=createHash('sha256').update(bytes).digest('hex'),index=JSON.parse(bytes);
 if(index.schema!=='crays.owned-test-conversation-admissions.v1'||index.scope!=='owned-isolated-test-network-only'||index.productionCoreContacts!==false||index.groupAdmission!==false||index.conversations.length!==980)throw fail();
 if(fileVersion()!==before||createHash('sha256').update(readFileSync(indexPath)).digest('hex')!==pin)throw fail();
 const byId=new Map(index.conversations.map(row=>[row.conversationId,row]));if(byId.size!==980)throw fail();
 const urls=new Map(index.registry.map(r=>[r.spotId,r.url])),decodedInboxCache=new Map(),rumorCache=createPrivateRumorCache({maxEntries:4096,maxBytes:16*1024*1024});
 // The canonical HTTP composition already fences original host/config files
 // before and after each read/write. Its request-only opt-in avoids scanning
 // the complete immutable Core payload on every cached rumor/signer predicate.
 // Index, contact-context and private custody-file guards still run each time.
 function sourceCurrent(){if(!requestBoundaryRuntimeGuard)assertRuntimeCurrent();if(fileVersion()!==before)throw fail();contactContext?.assertCurrent();}
 async function authorizeConversation({identity,verifiedBinding,conversationId,signal,operation='read'}){
  assertRuntimeCurrent();sourceCurrent();if(!['read','send','attachment'].includes(operation))throw fail();if(identity.accountId!==index.ownerAccountId||identity.pubkey!==index.ownerPubkey||verifiedBinding?.accountId!==identity.accountId||verifiedBinding.pubkey!==identity.pubkey||verifiedBinding.bindingFingerprint!==identity.bindingFingerprint||verifiedBinding.publicBindingVerified!==true||verifiedBinding.emailVerificationRequired!==false)return null;
  const row=byId.get(conversationId);if(!row)return null;
  const binding=Object.freeze({accountId:identity.accountId,pubkey:identity.pubkey,conversationId,kind:row.kind,groupId:row.groupId,membershipId:row.membershipId});let closed=false,signer,session;
  const current=()=>{try{if(closed||signal.aborted)return false;sourceCurrent();return byId.get(conversationId)===row;}catch{return false;}};
  const close=()=>{if(closed)return;closed=true;session?.close();signer?.close();};
  try{
   signer=openExistingFileSigner({descriptorPath:'/srv/crays/dev-state/01a183ad-4854-7cb2-9518-ad67bf453db4/NOSTR_OWNER_BINDING.json',binding:verifiedBinding,isCurrent:current,signal,authorizeOperation:(b,operation)=>{
    if(!current())return false;
    if(operation.kind==='encrypt')return [identity.pubkey,row.peerPubkey].includes(operation.pubkey)&&authorizeCurrentCustodyOperation(b,operation);
    // A genuine gift wrap has a transient cover pubkey. It is verified by the
    // reader before decryption and never becomes a permitted send recipient.
    if(operation.kind==='decrypt')return authorizeCurrentCustodyOperation(b,operation);
    if(operation.kind==='identity')return authorizeCurrentCustodyOperation(b,operation);
    if(blossom&&authorizePrivateBlossomOperation(b,operation))return true;
    const event=operation.event;
    if(operation.kind==='sign'&&event?.kind===13)return authorizeCurrentCustodyOperation(b,operation);
    return operation.kind==='sign'&&event?.kind===22242&&event.content===''&&Math.abs(event.created_at-Math.floor(Date.now()/1000))<=60&&event.tags.length===2&&JSON.stringify(event.tags[0])===JSON.stringify(['relay',urls.get(row.spotId)])&&event.tags[1]?.[0]==='challenge'&&typeof event.tags[1][1]==='string'&&event.tags[1][1].length>=16&&event.tags[1][1].length<=512;
   }});
   const legacyStore=fileRoot?await openPrivateFileStore(fileRoot):undefined;
   const fileStore=blossom?createPrivateBlossomStore({signer,pubkey:identity.pubkey,isCurrent:current,signal,legacyStore}):legacyStore;if(!current())throw fail();
   const journal=openPrivateIntentJournal({root:journalRoot,binding});
   session=createOwnedPrivateConversation({binding,peerPubkey:row.peerPubkey,spotId:row.spotId,registry:index.registry,signer,isCurrent:current,signal,journal,fileStore,seedIds:row.seedIds,rumorCache,rumorCacheScope:[verifiedBinding.bindingFingerprint,pin],completeInbox:true});
   // Writes and exact attachment reads do not need a complete inbox scan.
   // Their real relay AUTH, reply-original lookup and custody checks still run
   // in send/loadAttachment; Core/current grant is checked before and after.
   if(operation==='read')await session.refresh();else session.prepareCommand();assertRuntimeCurrent();if(!current())throw fail();
   return Object.freeze({...binding,canRead:true,canSend:true,isCurrent:current,session:{getSnapshot:()=>({...session.getSnapshot(),binding,engine:'nip17-existing-individual-thread',...(contactContext&&current()?{contactInfo:contactContext.read({binding,row,isCurrent:current,admittedSpotIds:[...urls.keys()]})}:{})}),loadOlder:command=>session.loadOlder(command),send:command=>session.send(command),loadAttachment:command=>session.loadAttachment(command)},close});
  }catch(error){close();throw error;}
 }
 authorizeConversation.readDestinations=async({identity,verifiedBinding,signal})=>{
  assertRuntimeCurrent();sourceCurrent();if(signal.aborted||identity.accountId!==index.ownerAccountId||identity.pubkey!==index.ownerPubkey||verifiedBinding?.accountId!==identity.accountId||verifiedBinding.pubkey!==identity.pubkey||verifiedBinding.bindingFingerprint!==identity.bindingFingerprint||verifiedBinding.publicBindingVerified!==true||verifiedBinding.emailVerificationRequired!==false||!contactContext)return null;
  const current=()=>{try{if(signal.aborted)return false;sourceCurrent();return true;}catch{return false;}};
  const targets=index.conversations.map(row=>{
   const binding={kind:row.kind,accountId:identity.accountId,pubkey:identity.pubkey,conversationId:row.conversationId,groupId:row.groupId,membershipId:row.membershipId};
   const title=contactContext.title({binding,row,isCurrent:current,admittedSpotIds:[...urls.keys()]});
   return {...binding,title,version:JSON.stringify([row.groupId,row.membershipId])};
  });assertRuntimeCurrent();if(!current())throw fail();return {targets};
 };
 authorizeConversation.readInbox=async({identity,verifiedBinding,cursor=0,signal})=>{
  assertRuntimeCurrent();sourceCurrent();if(identity.accountId!==index.ownerAccountId||identity.pubkey!==index.ownerPubkey||verifiedBinding?.accountId!==identity.accountId||verifiedBinding.pubkey!==identity.pubkey||verifiedBinding.bindingFingerprint!==identity.bindingFingerprint||verifiedBinding.publicBindingVerified!==true||verifiedBinding.emailVerificationRequired!==false)return null;
  if(!Number.isInteger(cursor)||cursor<0||cursor>index.conversations.length||cursor%60!==0)throw fail();
  const rows=index.conversations.slice(cursor,cursor+60),current=()=>{try{if(signal.aborted)return false;sourceCurrent();return true;}catch{return false;}};
  if(!rows.length)return {entries:[],sources:[],nextCursor:null,total:index.conversations.length};
  const signer=openExistingFileSigner({descriptorPath:'/srv/crays/dev-state/01a183ad-4854-7cb2-9518-ad67bf453db4/NOSTR_OWNER_BINDING.json',binding:verifiedBinding,isCurrent:current,signal,authorizeOperation:(binding,operation)=>{
   if(!current())return false;if(['identity','decrypt'].includes(operation.kind))return authorizeCurrentCustodyOperation(binding,operation);
   const event=operation.event;return operation.kind==='sign'&&event?.kind===22242&&event.content===''&&Math.abs(event.created_at-Math.floor(Date.now()/1000))<=60&&event.tags.length===2&&rows.some(r=>JSON.stringify(event.tags[0])===JSON.stringify(['relay',urls.get(r.spotId)]))&&event.tags[1]?.[0]==='challenge'&&typeof event.tags[1][1]==='string'&&event.tags[1][1].length>=16&&event.tags[1][1].length<=512;
  }});
  try{const result=await readAdmittedInboxBatch({identity,admissions:rows,registry:index.registry,signer,isCurrent:current,signal,decodedCache:decodedInboxCache,rumorCache,rumorCacheScope:[verifiedBinding.bindingFingerprint,pin]});assertRuntimeCurrent();if(!current())throw fail();return {...result,nextCursor:cursor+60<index.conversations.length?cursor+60:null,total:index.conversations.length};}finally{signer.close();}
 };
 return authorizeConversation;
}
