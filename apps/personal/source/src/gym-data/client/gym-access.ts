import {z} from 'zod';
const id=z.string().trim().min(1).max(512);
const responseSchema=z.object({schema:z.literal('crays.gym.global-native-session.v1'),globalSession:z.object({status:z.literal('ready'),account:z.object({id})}),gymSession:z.object({status:z.literal('ready'),authenticated:z.literal(true),accountMapped:z.literal(true),sessionMode:z.literal('auth0'),account:z.object({id,displayName:z.string().optional()}),scope:z.object({tenantId:id,memberId:id})})});
export type GymAccess=
 |{kind:'ready';globalAccountId:string;gymAccountId:string;tenantId:string;memberId:string;displayName:string;ownerKey:string}
 |{kind:'signed_out'|'denied'|'unavailable'|'account_changed'};
/** Expected identity is the existing shared host's original global account.
 * This is display isolation only; server authorization never trusts this value.
 * The original native account remains distinct and is not rewritten client-side.
 */
export async function readGymAccess(expectedGlobalAccountId:string,signal:AbortSignal,transport:typeof fetch=fetch):Promise<GymAccess>{
 signal.throwIfAborted();
 if(!id.safeParse(expectedGlobalAccountId).success)return {kind:'unavailable'};
 try{
  const response=await transport('/api/gym-member/session',{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal});
  signal.throwIfAborted();
  if(response.status===401)return {kind:'signed_out'};
  if(response.status===403)return {kind:'denied'};
  if(!response.ok)return {kind:'unavailable'};
  const value:unknown=await response.json();signal.throwIfAborted();
  const parsed=responseSchema.safeParse(value);signal.throwIfAborted();
  if(!parsed.success)return {kind:'unavailable'};
  const {globalSession,gymSession}=parsed.data;
  if(globalSession.account.id!==expectedGlobalAccountId)return {kind:'account_changed'};
  const scope=gymSession.scope;
  return {kind:'ready',globalAccountId:globalSession.account.id,gymAccountId:gymSession.account.id,tenantId:scope.tenantId,memberId:scope.memberId,displayName:gymSession.account.displayName??'',ownerKey:JSON.stringify([globalSession.account.id,gymSession.account.id,scope.tenantId,scope.memberId])};
 }catch(error){if(signal.aborted)throw error;return {kind:'unavailable'};}
}
