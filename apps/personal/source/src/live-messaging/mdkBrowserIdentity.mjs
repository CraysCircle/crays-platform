import {getEventHash,verifyEvent} from 'nostr-tools/pure';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
/** Existing Core-bound non-exporting account signer authorizes the independent
 * actual MDK leaf. No nsec, sibling leaf copy, alternate identity or proof relay.
 * Persist the newly generated private MLS signer before crossing the async
 * account-signing boundary; reopens then reuse the same independent device key.
 */
export async function authorizeMdkBrowserIdentity({account,ram,snapshots,isCurrent,revision}){
 const identity=account?.identity,signer=account?.signer;
 const failure=()=>Error('Private group identity could not be verified');
 const check=()=>{if(!identity||identity.publicBindingVerified!==true||identity.emailVerificationRequired!==false||!hex(identity.pubkey)||!hex(identity.bindingFingerprint)||account.accountId!==identity.accountId||signer?.binding?.accountId!==identity.accountId||signer.binding.pubkey!==identity.pubkey||signer.binding.bindingFingerprint!==identity.bindingFingerprint||account.signal?.aborted||isCurrent()!==true)throw failure();};
 if(typeof isCurrent!=='function'||typeof ram?.prepare_identity!=='function'||typeof ram.snapshot!=='function'||typeof ram.complete_identity!=='function'||typeof ram.close!=='function'||typeof snapshots?.commit!=='function'||!Number.isSafeInteger(revision)||revision<0||typeof signer?.getPublicKey!=='function'||typeof signer.signEvent!=='function')throw failure();
 const abort=()=>{try{ram.close();}catch{}};
 if(!account?.signal?.addEventListener)throw failure();account.signal.addEventListener('abort',abort,{once:true});
 let accepted=false;
 const close=()=>{account.signal.removeEventListener('abort',abort);abort();};
 try{
  check();const actualPubkey=await signer.getPublicKey();check();if(actualPubkey!==identity.pubkey)throw failure();
  const request=JSON.parse(ram.prepare_identity(identity.pubkey));check();
  const leafKey=request.tags?.[4]?.[1];
  const tags=[['d','marmot.account-identity-proof.v2'],['component','0x8009'],['ciphersuite','0x0001'],['signature_scheme','0x0807'],['mls_signature_key',leafKey]];
  if(!hex(leafKey)||request.content!=='Authorize this MLS leaf key for my Marmot account'||JSON.stringify(request.tags)!==JSON.stringify(tags))throw failure();
  if(request.pubkey!==identity.pubkey||request.kind!==450||!Number.isSafeInteger(request.created_at)||request.created_at<1||request.created_at>Math.floor(Date.now()/1000)+300||typeof request.content!=='string'||!Array.isArray(request.tags)||request.id!==getEventHash(request))throw failure();
  const bytes=ram.snapshot();let committed;
  try{committed=await snapshots.commit(bytes,revision);}finally{bytes.fill(0);}
  check();
  const signed=await signer.signEvent({kind:request.kind,created_at:request.created_at,tags:request.tags,content:request.content});check();
  if(signed.pubkey!==identity.pubkey||signed.id!==request.id||!verifyEvent(signed))throw failure();
  const proof=JSON.parse(ram.complete_identity(signed.sig));check();
  if(proof.accountPubkey!==identity.pubkey||!hex(proof.mlsSignaturePublicKey)||proof.proofVerified!==true)throw failure();
  accepted=true;
  return Object.freeze({...proof,revision:committed.revision,close});
 }catch{abort();throw failure();}
 finally{if(!accepted)account.signal.removeEventListener('abort',abort);}
}
