/** SOURCE CANDIDATE host composition. Exact existing canonical imports, not imaginary SDK APIs.
 * No route or runtime is installed; caller is existing authenticated server BFF, never model JSON.
 */
import{createCorePersonResolver}from'./core-person.mjs';
import{createOAuthConnectionService}from'./oauth-connection-service.mjs';
import{createFixedProviderTransport}from'./fixed-provider-transport.mjs';
import{createOidcVerifier,createFixedJwksFetcher}from'./oidc-verifier.mjs';
import{createPersonPgContext}from'./person-pg-context.mjs';import{createEnvelopeCodec}from'./envelope.mjs';import{createPersonVault}from'./vault.mjs';import{createOAuthAttemptRepository}from'./attempt-repository.mjs';import{createOAuthRefreshRepository}from'./refresh-repository.mjs';
export function createPersistentPersonalOAuthHost({getClient,getAuth0Session,getVerifiedSessionBinding,keys,readAppSecret,apps,fetchImpl=globalThis.fetch,now=Date.now}){
 if(typeof readAppSecret!=='function'||!apps)throw Error('SERVER_HOST_CONFIGURATION_REQUIRED');
 const resolvePerson=createCorePersonResolver({getClient,getAuth0Session,getVerifiedSessionBinding}),codec=createEnvelopeCodec({keys}),transport=createFixedProviderTransport({fetchImpl}),verifyIdToken=createOidcVerifier({fetchJwks:createFixedJwksFetcher({fetchImpl}),now});
 const approvedAppRefs=new Set(Object.values(apps).map(x=>x.secretRef).filter(x=>typeof x==='string'&&x.length));
 const appSecret=(ref,callback)=>{if(!approvedAppRefs.has(ref))throw Error('APP_SECRET_REFERENCE_DENIED');return readAppSecret(ref,callback);};
 return async request=>{
  const person=await resolvePerson(request),pg=await createPersonPgContext({getClient,resolvePerson,person,now}),vault=createPersonVault({pg,codec,readAppSecret:appSecret}),store=createOAuthAttemptRepository({pg,codec});
  return Object.freeze({connections:createOAuthConnectionService({resolvePerson,store,vault,transport,verifyIdToken,apps,now}),refreshJournal:createOAuthRefreshRepository({pg}),vault});
 };
}
