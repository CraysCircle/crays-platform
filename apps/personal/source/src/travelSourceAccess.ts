import {appById,type AppProvider} from './appConnections.ts';
import type {ProductWorld} from './productModel.ts';
import type {TravelKind} from './travelComparisons.ts';
export type TravelSourceAction='search'|'book'|'read'|'cancel';
export type TravelSourceSnapshot={owner:string;providerId:string;kind:TravelKind;connectionId:string;connectionVersion:number;account:string;grantedScopes:string[]};
export type TravelSourceQuote={observedAt:string;expiresAt:string;sourceSnapshot:string};
export type TravelSourceAccessStatus='ready'|'sign-in-required'|'provider-not-configured'|'unsupported-provider'|'connection-required'|'ambiguous-connection'|'invalid-connection'|'permission-required'|'review-required'|'quote-validity-required'|'quote-expired';
export type TravelSourceAccessRequest={providerId:string;kind:TravelKind;action:TravelSourceAction;snapshot?:string;quote?:TravelSourceQuote};
const providers:Record<TravelKind,string[]>={stay:['booking','expedia'],flight:['expedia','kiwi','waltz'],rail:[]};
export const travelProvidersFor=(kind:TravelKind):AppProvider[]=>(providers[kind]||[]).map(id=>appById(id)).filter((p):p is AppProvider=>!!p);
export function travelSourceAccess(w:ProductWorld,request:TravelSourceAccessRequest,now=Date.now()){
 const {providerId,kind,action}=request,requiredScopes=[action];
 let snapshot:TravelSourceSnapshot|undefined;
 const result=(status:TravelSourceAccessStatus,reason:string)=>({status,reason,ready:status==='ready',snapshot,snapshotJSON:snapshot?JSON.stringify(snapshot):'',requiredScopes,platformAccess:'unproven' as const,realExecution:false as const});
 if(!w.identity.signedIn)return result('sign-in-required','Sign in to choose your own source account.');
 if(!providers[kind]?.length)return result('provider-not-configured','A rail or transit account provider has not been configured here. Your own public references remain available.');
 const provider=appById(providerId);if(!provider||!providers[kind].includes(providerId)||!['search','book','read','cancel'].includes(action))return result('unsupported-provider','Choose a provider and action supported for this comparison.');
 const records=w.objects.filter(o=>o.owner===w.owner&&o.kind==='app-connection'&&o.providerId===providerId);
 if(records.length>1)return result('ambiguous-connection','This source has ambiguous account records. Review it in your settings.');
 const c=records[0];if(!c||c.status!=='connected-demo')return result('connection-required','Connect or reconnect this own preview account in settings. Its prior permissions are not restored automatically.');
 if(typeof c.account!=='string'||!c.account.trim()||!Number.isSafeInteger(c.version)||Number(c.version)<1||!Array.isArray(c.scopes)||c.scopes.some(s=>typeof s!=='string'||!provider.scopes.some(p=>p.id===s)))return result('invalid-connection','Review this account and its exact permissions in settings.');
 snapshot={owner:w.owner,providerId,kind,connectionId:c.id,connectionVersion:Number(c.version),account:c.account,grantedScopes:[...new Set(c.scopes as string[])].sort()};
 if(!provider.scopes.some(s=>s.id===action)||!c.scopes.includes(action))return result('permission-required',`The ${action} permission for this own account is missing or revoked.`);
 if(request.snapshot!==undefined&&request.snapshot!==JSON.stringify(snapshot))return result('review-required','The account or permissions changed. Review this current account before continuing.');
 if(action==='book'){
  const q=request.quote;
  if(!q||q.sourceSnapshot!==JSON.stringify(snapshot)||!validTimestamp(q.observedAt)||!validTimestamp(q.expiresAt)||!Number.isFinite(now)||Date.parse(q.observedAt)>now||Date.parse(q.expiresAt)<=Date.parse(q.observedAt))return result('quote-validity-required','Review this exact source and its explicitly recorded quote validity. No provider lifetime is assumed.');
  if(Date.parse(q.expiresAt)<=now)return result('quote-expired','This recorded quote expired. Obtain and review a fresh option before a new booking request.');
 }
 return result('ready','This preview account has the requested scope. Platform access remains unproven and no real provider action is enabled.');
}
export function validTimestamp(value:unknown):value is string{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)||Number(value.slice(0,4))<1||!Number.isFinite(Date.parse(value)))return false;const day=new Date(`${value.slice(0,10)}T12:00:00Z`);return Number.isFinite(day.getTime())&&day.toISOString().slice(0,10)===value.slice(0,10);}
