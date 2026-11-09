import assert from 'node:assert/strict';
/** Server-only composition utility. Expected subject comes from the original verified SDK session,
 * never body/role/account/path fields. Every later SDK session resolution must still match it. */
export function bindOriginalProvisioningSubject(getAuth0Session,expectedSubject){
 assert.equal(typeof getAuth0Session,'function');assert(typeof expectedSubject==='string'&&expectedSubject.length>0&&expectedSubject.length<=2048,'ORIGINAL_PROVIDER_SESSION_REQUIRED');
 return async request=>{const session=await getAuth0Session(request);assert.equal(session?.user?.sub,expectedSubject,'PROVISIONING_SESSION_CHANGED');return session;};
}
/** Existing account mapping may already have committed. A lost/currentness/unknown outcome
 * must not claim success or automatically retry a possible materialization write. */
export async function completeProviderBaseline(request,expectedSubject,ensureBaseline){
 assert.equal(typeof ensureBaseline,'function');
 try{return await ensureBaseline(request,expectedSubject);}
 catch{return Object.freeze({status:'MATERIALIZATION_OUTCOME_UNCONFIRMED',runtimeStarted:false});}
}
