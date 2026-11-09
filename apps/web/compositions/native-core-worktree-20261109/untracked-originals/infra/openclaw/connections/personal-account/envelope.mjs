import{randomBytes,createCipheriv,createDecipheriv}from'node:crypto';
const bad=()=>{throw Error('VAULT_ENVELOPE_DENIED');};
const b64=b=>b.toString('base64url');
function decode(s,limit){if(typeof s!=='string'||s.length>limit||!/^[A-Za-z0-9_-]+$/.test(s))bad();const b=Buffer.from(s,'base64url');if(b64(b)!==s)bad();return b;}
function contextBytes(c){
 if(!c||typeof c!=='object')bad();const keys=['accountId','canonicalPersonId','provider','purpose','resourceId','resourceVersion'];
 for(const k of keys)if(typeof c[k]!=='string'||!c[k].length||c[k].length>4096)bad();
 if(!['google','microsoft','linkedin'].includes(c.provider)||!['oauth-attempt','oauth-credential'].includes(c.purpose)||!/^[1-9][0-9]*$/.test(c.resourceVersion))bad();
 if(c.purpose==='oauth-credential'){if(typeof c.connectionHandle!=='string'||!c.connectionHandle.length||c.connectionHandle.length>100)bad();keys.push('connectionHandle');}
 return Buffer.from(JSON.stringify(keys.map(k=>c[k])));
}
/** keys.currentKeyRef() returns an opaque versioned reference; withKey(ref, callback) resolves
 * server-owned 32-byte key internally. No environment/default/master-key string fallback.
 */
export function createEnvelopeCodec({keys}){
 if(typeof keys?.currentKeyRef!=='function'||typeof keys?.withKey!=='function')throw Error('KEY_CUSTODY_REQUIRED');
 const use=async(ref,operation)=>{if(typeof ref!=='string'||!/^keyref:[A-Za-z0-9._/-]{1,200}$/.test(ref))bad();return keys.withKey(ref,async original=>{if(!Buffer.isBuffer(original)||original.length!==32)bad();const copy=Buffer.from(original);try{return operation(copy);}finally{copy.fill(0);}});};
 return Object.freeze({
  async encrypt(value,context){const aad=contextBytes(context),raw=Buffer.from(JSON.stringify(value));if(raw.length<1||raw.length>65536)bad();const keyRef=await keys.currentKeyRef();try{return await use(keyRef,key=>{const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});cipher.setAAD(aad);const ciphertext=Buffer.concat([cipher.update(raw),cipher.final()]);return{format:'CRAYS-A256GCM-1',keyRef,nonce:b64(nonce),tag:b64(cipher.getAuthTag()),ciphertext:b64(ciphertext)};});}finally{raw.fill(0);}},
  async decrypt(envelope,context){const aad=contextBytes(context);if(!envelope||envelope.format!=='CRAYS-A256GCM-1'||Object.keys(envelope).sort().join(',')!=='ciphertext,format,keyRef,nonce,tag')bad();const nonce=decode(envelope.nonce,16),tag=decode(envelope.tag,22),ciphertext=decode(envelope.ciphertext,87382);if(nonce.length!==12||tag.length!==16||ciphertext.length>65536)bad();try{return await use(envelope.keyRef,key=>{const d=createDecipheriv('aes-256-gcm',key,nonce,{authTagLength:16});d.setAAD(aad);d.setAuthTag(tag);const raw=Buffer.concat([d.update(ciphertext),d.final()]);try{return JSON.parse(raw.toString('utf8'));}finally{raw.fill(0);}});}catch{bad();}}
 });
}
