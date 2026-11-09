import type {ProductWorld,Entity,ActionContext} from './productModel';
import {supportSource} from './supportSource';
import {localPreviewId} from './localPreviewId';
export type SupportKind='help'|'problem'|'feedback';
export type SupportContext=Pick<ActionContext,'objectId'|'sourceId'|'postId'|'venueId'|'productId'|'purpose'>;
const need=(value:unknown,message:string)=>{if(!value)throw Error(message);};
const reference=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=300;
const ready=(w:ProductWorld)=>w.identity.signedIn===true&&reference(w.owner);
export function supportContext(value:unknown):Partial<SupportContext>{
 need(value&&typeof value==='object'&&!Array.isArray(value),'Review the original support context.');
 const result:Partial<SupportContext>={};for(const [key,v] of Object.entries(value as Record<string,unknown>)){need(['objectId','sourceId','postId','venueId','productId','purpose'].includes(key),'Review only the original source references.');if(v!==undefined&&v!==''){need(reference(v),'Review the exact original source reference.');result[key as keyof SupportContext]=String(v);}}return result;
}
export function supportDraftReview(w:ProductWorld,kind:SupportKind,text:string,scope:string,context:Partial<SupportContext>,paymentChoice=''){
 need(ready(w),'Sign in to prepare your own support request.');need(['help','problem','feedback'].includes(kind),'Choose this report or feedback purpose.');
 need(typeof text==='string'&&!!text.trim()&&text.length<=12000,'Describe the issue or feedback, up to 12,000 characters.');need(typeof scope==='string'&&scope.length<=2000,'Keep the scope up to 2,000 characters.');need(typeof paymentChoice==='string'&&paymentChoice.length<=300,'Choose the exact original payment.');
 const ctx=supportContext(context),source=supportSource(w,ctx,paymentChoice);need(!source.held,'Review the exact original source, payment and access before continuing.');
 return JSON.stringify({owner:w.owner,kind,text:text.trim(),scope:scope.trim(),context:ctx,paymentChoice,source:source.review});
}
export function ownSupportRecords(w:ProductWorld){if(!ready(w)||!Array.isArray(w.objects))return [];return w.objects.filter(o=>o&&['support-ticket','visit-review'].includes(String(o.kind))&&o.owner===w.owner&&reference(o.id)&&w.objects.filter(x=>x?.id===o.id).length===1&&typeof o.name==='string'&&typeof o.text==='string'&&(o.realDelivery===undefined||o.realDelivery===false)&&(o.localOnly===undefined||o.localOnly===true)&&['submitted-demo','under-review'].includes(String(o.status))&&typeof o.status==='string'&&(o.version===undefined||Number.isSafeInteger(o.version)&&Number(o.version)>0)&&(o.requestId===undefined||reference(o.requestId)&&w.objects.filter(x=>x?.owner===w.owner&&x.kind==='support-ticket'&&x.requestId===o.requestId).length===1));}
export const ownSupportTickets=(w:ProductWorld)=>ownSupportRecords(w).filter(o=>o.kind==='support-ticket');
export function supportTicketReview(w:ProductWorld,id:string){need(ready(w),'Sign in to review your own support request.');const row=ownSupportRecords(w).find(o=>o.id===id);need(row,'Open the exact own unambiguous original ticket.');return JSON.stringify({owner:w.owner,original:row});}
export function applyWebSupport(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('web.support.'))return;
 need(ready(w)&&(ctx.personId===undefined||ctx.personId===w.owner),'Sign in to use your own support requests.');need(data.approved==='Yes','Review this exact local request first.');
 if(op==='web.support.submit'){
  need(reference(data.requestId),'Review this original request reference.');let context:Partial<SupportContext>;try{context=supportContext(JSON.parse(data.context||'{}'));}catch{throw Error('Review the exact original source context.');}
  const review=supportDraftReview(w,data.kind as SupportKind,data.text,data.scope,context,data.paymentChoice||'');need(data.reviewSnapshot===review,'The request, source, permission or payment changed. Review again.');
  const originals=w.objects.filter(o=>o?.owner===w.owner&&o.kind==='support-ticket'&&o.requestId===data.requestId);
  if(originals.length){need(originals.length===1&&ownSupportTickets(w).includes(originals[0])&&originals[0].submissionReview===review,'Keep and review the same original request. No replacement was created.');return {objectId:originals[0].id,message:'Opened the same local sample request. No duplicate was created or delivered.'};}
  const source=supportSource(w,context,data.paymentChoice||''),id=localPreviewId();need(!w.objects.some(o=>o?.id===id),'Review the original request identity.');
  const names={help:'Help request',problem:'Problem report',feedback:'Your feedback'};
  const ticket:Entity={id,owner:w.owner,kind:'support-ticket',name:names[data.kind as SupportKind],text:data.text.trim(),scope:data.scope.trim(),status:'submitted-demo',requestId:data.requestId,submissionReview:review,supportSourceReview:source.review,source:source.state.sourceId,responsibleParty:source.state.partyName,responsiblePartyId:source.state.partyId,sourcePaymentId:source.state.paymentId,supportContext:context,paymentChoice:data.paymentChoice||'',supportKind:data.kind,supportFeatureId:typeof ctx.featureId==='string'?ctx.featureId:'',version:1,createdAt:Date.now(),localOnly:true,realDelivery:false};w.objects.unshift(ticket);
  return {objectId:id,message:'Sample request saved locally. No support message was delivered and no payment, booking, licence or media status changed.'};
 }
 need(op==='web.support.check','Choose the original support action.');need(data.reviewSnapshot===supportTicketReview(w,ctx.objectId||''),'This original ticket changed. Review it again.');
 const row=ownSupportRecords(w).find(o=>o.id===ctx.objectId)!;
 if(row.status==='under-review')return {objectId:row.id,message:'This original sample ticket is already marked for review. No provider status was checked.'};
 row.status='under-review';row.version=Number(row.version||0)+1;row.checkedLocallyAt=Date.now();row.realDelivery=false;
 return {objectId:row.id,message:'This same sample ticket is marked for review locally. This is not a provider response, refund or confirmation of delivery.'};
}
