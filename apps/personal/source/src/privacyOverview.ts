import {ownPrivateAccount} from './ownPrivateAccount';
import type {ProductWorld,Entity} from './productModel.ts';
export type PrivacyState='Current'|'Waiting'|'Expired'|'Not started'|'Paused'|'Revoked'|'Ended'|'Needs review';
export function privacyExpiry(o:Entity):number|null{
 const text=String(o.expires||'').trim();return o.expiresAt!==undefined&&o.expiresAt!==null?(typeof o.expiresAt==='number'?o.expiresAt:typeof o.expiresAt==='string'&&/^\d+(?:\.\d+)?$/.test(o.expiresAt.trim())?Number(o.expiresAt):NaN):text&&text.toLowerCase()!=='until revoked'?Date.parse(text):null;
}
export function privacyState(o:Entity,now=Date.now()):PrivacyState{
 if(o.status==='revoked')return 'Revoked';
 if(['superseded','ended','cancelled','completed'].includes(String(o.status)))return 'Ended';
 if(['paused','paused-by-security'].includes(String(o.status)))return 'Paused';
 const expiry=privacyExpiry(o);
 const starts=o.startsAt===undefined?null:typeof o.startsAt==='number'?o.startsAt:typeof o.startsAt==='string'&&o.startsAt.trim()?Date.parse(o.startsAt):NaN;
 if(starts!==null&&(!Number.isFinite(starts)||expiry!==null&&Number.isFinite(expiry)&&starts>=expiry))return 'Needs review';
 if(expiry!==null){if(!Number.isFinite(expiry))return 'Needs review';if(expiry<=now)return 'Expired';}
 if(o.startsAt!==undefined){const n=typeof o.startsAt==='number'?o.startsAt:Date.parse(String(o.startsAt));if(!Number.isFinite(n))return 'Needs review';if(n>now)return 'Not started';}
 if(o.status==='awaiting-participant-consent')return 'Waiting';
 if(o.kind==='permission'&&o.status==='active'&&/^(person|group):/.test(String(o.channelId||''))&&['Chuck','Chuck Crays'].includes(String(o.recipient))&&o.allParticipantsApproved!==true)return 'Waiting';
 if(o.status==='active'&&(!['recipient','purpose'].every(k=>typeof o[k]==='string'&&String(o[k]).trim())))return 'Needs review';
 return o.status==='active'?'Current':o.status==='expired'?'Expired':'Needs review';
}
export function ownPrivacyRecords(w:ProductWorld):Entity[]{
 if(!ownPrivateAccount(w))return [];
 return w.objects.filter(o=>o.owner===w.owner&&typeof o.id==='string'&&o.id.trim().length>0&&['permission','delegation'].includes(String(o.kind))&&w.objects.filter(x=>x.id===o.id).length===1);
}
export function ownPrivacyRecord(w:ProductWorld,id:string):Entity{
 const o=ownPrivacyRecords(w).find(o=>o.id===id);if(!o)throw new Error('Open your own original permission or delegation.');return o;
}
export function privacyReviewSnapshot(o:Entity):string{
 return JSON.stringify([o.id,o.owner,o.kind,o.status,o.name,o.recipient,o.purpose,o.dataType,o.scope,o.history,o.startsAt,o.expiresAt,o.expires,o.channelId,o.selectedMessageIds,o.allParticipantsApproved,o.version,o.revokeVersion,o.fitnessMediaId,o.fitnessMediaVersion,o.fitnessTrainerId,o.coachingRequestId,o.coachingPlanId,o.coachingPlanVersion,o.coachingEvidenceId,o.coachingSources,o.allowedDataClasses,o.exampleOnly]);
}
export function privacyExplanation(w:ProductWorld,id:string,now=Date.now()):string{
 const o=ownPrivacyRecord(w,id);
 return ['Please explain this one selected local permission record; do not execute changes.',`Name: ${String(o.name||'Local permission')}.`,`Recipient: ${String(o.recipient||'Not supplied')}.`,`Purpose: ${String(o.purpose||'Not supplied')}.`,`Data/action scope: ${String(o.dataType||o.scope||'Not supplied')}.`,`Current preview status: ${privacyState(o,now)}.`,`Original record: ${o.id}.`,'Only these selected metadata fields were shared. Do not infer access to private conversations, hidden affiliations, health readings, payment credentials or other records. Prepare any proposed changes for separate review.'].join('\n');
}

export function privacyNextExpiry(w:ProductWorld,now=Date.now()){const future=ownPrivacyRecords(w).flatMap(o=>{const start=typeof o.startsAt==='number'?o.startsAt:Date.parse(String(o.startsAt||''));return [privacyExpiry(o),start];}).filter((value):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>now);return future.length?Math.min(...future):0;}
