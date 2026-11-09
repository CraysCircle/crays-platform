export const CONVERSATION_TIMER_SECONDS=Object.freeze([0,86400,604800,7776000]);
export const conversationTimerLabel=seconds=>({0:'Off',86400:'24 hours',604800:'7 days',7776000:'90 days'})[seconds]??'Unknown';
const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
const denied=()=>Error('Your message timer is unavailable.');
/** Original CRAYS local-view timer, backed by the current account's encrypted
 * journal. No relay delete, peer setting, global retention or group policy is
 * inferred from changing this private presentation preference. */
export async function openConversationTimer({binding,journal,exclusive,authorize,signal,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 if(!binding||fields.some(k=>typeof binding[k]!=='string'||!binding[k])||typeof journal?.getItem!=='function'||typeof journal?.setItem!=='function'||typeof exclusive!=='function'||typeof authorize!=='function'||!signal?.addEventListener||typeof now!=='function'||typeof wait!=='function')throw denied();
 binding=Object.freeze({...binding});const scope=JSON.stringify(fields.map(k=>binding[k])),address='crays.private-conversation-timer.v1:'+scope,listeners=new Set();let closed=false,busy=false,snapshot,channel,pendingRemote=false;
 const current=()=>!closed&&!signal.aborted&&authorize(binding)===true,check=()=>{if(!current())throw denied();};
 const emit=()=>{for(const listener of listeners)listener();};
 const read=value=>{
  if(value===null)return {version:1,scope,changes:[],revision:0};
  if(value?.version!==1||value.scope!==scope||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.changes)||value.changes.length>2000||value.changes.some((c,i)=>!c||Object.keys(c).sort().join(',')!=='at,seconds'||!Number.isSafeInteger(c.at)||c.at<=0||!CONVERSATION_TIMER_SECONDS.includes(c.seconds)||i>0&&c.at<value.changes[i-1].at))throw Error('Your saved message timer needs review.');
  return value;
 };
 const project=(value,problem=null)=>Object.freeze({available:true,seconds:value.changes.at(-1)?.seconds??0,changes:Object.freeze(value.changes.map(c=>Object.freeze({...c}))),revision:value.revision,saving:false,problem});
 const close=()=>{if(closed)return;closed=true;snapshot=Object.freeze({available:false,seconds:0,changes:Object.freeze([]),revision:0,saving:false,problem:null});signal.removeEventListener('abort',close);channel?.close();emit();listeners.clear();};
 signal.addEventListener('abort',close,{once:true});
 try{check();snapshot=project(read(await journal.getItem(address)));check();}catch(error){close();throw error;}
 if(typeof window!=='undefined'&&typeof globalThis.BroadcastChannel==='function'){
  try{const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope)));check();channel=new BroadcastChannel('crays.message-timer:'+Array.from(digest,b=>b.toString(16).padStart(2,'0')).join(''));channel.onmessage=async event=>{if(!current()||event.data?.version!==1||!Number.isSafeInteger(event.data.revision)||event.data.revision<=snapshot.revision)return;if(busy){pendingRemote=true;return;}try{const value=read(await journal.getItem(address));check();snapshot=project(value);emit();}catch{if(current()){snapshot=Object.freeze({...snapshot,problem:'Your timer changed in another window. Reload it to continue.'});emit();}}};}catch(error){if(!current()){close();throw error;}}
 }
 return Object.freeze({binding,getSnapshot(){if(!current())close();return snapshot;},subscribe(fn){if(!current()){close();return()=>{};}listeners.add(fn);return()=>listeners.delete(fn);},
  async reload(){check();if(busy)throw Error('Wait for your timer to finish saving.');const value=read(await journal.getItem(address));check();snapshot=project(value);emit();},
  async save(seconds){
   check();if(!CONVERSATION_TIMER_SECONDS.includes(seconds))throw Error('Choose Off, 24 hours, 7 days or 90 days.');if(busy)throw Error('Your timer is already saving.');
   const revision=snapshot.revision;busy=true;snapshot=Object.freeze({...snapshot,saving:true,problem:null});emit();
   try{return await exclusive(address,async()=>{
    check();const previous=read(await journal.getItem(address));check();if(previous.revision!==revision)throw Error('Your timer changed in another window. Reload it before saving.');
    if(previous.changes.length>=2000)throw Error('Your timer history is full and needs review.');
    // Nostr originals record whole seconds. Finish saving at the next boundary
    // so an earlier message from the same second never changes retroactively.
    const clockAt=Math.ceil(now()/1000);if(previous.changes.at(-1)?.at>clockAt)throw Error('Check your device clock before changing the timer.');
    const at=Math.max(clockAt,(previous.changes.at(-1)?.at??0)+1);
    const next={version:1,scope,changes:[...previous.changes,{at,seconds}],revision:revision+1};await journal.setItem(address,next);check();
    const delay=at*1000-now();if(delay>0){await wait(Math.min(delay,2000));check();if(now()<at*1000)throw Error('Your timer was saved. Reload it after checking your device clock.');}
    snapshot=project(next);emit();channel?.postMessage({version:1,revision:next.revision});return snapshot;
   },signal);}catch(error){if(current()){snapshot=Object.freeze({...snapshot,saving:false,problem:error instanceof Error?error.message:'Your timer could not be saved.'});emit();}throw error;}finally{busy=false;if(pendingRemote&&current()){pendingRemote=false;try{const value=read(await journal.getItem(address));check();snapshot=project(value);emit();}catch{if(current()){snapshot=Object.freeze({...snapshot,problem:'Reload your timer to see the latest change.'});emit();}}}}
  },close,
 });
}
/** Expiration is anchored to the original recorded message time; timer changes
 * never shorten earlier originals, and turning Off never revives old expiry. */
export function conversationMessageExpiry(message,changes){
 if(!Number.isSafeInteger(message.createdAt)||message.createdAt<=0)return Infinity;
 let seconds=0;for(let i=changes.length-1;i>=0;i--){if(changes[i].at<=message.createdAt){seconds=changes[i].seconds;break;}}
 return seconds?message.createdAt*1000+seconds*1000:Infinity;
}
