const format='crays-original-mdk-current-v1';
const fields=['accountId','conversationId','groupId','membershipId','pubkey','kind'];
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
// Match original MDK browser_group_id: nonempty, at most64 decoded bytes.
const groupId=value=>typeof value==='string'&&/^(?:[a-f0-9]{2}){1,64}$/.test(value);
const failure=()=>Error('The current group journal is unavailable');

/** Encrypted persistence only, never a membership or publication authority.
 * The normal group controller supplies its independently verified admission.
 * Original MDK journals have a distinct namespace from legacy TS group data.
 */
export async function openMdkMembershipJournal({binding:input,identity,store,getAdmission,isCurrent,signal,locks=globalThis.navigator?.locks,crypto=globalThis.crypto}){
 const binding=Object.freeze({...input});
 if(!fields.every(key=>typeof binding[key]==='string'&&binding[key].length>0&&binding[key].length<=256)||!['spot','circle'].includes(binding.kind)||!groupId(binding.groupId)||!hex(binding.membershipId)||!hex(binding.pubkey)||!hex(identity?.bindingFingerprint)||identity.accountId!==binding.accountId||identity.pubkey!==binding.pubkey||typeof getAdmission!=='function'||typeof isCurrent!=='function'||!signal?.addEventListener||!locks?.request||!crypto?.subtle||['getItem','setItem','removeItem'].some(key=>typeof store?.[key]!=='function'))throw failure();
 let closed=false;const lifetime=new AbortController();
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);};
 function check(){
  try{const actual=getAdmission();if(!closed&&!signal.aborted&&isCurrent()===true&&actual?.storageFormat===format&&fields.every(key=>actual[key]===binding[key]))return;}
  catch{}
  close();throw failure();
 }
 signal.addEventListener('abort',close,{once:true});
 try{
  check();
  const scope=JSON.stringify([format,identity.accountId,identity.bindingFingerprint,binding.pubkey,binding.conversationId,binding.groupId,binding.membershipId]);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope))),byte=>byte.toString(16).padStart(2,'0')).join('');check();
  const prefix='mdk-current-journal:'+hash+':';
  const keyOf=key=>{check();if(typeof key!=='string'||!key||key.length>1024)throw failure();return prefix+key;};
  return Object.freeze({
   async getItem(key){const result=await store.getItem(keyOf(key));check();return result;},
   async setItem(key,value){await store.setItem(keyOf(key),value);check();},
   async removeItem(key){await store.removeItem(keyOf(key));check();},
   async exclusive(key,work){
    const name=keyOf(key);if(typeof work!=='function')throw failure();
    return locks.request(name,{signal:lifetime.signal},async()=>{check();const result=await work();check();return result;});
   },
   close,
  });
 }catch(error){close();throw error;}
}
