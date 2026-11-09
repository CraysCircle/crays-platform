import type { Post, ProductWorld } from './productModel.ts';
import { publicationSources } from './nostrSources.ts';
import { reminderTime } from './reminders.ts';

// One approved original and its actual destination selection, never merely its caption.
export function scheduledOriginal(w:ProductWorld,p:Post){
 return JSON.stringify({owner:w.owner,publicId:w.identity.publicId,signer:w.identity.signer,id:p.id,author:p.author,title:p.title,text:p.text,fullText:p.fullText,type:p.type,audience:p.audience,venueId:p.venueId,groupId:p.groupId,parentId:p.parentId,image:p.image,alt:p.alt,mediaId:p.mediaId,demoMedia:p.demoMedia,mediaAvailable:p.mediaAvailable,protected:p.protected,archived:p.archived,images:p.images,accessModel:p.accessModel,purchaseEligibility:p.purchaseEligibility,choices:p.choices,rightsTerms:p.rightsTerms,rightsDuration:p.rightsDuration,publishing:p.publishing,destinations:publicationSources(w,p).map(r=>({id:r.id,url:r.url,category:r.category,venueId:r.venueId,personId:r.personId,write:r.write,removed:r.removed})).sort((a,b)=>a.id.localeCompare(b.id))});
}
export function publicationDue(date:string,timezone:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date))throw Error('Choose the publication date and local time.');
 return reminderTime(date.slice(0,10),date.slice(11),timezone);
}
