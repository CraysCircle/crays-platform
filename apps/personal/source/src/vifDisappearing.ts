import type {ProductWorld} from './productModel';
import {vifLocalViewKey} from './vifLocalView';
export const vifTimerOptions=[0,86400,604800,7776000] as const;
export const vifTimerLabel=(seconds:number)=>seconds===86400?'24 hours':seconds===604800?'7 days':seconds===7776000?'90 days':'Off';
export const vifTimerKey=(w:ProductWorld,id:string)=>vifLocalViewKey(w,id).replace('web-vif-local-view:','web-vif-timer:');
export type VifTimerChange={at:number;seconds:number};
export function vifTimer(w:ProductWorld,id:string){
 const raw=w.identity.signedIn?w.settings[vifTimerKey(w,id)]:undefined,expected=raw===undefined?'':String(raw);let changes:VifTimerChange[]=[];
 if(expected){const parsed=JSON.parse(expected);if(!parsed||Object.keys(parsed).sort().join(',')!=='changes,version'||parsed.version!==1||!Array.isArray(parsed.changes)||parsed.changes.length>2000||parsed.changes.some((p:VifTimerChange,i:number)=>!p||Object.keys(p).sort().join(',')!=='at,seconds'||!Number.isSafeInteger(p.at)||p.at<=0||!vifTimerOptions.includes(p.seconds as typeof vifTimerOptions[number])||i>0&&p.at<parsed.changes[i-1].at))throw Error('This saved message timer needs review. No timer has been replaced.');changes=parsed.changes;}
 return {expected,changes,seconds:changes.at(-1)?.seconds||0};
}
export function vifNewMessageExpiry(w:ProductWorld,id:string,createdAt:number){if(id==='chuck')return {};const timer=vifTimer(w,id);if(!w.identity.signedIn||!timer.seconds)return {};if(!Number.isSafeInteger(createdAt)||createdAt<=0)throw Error('A recorded message time is required before applying this timer.');const expiresAt=createdAt+timer.seconds*1000;if(!Number.isSafeInteger(expiresAt))throw Error('This message time needs review.');return {localViewTimer:{owner:w.owner,channel:vifTimerKey(w,id),createdAt,seconds:timer.seconds,expiresAt}};}
export function vifMessageExpiry(w:ProductWorld,id:string,message:object){
 const m=message as {createdAt?:unknown;localViewTimer?:unknown},d=m.localViewTimer;if(d===undefined)return Infinity;if(!d||typeof d!=='object'||Array.isArray(d))return -Infinity;const p=d as Record<string,unknown>;
 if(p.owner!==w.owner||p.channel!==vifTimerKey(w,id)||!Number.isSafeInteger(p.createdAt)||Number(p.createdAt)<=0||Number(m.createdAt)!==p.createdAt||!vifTimerOptions.includes(p.seconds as typeof vifTimerOptions[number])||p.seconds===0||p.expiresAt!==Number(p.createdAt)+Number(p.seconds)*1000||!Number.isSafeInteger(p.expiresAt))return -Infinity;
 return Number(p.expiresAt);
}
export const vifMessageExpired=(w:ProductWorld,id:string,message:object,now=Date.now())=>vifMessageExpiry(w,id,message)<=now;
export const vifNextMessageExpiry=(w:ProductWorld,id:string,messages:object[])=>Math.min(...messages.map(m=>vifMessageExpiry(w,id,m)).filter(at=>at>Date.now()));
