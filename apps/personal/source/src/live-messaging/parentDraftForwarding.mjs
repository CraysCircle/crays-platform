import {validMessageText} from './messageLimits.mjs';
import {validReplyId} from './conversationReply.mjs';
import {FORWARD_CATALOG_MAX_TARGETS} from './conversationCatalogLimits.mjs';

/** A canonical parent adapter, not an admission provider. Every target, composer,
 * permission decision and original navigation callback must be supplied by that
 * parent. No signer, transport, key generation or send method is accepted. */
export function createParentDraftForwardingPort({accountId,signal,catalog,currentSource,authorize,getComposer,prepareComposer,attachmentState,open}){
 if(typeof accountId!=='string'||!accountId||accountId.length>200||!signal?.addEventListener||!catalog?.getSnapshot||!catalog.subscribe||typeof currentSource!=='function'||typeof authorize!=='function'||typeof getComposer!=='function'||typeof attachmentState!=='function'||typeof open!=='function')throw Error('Canonical forwarding parent required');
 if(prepareComposer!==undefined&&typeof prepareComposer!=='function')throw Error('Original composer preparation required');
 const lifetime=new AbortController(),listeners=new Set(),controllerIds=new WeakMap(),staged=new Map();let observed=null;
 const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
 const unavailable=Object.freeze({available:false,targets:Object.freeze([])});
 let closed=false,updating=false,pending=false,serial=0,snapshot=unavailable,unsubscribeCatalog;
 const bounded=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
 const bindingValid=b=>b&&['person','spot','circle'].includes(b.kind)&&b.accountId===accountId&&bounded(b.conversationId,200)&&!['chuck','person:chuck'].includes(b.conversationId)&&['groupId','pubkey','membershipId'].every(k=>validReplyId(b[k]));
 const sameBinding=(a,b)=>!!a&&!!b&&fields.every(k=>a[k]===b[k]);
 const live=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted;
 const source=()=>{if(!live())throw Error('Messaging access changed.');const b=currentSource();if(!bindingValid(b)||authorize(b,'source')!==true)throw Error('Current original source is no longer admitted.');return Object.freeze(Object.fromEntries(fields.map(k=>[k,b[k]])));};
 const rows=()=>{
  const value=catalog.getSnapshot();
  if(!value?.available||!Array.isArray(value.targets)||value.targets.length>FORWARD_CATALOG_MAX_TARGETS)throw Error('Current destination catalog unavailable.');
  const ids=new Set();
  return value.targets.map(row=>{
   if(!bindingValid(row)||!bounded(row.title,200)||!bounded(row.version,1000)||ids.has(row.conversationId))throw Error('Current destination catalog needs review.');
   ids.add(row.conversationId);return Object.freeze({...Object.fromEntries(fields.map(k=>[k,row[k]])),title:row.title,version:row.version});
  });
 };
 const resolve=row=>{
  if(!live()||authorize(row,'destination')!==true)throw Error('Destination is no longer admitted.');
  const controller=getComposer(row),view=controller?.getSnapshot?.();
  if(!controller||!sameBinding(controller.binding,row)||!controller.signal?.addEventListener||controller.signal.aborted||!controller.subscribe||!controller.set||!view?.available||!Number.isSafeInteger(view.version)||view.version<0)throw Error('Original destination composer unavailable.');
  if(!controllerIds.has(controller))controllerIds.set(controller,++serial);
  return{row,controller,view};
 };
 const attachments=row=>{const value=attachmentState(row);if(!value||typeof value.hasAttachments!=='boolean'||!bounded(value.version,200))throw Error('Current attachment state unavailable.');return Object.freeze({hasAttachments:value.hasAttachments,version:value.version});};
 const targetRow=(id,expected)=>{source();const row=rows().find(row=>row.conversationId===id&&row.version===expected);if(!row)throw Error('Destination admission changed.');if(authorize(row,'destination')!==true)throw Error('Destination is no longer admitted.');return row;};
 const stopObserving=()=>{observed?.off();observed=null;};
 const observe=entry=>{
  if(observed?.controller===entry.controller&&sameBinding(observed.row,entry.row)&&observed.row.version===entry.row.version)return;
  stopObserving();const changed=()=>update(),off=entry.controller.subscribe(changed);entry.controller.signal.addEventListener('abort',changed);
  observed={...entry,off:()=>{off();entry.controller.signal.removeEventListener('abort',changed);}};
 };
 const find=(id,expected)=>{const entry=resolve(targetRow(id,expected));observe(entry);return entry;};
 const draftFor=entry=>{const a=attachments(entry.row),v=entry.controller.getSnapshot();if(!v.available||v.problem||v.conflict||!validMessageText(v.text)||v.replyTo!==null&&!validReplyId(v.replyTo))throw Error('Resolve the destination draft save problem before forwarding.');return Object.freeze({text:v.text,replyTo:v.replyTo,hasAttachments:a.hasAttachments,version:JSON.stringify([controllerIds.get(entry.controller),v.version,a.version])});};
 function update(){
  if(updating){pending=true;return;}
  updating=true;
  let keepObserved=false;
  try{
   source();const targets=[];
   for(const row of rows()){
    // Listing rights metadata must never open a controller, key or MLS session.
    if(authorize(row,'destination')!==true)continue;
    if(observed&&sameBinding(observed.row,row)&&observed.row.version===row.version&&!observed.controller.signal.aborted)keepObserved=true;
    targets.push(Object.freeze({conversationId:row.conversationId,title:row.title,kind:row.kind,version:row.version}));
   }
   snapshot=Object.freeze({available:true,targets:Object.freeze(targets)});
  }catch{snapshot=unavailable;}
  finally{
   if(!keepObserved)stopObserving();
   updating=false;for(const fn of listeners)fn();
   if(pending){pending=false;queueMicrotask(()=>{if(live())update();});}
  }
 }
 function close(){if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);unsubscribeCatalog?.();stopObserving();staged.clear();snapshot=unavailable;for(const fn of listeners)fn();listeners.clear();}
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();else{unsubscribeCatalog=catalog.subscribe(update);if(live())update();else unsubscribeCatalog?.();}
 const port=Object.freeze({accountId,signal:lifetime.signal,
  getSnapshot(){try{source();return snapshot;}catch{return unavailable;}},
  subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
  getDraft(id,expectedTargetVersion){return draftFor(find(id,expectedTargetVersion));},
  async prepareDraft(id,expectedTargetVersion,operationSignal){
   if(!operationSignal?.addEventListener||operationSignal.aborted)throw Error('Destination preparation cancelled.');
   const from=source(),row=targetRow(id,expectedTargetVersion),operation=new AbortController();
   const abort=()=>operation.abort();lifetime.signal.addEventListener('abort',abort);operationSignal.addEventListener('abort',abort);
   try{
    if(!live()||operationSignal.aborted)abort();
    if(operation.signal.aborted)throw Error('Destination preparation cancelled.');
    // The parent hydrates only this explicitly selected admitted composer. It
    // owns cancellation and storage; we never create or destroy a shared draft.
    if(prepareComposer)await prepareComposer(row,operation.signal);
    if(operation.signal.aborted||!sameBinding(source(),from))throw Error('Source or destination changed.');
    const current=targetRow(id,expectedTargetVersion);
    if(!sameBinding(current,row))throw Error('Destination admission changed.');
    const result=draftFor(find(id,expectedTargetVersion));
    if(operation.signal.aborted||!sameBinding(source(),from)||!sameBinding(targetRow(id,expectedTargetVersion),row))throw Error('Source or destination changed.');
    return result;
   }finally{lifetime.signal.removeEventListener('abort',abort);operationSignal.removeEventListener('abort',abort);}
  },
  stageDraft(request){
   const from=source();
   if(!request||request.accountId!==accountId||request.sourceConversationId!==from.conversationId||request.sourceConversationId===request.conversationId||request.replyTo!==null||request.preserveAttachments!==true||!validMessageText(request.text)||!request.text.trim())throw Error('Review one bounded text copy from the original source.');
   const entry=find(request.conversationId,request.expectedTargetVersion),before=draftFor(entry);
   if(entry.row.pubkey!==from.pubkey||before.version!==request.expectedDraftVersion||(before.text||before.replyTo)&&request.replace!==true)throw Error('Destination draft changed or replacement is unconfirmed.');
   const rechecked=find(request.conversationId,request.expectedTargetVersion);
   if(rechecked.controller!==entry.controller||draftFor(rechecked).version!==before.version||!sameBinding(source(),from)||authorize(entry.row,'destination')!==true)throw Error('Source, destination or draft changed. Review it again.');
   const version=entry.controller.set({text:request.text,replyTo:null}),after=entry.controller.getSnapshot();
   if(!after.available||after.version!==version||after.text!==request.text||after.replyTo!==null)throw Error('The destination draft changed during staging. Check that conversation.');
   staged.set(request.conversationId,{source:from,row:entry.row,controller:entry.controller,version,draftVersion:draftFor(entry).version});
   return Object.freeze({status:'draft-ready',conversationId:request.conversationId});
  },
  open(id){
   const ticket=staged.get(id);if(!ticket)throw Error('Review and stage this original destination first.');
   const entry=find(id,ticket.row.version),view=entry.controller.getSnapshot();
   if(entry.controller!==ticket.controller||view.version!==ticket.version||draftFor(entry).version!==ticket.draftVersion||view.problem||view.conflict||!sameBinding(source(),ticket.source)||authorize(entry.row,'open')!==true)throw Error('The prepared destination or draft changed. Nothing was sent.');
   staged.delete(id);open(id);
  },
 });
 return Object.freeze({port,close});
}
