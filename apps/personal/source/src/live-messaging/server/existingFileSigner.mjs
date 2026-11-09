import {openSync,closeSync,readFileSync,fstatSync,lstatSync,constants} from 'node:fs';
import {getPublicKey,finalizeEvent,nip19,nip44} from 'nostr-tools';

const failure=()=>Error('Existing Nostr custody unavailable');
const publicHex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
/** Existing owner custody only. No new identity, copy, browser export, public
 * relay write or canonical Core mapping. Paths are trusted host configuration,
 * never request data. Every operation remains subject to the caller's original
 * current-account authority and exact operation admission.
 */
export function openExistingFileSigner({descriptorPath,binding,isCurrent,authorizeOperation,signal}){
 if(typeof descriptorPath!=='string'||!descriptorPath.startsWith('/')||!binding?.accountId||!publicHex(binding.pubkey)||!publicHex(binding.bindingFingerprint)||binding.publicBindingVerified!==true||binding.emailVerificationRequired!==false||typeof isCurrent!=='function'||typeof authorizeOperation!=='function'||!signal?.addEventListener)throw failure();
 const pins=[];let closed=false,key;
 const check=()=>{if(closed||signal.aborted||isCurrent(binding)!==true)throw failure();};
 const pin=stat=>[stat.dev,stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs,stat.mode,stat.uid,stat.nlink].join(':');
 function readPrivate(path,limit){
  check();const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);let bytes;
  try{const stat=fstatSync(fd);if(!stat.isFile()||stat.uid!==process.getuid()||(stat.mode&0o777)!==0o600||stat.nlink!==1||stat.size<2||stat.size>limit)throw failure();bytes=readFileSync(fd);if(bytes.length!==stat.size||pin(lstatSync(path))!==pin(stat))throw failure();pins.push({path,pin:pin(stat)});return JSON.parse(bytes.toString('utf8'));}
  finally{bytes?.fill(0);closeSync(fd);}
 }
 const currentFiles=()=>{check();for(const entry of pins){const stat=lstatSync(entry.path);if(!stat.isFile()||pin(stat)!==entry.pin)throw failure();}};
 const close=()=>{if(closed)return;closed=true;signal.removeEventListener('abort',close);key?.fill(0);};
 try{
  const descriptor=readPrivate(descriptorPath,65536);
  if(descriptor.publicKey!==binding.pubkey||descriptor.existingPairVerified!==true||descriptor.newKeyCreated!==false||descriptor.privateKeyCopied!==false||descriptor.sourceIsAdditionalEncryptedEnvelope!==false||typeof descriptor.sourceCredentialReference!=='string'||!descriptor.sourceCredentialReference.startsWith('/')||descriptor.sourceCredentialReference===descriptorPath)throw failure();
  const source=readPrivate(descriptor.sourceCredentialReference,2048);
  if(!source||Object.keys(source).sort().join(',')!=='npub,nsec'||typeof source.nsec!=='string'||typeof source.npub!=='string')throw failure();
  const secret=nip19.decode(source.nsec),pub=nip19.decode(source.npub);
  if(secret.type==='nsec')key=secret.data;
  if(secret.type!=='nsec'||pub.type!=='npub'||pub.data!==binding.pubkey)throw failure();delete source.nsec;delete source.npub;
  if(getPublicKey(key)!==binding.pubkey)throw failure();
  signal.addEventListener('abort',close,{once:true});currentFiles();
  const run=(operation,execute)=>{currentFiles();if(authorizeOperation(binding,operation)!==true)throw failure();const value=execute();currentFiles();if(authorizeOperation(binding,operation)!==true)throw failure();return value;};
  return Object.freeze({
   getPublicKey:async()=>run({kind:'identity'},()=>binding.pubkey),
   signEvent:async event=>run({kind:'sign',event},()=>finalizeEvent(structuredClone(event),key)),
   nip44:Object.freeze({
    encrypt:async(pubkey,text)=>run({kind:'encrypt',pubkey,payload:text},()=>{const shared=nip44.v2.utils.getConversationKey(key,pubkey);try{return nip44.v2.encrypt(text,shared);}finally{shared.fill(0);}}),
    decrypt:async(pubkey,text)=>run({kind:'decrypt',pubkey,payload:text},()=>{const shared=nip44.v2.utils.getConversationKey(key,pubkey);try{return nip44.v2.decrypt(text,shared);}finally{shared.fill(0);}}),
   }),close,
  });
 }catch{close();throw failure();}
}
