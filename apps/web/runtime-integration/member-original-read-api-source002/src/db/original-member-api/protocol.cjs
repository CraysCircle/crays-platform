'use strict';
const crypto=require('node:crypto');
const ENDPOINT='https://team.craysclub.com/_core/member-original/v1/read';
const PATH='/_core/member-original/v1/read';
const MAX_BODY=4096,MAX_RESPONSE=512*1024;
const SQL={
 identity:'select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as payload',
 state:'select crays_core_rpc.read_own_clubs_member_state_v1($1::text,$2::text,$3::text) as payload',
 combined:'select crays_core_rpc.resolve_auth0_identity_bundle_v2($1::text,$2::text,$3::text) as identity_payload, crays_core_rpc.read_own_clubs_member_state_v1($1::text,$2::text,$3::text) as own_state_payload'
};
const fail=()=>{throw new Error('ORIGINAL_MEMBER_API_UNAVAILABLE');};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const mac=(key,s)=>crypto.createHmac('sha256',key).update(s).digest('hex');
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&/^[a-f0-9]{64}$/.test(a)&&/^[a-f0-9]{64}$/.test(b)&&crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
function contract(raw){let c;try{c=JSON.parse(raw);}catch{fail();}const keys=['role','identityOwner','ownStateOwner','identityDefinitionSha256','ownStateDefinitionSha256','generationSha256'];if(!c||Object.keys(c).length!==6||keys.some(k=>typeof c[k]!=='string'))fail();if(c.role!=='crays_core_member_identity_rpc_runtime_v3'||c.identityOwner!=='crays_core_identity_rpc_owner_v2'||c.ownStateOwner!==c.identityOwner||keys.slice(3).some(k=>!/^[a-f0-9]{64}$/.test(c[k])))fail();return Object.freeze(c);}
function contractDigest(c){return sha(JSON.stringify(['original-member-2rpc-contract-v1',c.role,c.identityOwner,c.ownStateOwner,c.identityDefinitionSha256,c.ownStateDefinitionSha256,c.generationSha256]));}
function configuration(v){
 if(!v||v.endpoint!==ENDPOINT||typeof v.keyId!=='string'||!/^[a-z0-9-]{1,64}$/.test(v.keyId)||typeof v.key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(v.key))fail();
 const key=Buffer.from(v.key,'base64url');if(key.length!==32||key.toString('base64url')!==v.key)fail();
 const until=Date.parse(v.validUntil);if(!Number.isSafeInteger(until)||until<=Date.now())fail();
 const c=contract(v.contract);return Object.freeze({...v,key,until,contractObject:c,digest:contractDigest(c)});
}
function active(c){if(Date.now()>=c.until)fail();}
function requestText(c,body){return ['original-member-read-request-v1','POST',PATH,c.keyId,sha(body)].join('\n');}
function responseText(c,requestHash,body,status){return ['original-member-read-response-v1',c.keyId,requestHash,String(status),sha(body)].join('\n');}
function parseRequest(body,c){
 if(!Buffer.isBuffer(body)||body.length<1||body.length>MAX_BODY)fail();let v;try{v=JSON.parse(body.toString('utf8'));}catch{fail();}
 const keys=['schema','operation','issuer','subject','clientDigest','issuedAt','nonce','contractDigest'];
 if(!v||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k))||v.schema!=='crays.core.member-original-api-request.v1'||!Object.hasOwn(SQL,v.operation))fail();
 if(typeof v.issuer!=='string'||v.issuer.length>512||!/^https:\/\/[a-z0-9][a-z0-9.-]*\/$/.test(v.issuer)||v.issuer.includes('..')||typeof v.subject!=='string'||v.subject.length>512||!/^google-oauth2\|\S+$/.test(v.subject)||typeof v.clientDigest!=='string'||!/^[a-f0-9]{64}$/.test(v.clientDigest)||typeof v.nonce!=='string'||!/^[a-f0-9]{48}$/.test(v.nonce)||v.contractDigest!==c.digest||!Number.isSafeInteger(v.issuedAt)||Date.now()-v.issuedAt>30000||v.issuedAt-Date.now()>5000)fail();
 active(c);return v;
}
module.exports={ENDPOINT,PATH,MAX_BODY,MAX_RESPONSE,SQL,fail,sha,mac,equal,contract,configuration,active,requestText,responseText,parseRequest};
