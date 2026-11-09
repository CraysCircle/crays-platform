/** Connects an original conversation URL to a canonical parent's admitted workspace.
 * The URL is a lookup request, never evidence of membership or a VIF connection.
 * No preview identity, keys, signup or fallback transport is created here. */
export function createAdmittedConversationSelection({port,accountId,conversationId,signal}) {
 if(!accountId||!conversationId||conversationId==='chuck'||port?.accountId!==accountId||typeof port.openConversation!=='function'||!port.signal?.addEventListener||!signal?.addEventListener)throw Error('Current canonical human messaging port required');
 const lifetime=new AbortController(),listeners=new Set(),disposed=new WeakSet();
 let closed=false,started=false,workspace=null,unsubscribe=null,opening=Promise.resolve(),closing=Promise.resolve();
 let snapshot=Object.freeze({state:'idle',workspace:null});
 const current=()=>!closed&&!signal.aborted&&!port.signal.aborted;
 const emit=state=>{snapshot=Object.freeze({state,workspace});for(const fn of listeners)fn();};
 const dispose=value=>{if(!value||typeof value!=='object'||disposed.has(value))return;disposed.add(value);let closedWork,settledWork;try{closedWork=value.close?.();}catch{}try{settledWork=value.settled?.();}catch{}closing=Promise.allSettled([closing,closedWork,settledWork]).then(()=>{});};
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);port.signal.removeEventListener('abort',close);unsubscribe?.();unsubscribe=null;dispose(workspace);workspace=null;emit('closed');listeners.clear();};
 signal.addEventListener('abort',close,{once:true});port.signal.addEventListener('abort',close,{once:true});
 if(signal.aborted||port.signal.aborted)close();
 async function acquire(){
  if(!current()){close();return;}emit('loading');
  let expired=false,timer,rejectDeadline;
  const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
  const groupRequest=conversationId.startsWith('circle:')||conversationId.startsWith('spot:');
  if(groupRequest)timer=setTimeout(()=>{
   expired=true;unsubscribe?.();unsubscribe=null;dispose(workspace);workspace=null;
   lifetime.abort();rejectDeadline(Error('Group opening timed out'));
  },15000);
  const bounded=work=>groupRequest?Promise.race([work,deadline]):work;
  try{
   const value=await bounded(Promise.resolve(port.openConversation({accountId,conversationId,signal:lifetime.signal})).then(value=>{
    if(expired){dispose(value);throw Error('Group opening expired');}return value;
   }));
   if(!current()){dispose(value);close();return;}
   const b=value?.binding;
   if(!b||b.accountId!==accountId||b.conversationId!==conversationId||!['person','spot','circle'].includes(b.kind)||!b.groupId||!b.pubkey||typeof value.start!=='function'||typeof value.close!=='function'||typeof value.settled!=='function'||typeof value.subscribe!=='function'||typeof value.getSnapshot!=='function'||!value.signal?.addEventListener||value.signal.aborted){dispose(value);throw Error('Conversation admission mismatch');}
   workspace=value;
   unsubscribe=workspace.subscribe(()=>{if(workspace?.getSnapshot().state==='closed')close();});
   await bounded(workspace.start());
   if(!current()){close();return;}
   if(workspace?.getSnapshot().state==='closed'){close();return;}
   emit('ready');
  }catch{if(current()){unsubscribe?.();unsubscribe=null;dispose(workspace);workspace=null;emit('unavailable');}else close();}finally{clearTimeout(timer);}
 }
 return Object.freeze({getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  start(){if(started)return Promise.reject(Error('Conversation selection already started'));started=true;opening=acquire();return opening;},close,
  async settled(){await opening;let observed;do{observed=closing;await observed;}while(observed!==closing);},
 });
}
