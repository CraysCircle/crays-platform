import{createLocalJWKSet,jwtVerify,decodeJwt}from'jose';
const JWKS=Object.freeze({google:'https://www.googleapis.com/oauth2/v3/certs',microsoft:'https://login.microsoftonline.com/common/discovery/v2.0/keys',linkedin:'https://www.linkedin.com/oauth/openid/jwks'});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
/** Host factory; fetchJwks is bounded same-origin fixed-endpoint transport, never caller injected.
 * Default path uses only pinned official public keys; no tokens in URL/logs. Tests can supply
 * signed synthetic keys through this host factory WITHOUT claiming provider authenticity.
 */
export function createOidcVerifier({fetchJwks,now=Date.now}){
 if(typeof fetchJwks!=='function')throw Error('JWKS_HOST_TRANSPORT_REQUIRED');const cache=new Map();
 return async({provider,token,clientId,nonce,now:at=now()})=>{
  if(!Object.hasOwn(JWKS,provider)||typeof token!=='string'||token.length>32768||typeof nonce!=='string'||!nonce||typeof clientId!=='string'||!clientId)throw Error('ID_TOKEN_INVALID');
  let issuer=provider==='google'?'https://accounts.google.com':'https://www.linkedin.com';let tenant;
  if(provider==='microsoft'){
   // Unverified tid only forms a fixed-host expected issuer; never authority or URL for fetching.
   const hint=decodeJwt(token);tenant=hint.tid;if(typeof tenant!=='string'||!UUID.test(tenant))throw Error('ID_TOKEN_INVALID');issuer=`https://login.microsoftonline.com/${tenant}/v2.0`;
  }
  let keys=cache.get(provider);
  if(!keys||keys.until<=at){
   const jwks=await fetchJwks(JWKS[provider]);
   if(!jwks||!Array.isArray(jwks.keys)||!jwks.keys.length||jwks.keys.length>64)throw Error('JWKS_INVALID');
   const accepted=jwks.keys.filter(k=>k?.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig')&&typeof k.kid==='string'&&k.kid.length<=256);
   if(!accepted.length)throw Error('JWKS_INVALID');keys={resolver:createLocalJWKSet({keys:accepted}),until:at+300000};cache.set(provider,keys);
  }
  try{
   const{payload,protectedHeader}=await jwtVerify(token,keys.resolver,{algorithms:['RS256'],issuer,audience:clientId,currentDate:new Date(at),clockTolerance:5,requiredClaims:['iss','sub','aud','exp','iat','nonce'],maxTokenAge:'1h'});
   if(protectedHeader.jku||protectedHeader.x5u||protectedHeader.jwk||payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub.length||payload.sub.length>2048||payload.iat>at/1000+5||payload.exp<=at/1000||payload.exp<=payload.iat)throw Error('ID_TOKEN_INVALID');
   if(Array.isArray(payload.aud)&&(payload.aud.length>1&&payload.azp!==clientId))throw Error('ID_TOKEN_INVALID');
   if(payload.azp!==undefined&&payload.azp!==clientId)throw Error('ID_TOKEN_INVALID');
   if(provider==='microsoft'&&payload.tid!==tenant)throw Error('ID_TOKEN_INVALID');
   // Redacted verified projection; not decoding opaque Google/Graph API access tokens.
   return{iss:payload.iss,sub:payload.sub,aud:clientId,nonce:payload.nonce,exp:payload.exp,iat:payload.iat,...(tenant?{tid:tenant}:{})};
  }catch{throw Error('ID_TOKEN_INVALID');}
 };
}
export function createFixedJwksFetcher({fetchImpl=globalThis.fetch}={}){
 return async url=>{
  if(!Object.values(JWKS).includes(url))throw Error('JWKS_ENDPOINT_DENIED');
  const r=await fetchImpl(url,{redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok||!r.body)throw Error('JWKS_UNAVAILABLE');const reader=r.body.getReader();const chunks=[];let n=0;
  try{for(;;){const{value,done}=await reader.read();if(done)break;n+=value.byteLength;if(n>262144)throw Error('JWKS_BUDGET');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{await reader.cancel().catch(()=>{});throw Error('JWKS_INVALID');}finally{reader.releaseLock();}
 };
}
