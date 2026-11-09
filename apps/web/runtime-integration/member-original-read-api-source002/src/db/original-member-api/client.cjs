'use strict';
const crypto=require('node:crypto'),P=require('./protocol.cjs');
function createOriginalMemberHttpPool(env=process.env){
 if(env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_DATABASE_URL!==undefined||env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_XL_TARGET!==undefined||env.NODE_TLS_REJECT_UNAUTHORIZED==='0')P.fail();
 const c=P.configuration({endpoint:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_ENDPOINT,keyId:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_API_KEY_ID,key:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_API_KEY,validUntil:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_API_VALID_UNTIL,contract:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT});
 const keyFingerprint=P.sha(JSON.stringify([c.endpoint,c.keyId,c.key.toString('base64url'),c.until,c.digest]));
 function current(){const x=P.configuration({endpoint:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_ENDPOINT,keyId:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_API_KEY_ID,key:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_API_KEY,validUntil:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_API_VALID_UNTIL,contract:env.CRAYS_CORE_ORIGINAL_MEMBER_RPC_CONTRACT});if(P.sha(JSON.stringify([x.endpoint,x.keyId,x.key.toString('base64url'),x.until,x.digest]))!==keyFingerprint)P.fail();return x;}
 return {async query(sql,values){
  current();const operation=Object.keys(P.SQL).find(k=>P.SQL[k]===sql);if(!operation||!Array.isArray(values)||values.length!==3)P.fail();
  const body=Buffer.from(JSON.stringify({schema:'crays.core.member-original-api-request.v1',operation,issuer:values[0],subject:values[1],clientDigest:values[2],issuedAt:Date.now(),nonce:crypto.randomBytes(24).toString('hex'),contractDigest:c.digest}));P.parseRequest(body,c);
  let response;try{response=await fetch(c.endpoint,{method:'POST',redirect:'error',cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json','x-crays-core-key-id':c.keyId,'x-crays-core-signature':P.mac(c.key,P.requestText(c,body))},body});}catch{P.fail();}
  if(response.status!==200||response.headers.get('content-type')?.split(';')[0]!=='application/json'||response.headers.get('cache-control')!=='no-store')P.fail();
  let length=0;const chunks=[];try{for await(const chunk of response.body){length+=chunk.length;if(length>P.MAX_RESPONSE)P.fail();chunks.push(chunk);}}catch{P.fail();}const bytes=Buffer.concat(chunks);
  if(!P.equal(response.headers.get('x-crays-core-signature'),P.mac(c.key,P.responseText(c,P.sha(body),bytes,200))))P.fail();
  let v;try{v=JSON.parse(bytes.toString('utf8'));}catch{P.fail();}if(!v||Object.keys(v).length!==5||v.schema!=='crays.core.member-original-api-response.v1'||v.requestHash!==P.sha(body)||v.contractDigest!==c.digest||v.rowCount!==1||!Array.isArray(v.rows)||v.rows.length!==1)P.fail();
  const row=v.rows[0],keys=operation==='combined'?['identity_payload','own_state_payload']:['payload'];if(!row||typeof row!=='object'||Object.keys(row).length!==keys.length||keys.some(k=>!Object.hasOwn(row,k)))P.fail();
  current();return {rowCount:1,rows:v.rows};
 },async end(){}};
}
module.exports={createOriginalMemberHttpPool};
