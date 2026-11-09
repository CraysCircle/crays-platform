import type {ProductWorld,Entity,ActionContext} from './productModel.ts';
import {connectionFor,appById} from './appConnections.ts';
import {localPreviewId} from './localPreviewId.ts';
export const occasionContactProviders=[{id:'icloud-contacts',name:'iCloud Contacts',scope:'read'},{id:'nextcloud',name:'Nextcloud contacts',scope:'contacts-read'}];
export type OccasionContactCriteria={providerId:string;connectionId:string;connectionVersion:string;account:string;contactRef:string};
export type OccasionContact={personName:string;month:string;day:string;year:string};
export type OccasionContactScenario='selected-contact'|'unknown-date'|'private-denied'|'failed';
export type OccasionContactPreview=Entity&{kind:'occasion-contact-preview';criteria:OccasionContactCriteria;contact:OccasionContact;scenario:OccasionContactScenario;status:'ready-preview'|'denied-preview'|'failed-preview';recordedAt:number;reviewSnapshot:string;liveExecution:false;origin:'fictional-selected-contact-response'};
const need=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
function fields(value:unknown,keys:string[]){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)&&typeof (value as Record<string,unknown>)[key]==='string')&&Object.keys(value).every(k=>keys.includes(k));}
export function occasionContactAccess(w:ProductWorld,c:OccasionContactCriteria){
 if(!w.identity.signedIn)return {ready:false,status:'signed-out',message:'Sign in to choose your own contact source.'};
 if(!fields(c,['providerId','connectionId','connectionVersion','account','contactRef']))return {ready:false,status:'invalid-source',message:'Review the exact account and one selected contact reference.'};
 const provider=occasionContactProviders.find(p=>p.id===c.providerId),connections=w.objects.filter(o=>o.owner===w.owner&&o.kind==='app-connection'&&o.providerId===c.providerId),connection=provider?connectionFor(w,provider.id):undefined;
 if(connections.length>1)return {ready:false,status:'ambiguous-source',message:'Resolve the duplicate own account records before using a contact.'};
 if(!provider||!connection||connection.status!=='connected-demo')return {ready:false,status:'connection-required',message:'Connect your own account, or keep entering this occasion manually.'};
 if(!Number.isSafeInteger(Number(connection.version))||Number(connection.version)<1||String(Number(connection.version))!==String(connection.version)||connection.id!==c.connectionId||String(connection.version)!==c.connectionVersion||connection.account!==c.account)return {ready:false,status:'source-changed',message:'This account changed. Review the current selected-contact source.'};
 if(!Array.isArray(connection.scopes)||!connection.scopes.includes(provider.scope)||!appById(provider.id)?.scopes.some(s=>s.id===provider.scope))return {ready:false,status:'permission-required',message:'Permission to read this selected contact is missing or revoked. Manual entry remains available.'};
 if(!c.contactRef.trim()||c.contactRef.length>250)return {ready:false,status:'invalid-source',message:'Choose one exact fictional contact reference; no address book will be imported.'};
 return {ready:true,status:'ready',message:'This own account permits a selected-contact preview only. No contact was read or imported.'};
}
function validateContact(contact:OccasionContact,scenario:OccasionContactScenario){
 need(fields(contact,['personName','month','day','year'])&&contact.personName.trim()&&contact.personName.length<=160,'Review one selected contact name.');
 if(scenario!=='selected-contact'){need(!contact.month&&!contact.day&&!contact.year,'Unknown or unavailable dates must stay unknown.');return;}
 need(/^(0?[1-9]|1[0-2])$/.test(contact.month)&&/^(0?[1-9]|[12]\d|3[01])$/.test(contact.day)&&(!contact.year||/^[1-9]\d{3}$/.test(contact.year)),'Review the known occasion date, leaving an unknown year blank.');
 const y=contact.year||'2000',date=`${y}-${contact.month.padStart(2,'0')}-${contact.day.padStart(2,'0')}`,parsed=new Date(`${date}T12:00:00Z`);need(Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date,'Choose a real occasion date; no date will be inferred.');
}
export function occasionContactReview(criteria:OccasionContactCriteria,contact:OccasionContact,scenario:OccasionContactScenario){return JSON.stringify({criteria,contact,scenario});}
export function occasionContactPreviewFor(w:ProductWorld,id:string){if(!w.identity.signedIn)return;const found=w.objects.filter(o=>o.owner===w.owner&&o.id===id);return found.length===1&&found[0].kind==='occasion-contact-preview'?found[0] as OccasionContactPreview:undefined;}
export function occasionContactSourceState(w:ProductWorld,id:string){
 const preview=occasionContactPreviewFor(w,id);if(!preview)return {ready:false,status:'source-unavailable',message:'Open your own original selected-contact preview.'};
 const access=occasionContactAccess(w,preview.criteria);if(!access.ready)return {...access,preview};
 try{need(['selected-contact','unknown-date','private-denied','failed'].includes(preview.scenario),'Review the source response.');validateContact(preview.contact,preview.scenario);need(preview.status===(preview.scenario==='private-denied'?'denied-preview':preview.scenario==='failed'?'failed-preview':'ready-preview')&&Number.isFinite(preview.recordedAt)&&preview.reviewSnapshot===occasionContactReview(preview.criteria,preview.contact,preview.scenario)&&preview.liveExecution===false&&preview.origin==='fictional-selected-contact-response','Review the original immutable contact response.');}catch{return {ready:false,status:'source-changed',message:'This original contact response is invalid or changed.',preview};}
 if(preview.scenario==='private-denied'||preview.status==='denied-preview')return {ready:false,status:'private-denied',message:'This fictional contact is private or access was denied. No birthday is available.',preview};
 if(preview.scenario==='failed'||preview.status==='failed-preview')return {ready:false,status:'failed',message:'The fictional contact response failed. Keep the date unknown or enter your own known date.',preview};
 return {ready:true,status:preview.scenario==='unknown-date'?'unknown-date':'ready',message:preview.scenario==='unknown-date'?'This selected fictional contact has no known occasion date. Nothing is inferred.':'One selected fictional contact is ready for your review. No real address book was read.',preview};
}
export function applyOccasionContactPreview(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('complete.occasion-contact.'))return;need(op==='complete.occasion-contact.preview'&&!ctx.objectId,'Use a new immutable selected-contact response; historical responses cannot be overwritten.');
 let criteria:OccasionContactCriteria,contact:OccasionContact;try{criteria=JSON.parse(data.criteria);contact=JSON.parse(data.contact);}catch{throw Error('Review the selected account and contact fields.');}
 const access=occasionContactAccess(w,criteria);need(access.ready,access.message);const scenario=data.scenario as OccasionContactScenario;need(['selected-contact','unknown-date','private-denied','failed'].includes(scenario),'Choose an explicit fictional response.');validateContact(contact,scenario);const snapshot=occasionContactReview(criteria,contact,scenario);need(data.approved==='Yes'&&data.reviewSnapshot===snapshot,'Review this exact own account, selected contact and fictional response.');
 const record:OccasionContactPreview={id:localPreviewId(),owner:w.owner,kind:'occasion-contact-preview',name:contact.personName,criteria:structuredClone(criteria),contact:structuredClone(contact),scenario,status:scenario==='private-denied'?'denied-preview':scenario==='failed'?'failed-preview':'ready-preview',recordedAt:Date.now(),reviewSnapshot:snapshot,liveExecution:false,origin:'fictional-selected-contact-response'};w.objects.unshift(record);return {objectId:record.id,message:'Your selected fictional contact response is retained. No address book, birthday, message or VIF connection was imported or created.'};
}
