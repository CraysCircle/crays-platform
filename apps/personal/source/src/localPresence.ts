import type {ProductWorld,Venue} from './productModel.ts';
// A bounded fictional visit for the clickdummy, never a physical-presence proof.
// Missing legacy deadlines are held, not silently renewed during hydration.
export const samplePresenceDurationMs = 30 * 60 * 1000;
export function localPresenceCurrent(w:ProductWorld,venueId:string,now=Date.now()):boolean {
 const rows=w.venues.filter(v=>v.id===venueId),v=rows[0];
 return !!(w.identity.signedIn&&rows.length===1&&v.operatorActive&&v.membership!=='suspended'&&v.presence==='active'&&v.presenceSource==='fictional-local-qr'&&Number.isSafeInteger(v.presenceStartedAt)&&Number.isSafeInteger(v.presenceExpiresAt)&&Number.isSafeInteger(now)&&Number(v.presenceStartedAt)<=now&&Number(v.presenceExpiresAt)>now&&Number(v.presenceExpiresAt)-Number(v.presenceStartedAt)===samplePresenceDurationMs);
}
export function beginSamplePresence(v:Venue,now=Date.now()) {
 if(!Number.isSafeInteger(now)||now<=0)throw Error('Review the local sample visit time.');
 v.presence='active';v.presenceStartedAt=now;v.presenceExpiresAt=now+samplePresenceDurationMs;v.presenceSource='fictional-local-qr';
}
export function expireLocalPresence(w:ProductWorld,now=Date.now()):ProductWorld {
 const expired=w.venues.filter(v=>['active','expiring'].includes(v.presence)&&!localPresenceCurrent(w,v.id,now));
 if(!expired.length)return w;
 const next=structuredClone(w);
 for(const v of next.venues)if(expired.some(e=>e.id===v.id)){v.presence='expired';Object.keys(v.visibility).forEach(k=>v.visibility[k]=false);}
 return next;
}
export function localPresenceNextExpiry(w:ProductWorld,now=Date.now()) {
 return Math.min(...w.venues.filter(v=>localPresenceCurrent(w,v.id,now)).map(v=>Number(v.presenceExpiresAt)),Infinity);
}
