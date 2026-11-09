export type MemberSessionConnection={kind:"ready"|"login-required"|"binding-required"|"unavailable";notice:string};
/** Only the existing same-origin session response determines login and account readiness. */
export function memberSessionConnection(ok:boolean,httpStatus:number,value:unknown):MemberSessionConnection{
 if(httpStatus===401)return {kind:"login-required",notice:"Development preview · Your Google session has ended. Sign in again to continue."};
 const session=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;
 if(ok&&session?.status==="ready"&&session.authenticated===true&&session.accountMapped===true)return {kind:"ready",notice:"Development preview · Data is read through the Member BFF. Test integration is still being verified."};
 if(httpStatus===409&&session?.status==="identity_binding_required"&&session.authenticated===true&&session.accountMapped===false)return {kind:"binding-required",notice:"Development preview · Google sign-in is active; your SaaS test-account connection is not ready yet."};
 return {kind:"unavailable",notice:"Development preview · The SaaS account connection is temporarily unavailable."};
}
