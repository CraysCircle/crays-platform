import type {ProductWorld} from './productModel.ts';
import {venueSetupGates} from './venueSetup.ts';
/** A stored role label is display data. Only the separately reviewed, released setup establishes operator authority. */
export function verifiedVenueOperator(w:ProductWorld,venueId:string) {
 if(!w.identity.signedIn)return false;
 const venue=w.venues.find(v=>v.id===venueId&&v.operatorActive);
 const setup=w.objects.find(o=>o.kind==='venue-setup'&&o.owner===w.owner&&o.status==='released-preview'&&o.venueId===venueId&&venueId===`venue-${o.id}`);
 if(!venue||!setup||!setup.config||typeof setup.config!=='object'||Array.isArray(setup.config))return false;
 const organisation=(setup.config as Record<string,unknown>).organisation;
 if(typeof organisation!=='string'||!organisation.trim())return false;
 const authority=w.objects.find(o=>o.kind==='operator-authority'&&o.owner===w.owner&&o.setupId===setup.id&&o.organisation===organisation&&o.status==='verified-demo'&&typeof o.reviewedBy==='string'&&o.reviewedBy.trim()&&(o.expiresAt===undefined||(Number.isFinite(Number(o.expiresAt))&&Number(o.expiresAt)>Date.now())));
 if(!authority)return false;
 try{const gates=venueSetupGates(w,setup);return gates.authority&&gates.configuration&&gates.relay;}catch{return false;}
}
