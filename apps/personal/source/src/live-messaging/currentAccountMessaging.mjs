import {validBoundGroupId} from './groupStorageFormat.mjs';
import {validHumanConversationId,matchingHumanConversationAddress} from './humanConversationAddress.mjs';
import {openCurrentAccountSigner} from './currentAccountSigner.mjs';
import {createHumanConversationWorkspace} from './humanConversationWorkspace.mjs';

const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const unavailable=()=>Error('Current admitted messaging account required');
// Preserve class-based port receivers as well as closure-based clients.
const bindPort=(value,keys,overrides)=>Object.freeze(Object.fromEntries([...keys.filter(key=>key in value).map(key=>[key,typeof value[key]==='function'?value[key].bind(value):value[key]]),...Object.entries(overrides)]));

/** Compose the original account, an explicitly supplied existing key handle,
 * independent human-conversation admission and the existing desktop workspace.
 * The admission owner must supply actual resources; no fixture/local-world or
 * Chuck fallback is installed. Public identity or key access alone grants no chat.
 */
export async function openCurrentAccountMessaging(options){
 const {accountId,isCurrent,admitConversation,prepareConversation}=options;
 if(options.startGroupBeforeReturn!==undefined&&typeof options.startGroupBeforeReturn!=='boolean'||typeof admitConversation!=='function'||prepareConversation!==undefined&&typeof prepareConversation!=='function')throw unavailable();
 const account=await openCurrentAccountSigner(options);
 const pending=new Set(),owned=new Set();let closed=false,settling=Promise.resolve();
 const current=()=>{try{return !closed&&!account.signal.aborted&&isCurrent(accountId)===true;}catch{return false;}};
 const collect=work=>{settling=Promise.allSettled([settling,work]).then(()=>{});};
 function close(){if(closed)return;closed=true;account.signal.removeEventListener('abort',close);for(const cancel of [...pending])cancel();for(const workspace of [...owned])workspace.close();account.close();}
 account.signal.addEventListener('abort',close,{once:true});
 if(account.signal.aborted)close();
 function assertAccount(){if(!current()){close();throw unavailable();}}

 async function openConversation(request){
  assertAccount();
  const {conversationId,signal}=request;
  if(request.accountId!==accountId||!validHumanConversationId(conversationId)||!signal?.addEventListener||signal.aborted)throw unavailable();
  const lifetime=new AbortController();let workspace=null,released=false;
  const cancel=()=>{lifetime.abort();workspace?.close();};
  signal.addEventListener('abort',cancel,{once:true});account.signal.addEventListener('abort',cancel,{once:true});pending.add(cancel);
  const release=()=>{if(released)return;released=true;signal.removeEventListener('abort',cancel);account.signal.removeEventListener('abort',cancel);pending.delete(cancel);};
  const assertRequest=()=>{assertAccount();lifetime.signal.throwIfAborted();};
  async function wait(work){
   assertRequest();let listener,timer;
   const stopped=new Promise((resolve,reject)=>{listener=()=>reject(unavailable());lifetime.signal.addEventListener('abort',listener,{once:true});timer=setTimeout(()=>{cancel();reject(unavailable());},20000);});
   try{return await Promise.race([work,stopped]);}finally{clearTimeout(timer);lifetime.signal.removeEventListener('abort',listener);}
  }
  try{
   // An optional same-account metadata preflight may run beside the fresh
   // signer identity read. Neither result grants access: both must complete
   // before admission may load any conversation state. Private resource and
   // provider operations retain their independent before/after checks below.
   const preflight=prepareConversation===undefined?(await wait(account.signer.getPublicKey()),undefined):
    (await Promise.all([wait(account.signer.getPublicKey()),wait(prepareConversation({identity:account.identity,conversationId,signal:lifetime.signal}))]))[1];assertRequest();
   const grant=await wait(admitConversation({identity:account.identity,signer:account.signer,conversationId,signal:lifetime.signal,preflight}));assertRequest();
   if(!grant||grant.accountId!==accountId||grant.pubkey!==account.identity.pubkey||grant.bindingFingerprint!==account.identity.bindingFingerprint||grant.conversationId!==conversationId||!matchingHumanConversationAddress(grant)||!validBoundGroupId(grant)||!hex(grant.membershipId)||grant.canRead!==true||typeof grant.canSend!=='boolean'||typeof grant.isCurrent!=='function'||typeof grant.openResources!=='function')throw unavailable();
   const binding=Object.freeze({kind:grant.kind,accountId,conversationId,pubkey:account.identity.pubkey,groupId:grant.groupId,membershipId:grant.membershipId,...(grant.storageFormat?{storageFormat:grant.storageFormat}:{})});
   const allowed=()=>{try{return current()&&!lifetime.signal.aborted&&grant.isCurrent(binding)===true;}catch{return false;}};
   const assertGrant=()=>{assertRequest();if(!allowed())throw unavailable();};
   // A group may open its private resources in this same admission call.
   // In that case resources() below performs the fresh BEFORE and AFTER
   // identity checks itself; do not add an identical intervening metadata RPC.
   // Deferred callers keep their original check and lazy private start.
   const eagerGroup=options.startGroupBeforeReturn===true;
   if(eagerGroup&&binding.kind==='person')throw unavailable();
   if(!eagerGroup)await wait(account.signer.getPublicKey());assertGrant();
   const admittedSend=grant.canSend===true;
   const canSend=()=>admittedSend&&grant.canSend===true&&allowed();
   const sendAllowed=()=>{assertGrant();if(!canSend())throw unavailable();};
   const closedText=Object.freeze({state:'closed',available:false,messages:Object.freeze([]),sending:false,canSend:false,problem:null});
   const closedMedia=Object.freeze({available:false,rows:Object.freeze([]),sending:false,canSend:false});
   const protectResources=value=>{
    const client=value?.client;if(typeof value?.close!=='function'||['getSnapshot','subscribe','refresh','prepareAttempt','acknowledgeAttempt','send','close'].some(key=>typeof client?.[key]!=='function'))throw unavailable();let source=null,snapshot=null,sendState=null;
    const guardedClient=bindPort(client,['localView','flushLocalView','subscribe','refresh','loadOlder','pinReplyOriginal','clearReplyOriginal','isPinnedReplyOriginal','showLatest','acknowledgeAttempt','close'],{getSnapshot(){if(!allowed())return closedText;const next=client.getSnapshot(),send=canSend()&&next.canSend!==false;if(next!==source||send!==sendState){source=next;sendState=send;snapshot=Object.freeze({...next,canSend:send});}return snapshot;},
     async prepareAttempt(...args){sendAllowed();const result=await client.prepareAttempt(...args);sendAllowed();return result;},
     async send(...args){sendAllowed();const result=await client.send(...args);sendAllowed();return result;}});
    let media=value.media;
    if(media){if(['getSnapshot','subscribe','adoptHistory','send','load','flush','close'].some(key=>typeof media[key]!=='function'))throw unavailable();const original=media;let source=null,snapshot=null,sendState=null;media=bindPort(original,['subscribe','adoptHistory','flush','close'],{getSnapshot(){if(!allowed())return closedMedia;const next=original.getSnapshot(),send=canSend()&&next.canSend!==false;if(next!==source||send!==sendState){source=next;sendState=send;snapshot=Object.freeze({...next,canSend:send});}return snapshot;},
     async send(...args){sendAllowed();const result=await original.send(...args);sendAllowed();return result;},
     ...(typeof original.resumeSend==='function'?{async resumeSend(...args){sendAllowed();const result=await original.resumeSend(...args);sendAllowed();return result;}}:{}),
     async load(...args){assertGrant();const result=await original.load(...args);try{assertGrant();return result;}catch(error){result.data?.fill(0);throw error;}}});}
    return {...value,close:value.close.bind(value),client:guardedClient,...(media?{media}:{})};
   };
   // Materialise only after account and exact independent membership admission.
   // A late resource is disposed even if its provider ignores cancellation.
   const resources=async(factory,context)=>{
    assertGrant();await wait(account.signer.getPublicKey());assertGrant();let value;
    try{
     value=await wait(Promise.resolve().then(()=>{assertGrant();return factory({...context,binding,signer:account.signer});}).then(opened=>{if(!allowed()){try{collect(opened?.close?.());}catch{}throw unavailable();}return opened;}));
     assertGrant();await wait(account.signer.getPublicKey());assertGrant();return value;
    }catch(error){if(value){try{collect(value.close?.());}catch{}}throw error;}
   };
   workspace=createHumanConversationWorkspace({binding,signal:lifetime.signal,authorize:allowed,
    openConversation:async context=>{const value=await resources(grant.openResources.bind(grant),context);try{return protectResources(value);}catch(error){try{collect(value?.close?.());}catch{}throw error;}},
    openCalls:binding.kind==='person'&&grant.canCall===true&&typeof grant.openCalls==='function'?context=>resources(grant.openCalls.bind(grant),context):undefined});
   const original=workspace;
   let eagerStart;
   const wrapped=Object.freeze({...original,...(eagerGroup?{start:()=>eagerStart??(eagerStart=original.start())}:{}),close(){lifetime.abort();original.close();owned.delete(wrapped);release();collect(original.settled());}});
   // The original workspace may close itself on membership invalidation.
   const unsubscribe=original.subscribe(()=>{if(original.getSnapshot().state==='closed'){unsubscribe();owned.delete(wrapped);release();collect(original.settled());}});
   workspace=wrapped;owned.add(wrapped);pending.delete(cancel);assertGrant();
   if(eagerGroup){await wait(wrapped.start());assertGrant();if(wrapped.getSnapshot().state!=='ready')throw unavailable();}
   return wrapped;
  }catch(error){cancel();release();throw error;}
 }
 return Object.freeze({accountId,identity:account.identity,signer:account.signer,signal:account.signal,openConversation,close,
  async settled(){let observed;do{observed=settling;await observed;}while(observed!==settling);}});
}
