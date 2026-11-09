'use strict';
// Dedicated server-to-server transport. This confers no Member identity:
// the native endpoint must still validate the original Auth0 SDK session.
const crypto=require('node:crypto');
const SCHEMA='crays.club.member073.native-request.v1';
const MAX_BODY=11*1024*1024,MAX_METADATA=32768,MAX_RESPONSE=11*1024*1024;
const ORIGINS=new Set(['https://www.craysclub.com','https://craysclub.com']);
const HEADER_NAMES=new Set(['cookie','content-type','accept','origin','sec-fetch-site','idempotency-key','range','if-none-match']);
const simple=['session','state','auth-contract','bookings','booking-requests','holds','quotes','membership','services','stay-support','stay-step4','stay-preferences','native-booking','booking-membership-applications','membership-applications/direct','membership-payment/prepare','membership-payment/status','stay-payment/status','ambassador-application/status','documents/upload'];
const exact=new Set(['/api/graphql','/api/crays/auth/provider/account',...simple.map(p=>'/api/crays/clubs/member/'+p)]);
function assert(ok,code){if(!ok)throw new Error(code);}
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function validTarget(method,path){
 if(!['GET','POST','OPTIONS'].includes(method)||typeof path!=='string'||path.length>2048||/[\u0000-\u0020\u007f\\#]/.test(path)||!path.startsWith('/')||path.startsWith('//'))return false;
 let u;try{u=new URL(path,'https://www.craysclub.com');}catch{return false;}
 if(u.origin!=='https://www.craysclub.com'||u.pathname.includes('%')||u.pathname.includes('//'))return false;
 // Reject normalization as well as encoded path or query credential injection.
 if(u.pathname!==path.split('?')[0])return false;
 if(exact.has(u.pathname))return true;
 if(method!=='GET')return false;
 return /^\/api\/crays\/clubs\/member\/documents\/doc_member_[a-f0-9]{32}\/file$/.test(u.pathname)||
 /^\/api\/clubs\/member-self\/invoices\/[A-Za-z0-9_-]{1,100}$/.test(u.pathname)||
 /^\/api\/crays\/clubs\/member\/properties\/[A-Za-z0-9_-]{1,120}\/eligibility$/.test(u.pathname);
}
function validKey(key){assert(Buffer.isBuffer(key)&&key.length===32,'MEMBER073_TRANSPORT_KEY_INVALID');}
function seal(value,key){
 const plain=Buffer.from(JSON.stringify(value));assert(plain.length<=MAX_METADATA-28,'MEMBER073_METADATA_TOO_LARGE');
 const derived=crypto.hkdfSync('sha256',key,Buffer.alloc(0),Buffer.from(SCHEMA+'.metadata-encryption'),32),iv=crypto.randomBytes(12);
 const cipher=crypto.createCipheriv('aes-256-gcm',derived,iv);cipher.setAAD(Buffer.from(SCHEMA));
 const ciphertext=Buffer.concat([cipher.update(plain),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url');
}
function unseal(encoded,key){
 const bytes=Buffer.from(encoded,'base64url');assert(bytes.length>28&&bytes.length<=MAX_METADATA&&bytes.toString('base64url')===encoded,'MEMBER073_METADATA_INVALID');
 const derived=crypto.hkdfSync('sha256',key,Buffer.alloc(0),Buffer.from(SCHEMA+'.metadata-encryption'),32);
 const decipher=crypto.createDecipheriv('aes-256-gcm',derived,bytes.subarray(0,12));decipher.setAAD(Buffer.from(SCHEMA));decipher.setAuthTag(bytes.subarray(12,28));
 const plain=Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]);
 const value=JSON.parse(plain.toString('utf8'));assert(JSON.stringify(value)===plain.toString('utf8'),'MEMBER073_METADATA_INVALID');
 return value;
}
function checkHeaders(headers){
 assert(headers&&typeof headers==='object'&&!Array.isArray(headers),'MEMBER073_HEADERS_INVALID');
 for(const [name,value]of Object.entries(headers))assert(HEADER_NAMES.has(name)&&typeof value==='string'&&value.length<20000&&!/[\r\n\0]/.test(value),'MEMBER073_HEADER_DENIED');
}
function createEnvelope({key,origin,method,path,headers={},body=Buffer.alloc(0),now=Date.now(),id=crypto.randomBytes(24).toString('hex')}){
 validKey(key);assert(ORIGINS.has(origin)&&validTarget(method,path),'MEMBER073_TARGET_DENIED');checkHeaders(headers);
 assert(Buffer.isBuffer(body)&&body.length<=MAX_BODY,'MEMBER073_BODY_TOO_LARGE');
 const envelope={schema:SCHEMA,id,issuedAt:now,expiresAt:now+45000,origin,method,path,headers,bodySha256:digest(body)};
 // Cookies/rolling Set-Cookie must not be exposed by infrastructure logging
 // of custom transport headers. TLS and a MAC alone do not hide log values.
 const encoded=seal(envelope,key);
 return {metadata:encoded,signature:crypto.createHmac('sha256',key).update(encoded).digest('hex')};
}
function verifyEnvelope({key,metadata,signature,body,now=Date.now(),nonces}){
 validKey(key);assert(typeof metadata==='string'&&metadata.length<=Math.ceil(MAX_METADATA*4/3)&&/^[A-Za-z0-9_-]+$/.test(metadata),'MEMBER073_METADATA_INVALID');
 assert(typeof signature==='string'&&/^[a-f0-9]{64}$/.test(signature),'MEMBER073_SIGNATURE_INVALID');
 assert(crypto.timingSafeEqual(crypto.createHmac('sha256',key).update(metadata).digest(),Buffer.from(signature,'hex')),'MEMBER073_SIGNATURE_INVALID');
 assert(Buffer.isBuffer(body)&&body.length<=MAX_BODY,'MEMBER073_BODY_TOO_LARGE');
 let e;try{e=unseal(metadata,key);}catch{throw new Error('MEMBER073_METADATA_INVALID');}
 assert(e&&Object.keys(e).sort().join(',')==='bodySha256,expiresAt,headers,id,issuedAt,method,origin,path,schema'&&e.schema===SCHEMA,'MEMBER073_SCHEMA_INVALID');
 assert(typeof e.id==='string'&&/^[a-f0-9]{48}$/.test(e.id)&&Number.isSafeInteger(e.issuedAt)&&Number.isSafeInteger(e.expiresAt)&&e.issuedAt<=now+5000&&e.issuedAt>=now-50000&&e.expiresAt>now&&e.expiresAt-e.issuedAt===45000,'MEMBER073_REQUEST_EXPIRED');
 assert(ORIGINS.has(e.origin)&&validTarget(e.method,e.path),'MEMBER073_TARGET_DENIED');checkHeaders(e.headers);
 assert(e.bodySha256===digest(body),'MEMBER073_BODY_CHANGED');
 assert(nonces instanceof Map,'MEMBER073_NONCE_STORE_REQUIRED');
 for(const[id,expiry]of nonces)if(expiry<=now)nonces.delete(id);
 assert(nonces.size<10000&&!nonces.has(e.id),'MEMBER073_REPLAY_DENIED');
 nonces.set(e.id,e.expiresAt);
 return e;
}
const RESPONSE_HEADERS=new Set(['content-type','content-disposition','cache-control','vary','etag','set-cookie','accept-ranges','content-range']);
function responseEnvelope({key,requestMetadata,status,headers={},body}){
 validKey(key);assert(Number.isInteger(status)&&status>=200&&status<=599,'MEMBER073_RESPONSE_STATUS_INVALID');
 assert(Buffer.isBuffer(body)&&body.length<=MAX_RESPONSE,'MEMBER073_RESPONSE_TOO_LARGE');
 for(const [name,value]of Object.entries(headers)){
  assert(RESPONSE_HEADERS.has(name),'MEMBER073_RESPONSE_HEADER_DENIED');
  assert((name==='set-cookie'&&Array.isArray(value)?value:[value]).every(v=>typeof v==='string'&&v.length<20000&&!/[\r\n\0]/.test(v)),'MEMBER073_RESPONSE_HEADER_DENIED');
 }
 const encoded=seal({schema:SCHEMA+'.response',requestSHA256:digest(Buffer.from(requestMetadata)),status,headers,bodySha256:digest(body)},key);
 assert(encoded.length<=Math.ceil(MAX_METADATA*4/3),'MEMBER073_RESPONSE_METADATA_TOO_LARGE');
 return {metadata:encoded,signature:crypto.createHmac('sha256',key).update(encoded).digest('hex')};
}
function verifyResponse({key,requestMetadata,metadata,signature,body}){
 validKey(key);assert(typeof metadata==='string'&&/^[A-Za-z0-9_-]+$/.test(metadata)&&metadata.length<=Math.ceil(MAX_METADATA*4/3)&&typeof signature==='string'&&/^[a-f0-9]{64}$/.test(signature),'MEMBER073_RESPONSE_INVALID');
 assert(crypto.timingSafeEqual(crypto.createHmac('sha256',key).update(metadata).digest(),Buffer.from(signature,'hex')),'MEMBER073_RESPONSE_SIGNATURE_INVALID');
 let result;try{result=unseal(metadata,key);}catch{throw new Error('MEMBER073_RESPONSE_INVALID');}
 assert(result&&Object.keys(result).sort().join(',')==='bodySha256,headers,requestSHA256,schema,status'&&result.schema===SCHEMA+'.response'&&result.requestSHA256===digest(Buffer.from(requestMetadata))&&result.bodySha256===digest(body),'MEMBER073_RESPONSE_BINDING_INVALID');
 // Reuse the response builder's status/header/body checks. AES nonces are
 // intentionally fresh, so encrypted headers are never compared for equality.
 responseEnvelope({key,requestMetadata,status:result.status,headers:result.headers,body});
 return result;
}
module.exports={SCHEMA,MAX_BODY,MAX_METADATA,MAX_RESPONSE,validTarget,createEnvelope,verifyEnvelope,responseEnvelope,verifyResponse};
