const fields=['kind','accountId','conversationId','groupId','pubkey','membershipId'];
const fail=message=>Error(message||'This private note is unavailable.');
/** Only the existing authenticated account's encrypted journal is accepted by
 * the host adapter. Notes never enter a message, relay publication or URL.
 */
export async function openConversationPrivateNote({binding,journal,exclusive,authorize,signal}){
 if(!binding||fields.some(k=>typeof binding[k]!=='string'||!binding[k])||!signal?.addEventListener||typeof authorize!=='function'||typeof exclusive!=='function'||typeof journal?.getItem!=='function'||typeof journal?.setItem!=='function')throw fail();
 binding=Object.freeze({...binding});const scope=JSON.stringify(fields.map(k=>binding[k])),address='crays.private-contact-note.v1:'+scope,listeners=new Set();let closed=false,busy=false,snapshot;
 const current=()=>!closed&&!signal.aborted&&authorize(binding)===true;
 const check=()=>{if(!current())throw fail();};
 const emit=()=>{for(const listener of listeners)listener();};
 const read=value=>{if(value===null)return {version:1,scope,note:'',revision:0};if(value?.version!==1||value.scope!==scope||typeof value.note!=='string'||value.note.length>2000||!Number.isSafeInteger(value.revision)||value.revision<0)throw fail('Your saved private note needs review.');return value;};
 const close=()=>{if(closed)return;closed=true;snapshot=Object.freeze({available:false,note:'',saving:false,problem:null,revision:0});signal.removeEventListener('abort',close);emit();listeners.clear();};
 signal.addEventListener('abort',close,{once:true});
 try{check();const original=read(await journal.getItem(address));check();snapshot=Object.freeze({available:true,note:original.note,saving:false,problem:null,revision:original.revision});}catch(error){close();throw error;}
 return Object.freeze({binding,
  getSnapshot:()=>{if(!current())close();return snapshot;},
  subscribe(listener){if(!current()){close();return()=>{};}listeners.add(listener);return()=>listeners.delete(listener);},
  async reload(){check();if(busy)throw fail('Wait for your note to finish saving.');const value=read(await journal.getItem(address));check();snapshot=Object.freeze({available:true,note:value.note,saving:false,problem:null,revision:value.revision});emit();},
  async save(note){
   check();if(typeof note!=='string'||note.length>2000)throw fail('Use up to 2,000 characters.');if(busy)throw fail('Your note is already saving.');
   const revision=snapshot.revision;busy=true;snapshot=Object.freeze({...snapshot,saving:true,problem:null});emit();
   try{return await exclusive(address,async()=>{check();const previous=read(await journal.getItem(address));check();if(previous.revision!==revision)throw fail('Your note changed in another window. Reload it before saving.');const next={version:1,scope,note,revision:revision+1};await journal.setItem(address,next);check();snapshot=Object.freeze({available:true,note,saving:false,problem:null,revision:next.revision});emit();return snapshot;},signal);}
   catch(error){if(current()){snapshot=Object.freeze({...snapshot,saving:false,problem:error instanceof Error?error.message:'Your private note could not be saved.'});emit();}throw error;}
   finally{busy=false;}
  },close,
 });
}
