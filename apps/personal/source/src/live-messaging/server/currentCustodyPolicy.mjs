import {createHash} from 'node:crypto';
import {accountIdentityProofTemplate} from '../../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/core/components/account-identity-proof.js';
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
/** Owner-authorized existing-custody crypto only, under an independently verified
 * current Core self-binding. This does not publish, grant a conversation or
 * activate public posting, financial operations or media service authority.
 */
export function authorizeCurrentCustodyOperation(binding,operation){
 try{
  if(!binding?.accountId||!hex(binding.pubkey)||!hex(binding.bindingFingerprint)||binding.publicBindingVerified!==true||binding.emailVerificationRequired!==false)return false;
  if(operation.kind==='identity')return true;
  if(['encrypt','decrypt'].includes(operation.kind))return hex(operation.pubkey)&&typeof operation.payload==='string'&&Buffer.byteLength(operation.payload)>0&&Buffer.byteLength(operation.payload)<=(operation.kind==='encrypt'?65535:100000);
  if(operation.kind!=='sign')return false;
  const event=operation.event,now=Math.floor(Date.now()/1000);
  if(!event||!Number.isSafeInteger(event.created_at)||event.created_at>now+300||typeof event.content!=='string'||!Array.isArray(event.tags)||event.pubkey!==undefined&&event.pubkey!==binding.pubkey)return false;
  if(event.kind===30078){
   const hash=createHash('sha256').update(JSON.stringify(['crays-private-browser-owner-v1',binding.accountId])).digest('hex');
   return event.created_at>=now-300&&event.content.length>=132&&event.content.length<=8192&&JSON.stringify(event.tags)===JSON.stringify([['d','crays-private-browser-key:'+hash]]);
  }
  if(event.kind===450){
   if(event.created_at<now-300||event.tags.length!==5)return false;
   const suite=event.tags.find(tag=>tag[0]==='ciphersuite')?.[1],key=event.tags.find(tag=>tag[0]==='mls_signature_key')?.[1];
   if(typeof suite!=='string'||!/^0x[0-9a-f]{4}$/.test(suite)||typeof key!=='string'||!/^(?:[0-9a-f]{2}){32,133}$/.test(key))return false;
   const expected=accountIdentityProofTemplate(Number.parseInt(suite.slice(2),16),new Uint8Array(Buffer.from(key,'hex')));
   return event.content===expected.content&&JSON.stringify(event.tags)===JSON.stringify(expected.tags);
  }
  if(event.kind===13)return event.created_at>=now-172800-300&&event.tags.length===0&&event.content.length>=132&&event.content.length<=100000&&/^[A-Za-z0-9+/]+={0,2}$/.test(event.content)&&Buffer.from(event.content,'base64')[0]===2;
  if(event.kind===30443){
   if(event.created_at<now-300||!event.content||event.content.length>256000||!/^[A-Za-z0-9+/]+={0,2}$/.test(event.content)||event.tags.length>16)return false;
   const allowed=new Set(['-','d','mls_protocol_version','i','mls_ciphersuite','mls_extensions','mls_proposals','app_components','client']);
   if(event.tags.some(tag=>!Array.isArray(tag)||!allowed.has(tag[0])||tag.some(value=>typeof value!=='string'))||new Set(event.tags.map(tag=>tag[0])).size!==event.tags.length)return false;
   const tag=name=>event.tags.find(tag=>tag[0]===name);
   return tag('d')?.length===2&&/^[a-f0-9]{64}$/.test(tag('d')[1])&&tag('mls_protocol_version')?.[1]==='1.0'&&hex(tag('i')?.[1])&&/^0x[0-9a-f]{4}$/.test(tag('mls_ciphersuite')?.[1]??'')&&/^crays(?:[ -]|$)/i.test(tag('client')?.[1]??'');
  }
  return false;
 }catch{return false;}
}
