/** Owns the lifetime of one existing human conversation's actual transport ports.
 * authorize and openConversation MUST come from the canonical parent/server admission.
 * This module grants neither a Core identity, VIF connection nor shared-Spot access.
 * Chuck uses its existing separate parent and is deliberately rejected here. */
export function createHumanConversationWorkspace({binding:input,signal,authorize,openConversation,openCalls}){
 const binding=Object.freeze({...input});
 if(!['person','circle','spot'].includes(binding.kind)||!binding.accountId||!binding.conversationId||!binding.groupId||!binding.pubkey||typeof authorize!=='function'||typeof openConversation!=='function'||!signal?.addEventListener)throw Error('Current admitted human conversation required');
 const lifetime=new AbortController(),listeners=new Set(),disposed=new WeakSet();let closed=false,started=false,resources=null,call=null,snapshot=Object.freeze({state:'idle',client:null,media:null,call:null,problem:null}),closeWork=Promise.resolve(),startWork=Promise.resolve();
 const current=()=>!closed&&!signal.aborted&&!lifetime.signal.aborted&&authorize(binding)===true;
 const emit=(state,problem=null)=>{snapshot=Object.freeze({state,client:resources?.client??null,media:resources?.media??null,group:resources?.group??null,invitations:resources?.invitations??null,departure:resources?.departure??null,call,problem});for(const fn of listeners)fn();};
 const dispose=resource=>{if(!resource||typeof resource!=='object'||disposed.has(resource))return;disposed.add(resource);try{const result=resource.close();closeWork=Promise.allSettled([closeWork,result]).then(()=>{});}catch{ /* Resource teardown must not prevent account revocation of other ports. */ }};
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);dispose(call);dispose(resources);call=null;resources=null;emit('closed');listeners.clear();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 async function acquire(){
   if(started)throw Error('Human conversation workspace already started');started=true;if(!current()){close();return;}emit('loading');
   try{
    const opened=await openConversation({binding,signal:lifetime.signal});
    if(!current()){dispose(opened);close();return;}
    if(!opened?.client?.getSnapshot||!opened.client.subscribe||typeof opened.close!=='function'){dispose(opened);throw Error('Actual conversation transport unavailable');}
    if(binding.kind==='person'&&(opened.group||opened.invitations||opened.departure)){dispose(opened);throw Error('Group controls require an admitted group conversation');}
    resources=opened;emit('ready');
    // Current implementation admits calls only to an explicitly selected person.
    // A group/Spot membership alone never activates pair calls or a group-call mesh.
    if(binding.kind==='person'&&typeof openCalls==='function'){
     try{const openedCall=await openCalls({binding,signal:lifetime.signal});if(!current()){dispose(openedCall);close();return;}if(openedCall){if(typeof openedCall.getSnapshot!=='function'||typeof openedCall.close!=='function'){dispose(openedCall);throw Error('Actual call transport unavailable');}call=openedCall;emit('ready');}}
     catch{if(current())emit('ready','Calls are unavailable. Your conversation is still open.');else close();}
    }
   }catch{if(current()){dispose(resources);resources=null;emit('unavailable','This conversation could not be opened.');}else close();}
  }
 const port=Object.freeze({binding,signal:lifetime.signal,getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(started)return Promise.reject(Error('Human conversation workspace already started'));startWork=acquire();return startWork;},
  recheck(){if(!current())close();},close,async settled(){await startWork.catch(()=>{});let observed;do{observed=closeWork;await observed;}while(observed!==closeWork);},
 });return port;
}
