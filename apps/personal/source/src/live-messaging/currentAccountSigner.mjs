import {createCurrentMessagingIdentityClient} from './currentIdentityClient.mjs';
import {createCurrentBoundSigner} from './currentBoundSigner.mjs';

/** Frontend account -> original same-origin Core identity -> supplied signer.
 * The existing parent chooses its admitted provider; no ambient window.nostr,
 * nsec input, new identity, replacement login or preview-world projection here.
 * A ready port means a matching handle, not proof of message delivery or ACLs.
 */
export async function openCurrentAccountSigner({accountId,provider,isCurrent,authorizeOperation,signal,fetcher}){
 if(typeof provider?.getPublicKey!=='function'||typeof provider?.signEvent!=='function'||typeof provider?.nip44?.encrypt!=='function'||typeof provider?.nip44?.decrypt!=='function'||typeof isCurrent!=='function'||typeof authorizeOperation!=='function'||!signal?.addEventListener)throw Error('Existing admitted account signer required');
 const lifetime=new AbortController();let closed=false,signer=null,pending=null;
 const current=()=>!closed&&!signal.aborted&&isCurrent(accountId)===true;
 const identityClient=createCurrentMessagingIdentityClient({accountId,isCurrent:current,fetcher});
 const close=()=>{if(closed)return;closed=true;lifetime.abort();signal.removeEventListener('abort',close);signer?.close();identityClient.close();};
 signal.addEventListener('abort',close,{once:true});if(signal.aborted)close();
 const read=()=>{
  if(!current())return Promise.reject(Error('Current account is unavailable'));
  // Parallel SDK operations share the same in-flight Core read. They must not
  // abort each other's identity request or refresh the entire desktop shell.
  if(pending)return pending;
  const work=(async()=>{await identityClient.refresh();const state=identityClient.getSnapshot();if(!current()||state.state!=='ready'||!state.identity||state.identity.publicBindingVerified!==true||state.identity.emailVerificationRequired!==false)throw Error('Current verified Nostr binding required');return state.identity;})();
  pending=work;void work.then(()=>{if(pending===work)pending=null;},()=>{if(pending===work)pending=null;});return work;
 };
 try{
  const identity=await read();
  signer=createCurrentBoundSigner({binding:identity,provider,signal:lifetime.signal,isCurrent:binding=>current()&&binding.accountId===accountId,authorizeOperation,readIdentity:read});
  // The Core identity was freshly read immediately above. Validate the
  // supplied provider against that exact result without issuing a second
  // identical metadata-only Core round trip. Every later signer/NIP44
  // operation still performs its own fresh before/after checks.
  const lookup=Object.freeze({kind:'identity'});
  if(!current()||authorizeOperation(identity,lookup)!==true)throw Error('Current account is unavailable');
  const key=await provider.getPublicKey();
  if(!current()||authorizeOperation(identity,lookup)!==true||key!==identity.pubkey)throw Error('Current account is unavailable');
  return Object.freeze({identity,signer,signal:lifetime.signal,close});
 }catch{close();throw Error('Current account signer could not be connected');}
}
