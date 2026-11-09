import {creatorContentFormats} from './content-formats.mjs';
export const ownPurchaseFormats=Object.freeze(['all',...creatorContentFormats]);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>plain(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
export function captureOwnPurchaseListCommand(input={}){
 requireValue(plain(input)&&Object.keys(input).every(k=>['view','query','format','limit','before'].includes(k)),'Invalid own purchase query');
 const{view='all',query='',format='all',limit=30,before=null}=input;
 requireValue(['all','library','needs-review'].includes(view)&&ownPurchaseFormats.includes(format)&&typeof query==='string'&&query.length<=256&&!/[\x00-\x1f\x7f]/.test(query)&&Number.isSafeInteger(limit)&&limit>=1&&limit<=50,'Invalid own purchase query');
 if(before!==null)requireValue(exact(before,['afterOrderId','scope'])&&id(before.afterOrderId)&&hex(before.scope),'Invalid own purchase cursor');
 return Object.freeze({view,query,format,limit,before:before?Object.freeze({afterOrderId:before.afterOrderId,scope:before.scope}):null});
}
export function captureOwnPurchaseOriginalCommand(input){
 requireValue(exact(input,['kind','id'])&&['order','receipt','licence','library-entry'].includes(input.kind)&&id(input.id),'Invalid own purchase original');
 return Object.freeze({kind:input.kind,id:input.id});
}
const rowKeys=['orderId','offerId','offerVersion','originalFixtureId','creatorFixtureId','creatorPubkey','previewEventId','creatorDisplayName','spotId','spotName','title','format','totalMinor','currency','fixtureOrderState','simulation','fixtureIdsAreCoreIds','payment','rights','mediaAccess','receiptId','legalTaxInvoice','libraryEntryId','refundState','actualFundsMoved'];
const named=v=>typeof v==='string'&&v.trim().length>0&&v.length<=256&&!/^(?:nostr:)?(?:npub1|nprofile1)/i.test(v.trim())&&!/^[a-f0-9]{64}$/i.test(v.trim());
const orderStates=['not-started','awaiting-payment','unknown-payment','failed-payment','expired-payment','paid-proof-pending','paid-licence-valid','licence-expired','refund-pending','refunded'];
/** Fixture-only read DTO. It conveys neither a real Core identity nor a charge,
 * rights proof or delivered media. Never accept unexpected private authority,
 * raw buyer/provider records or source paths into the client. Render titles
 * as text; this validator does not authorize HTML execution.
 */
export function validOwnCreatorPurchase(row){
 if(!exact(row,rowKeys)||!['orderId','offerId','offerVersion','originalFixtureId','creatorFixtureId','spotId','receiptId'].every(k=>id(row[k]))||!hex(row.creatorPubkey)||!hex(row.previewEventId)||!named(row.creatorDisplayName)||!named(row.spotName)||typeof row.title!=='string'||!row.title.trim()||row.title.length>1024||!creatorContentFormats.includes(row.format)||row.totalMinor!==400||row.currency!=='USD'||!orderStates.includes(row.fixtureOrderState)||row.simulation!==true||row.fixtureIdsAreCoreIds!==false||row.legalTaxInvoice!==false||row.actualFundsMoved!==false||!(row.libraryEntryId===null||id(row.libraryEntryId)))return false;
 const p=row.payment,r=row.rights,m=row.mediaAccess;
 if(!exact(p,['state','attemptId','reconcileSameAttempt','actualProviderEvidence'])||!exact(r,['state','licenceId','actualRGBProof','transferAllowed','resaleAllowed'])||!exact(m,['state','fixtureState','actualProtectedDelivery'])||p.actualProviderEvidence!==false||r.actualRGBProof!==false||r.transferAllowed!==false||r.resaleAllowed!==false||m.actualProtectedDelivery!==false||m.state!=='protected-content-not-delivered'||!['available-demo','preview-only'].includes(m.fixtureState))return false;
 const expectedRights={'paid-proof-pending':'proof-pending','paid-licence-valid':'valid-demo','licence-expired':'expired','refund-pending':'valid-demo',refunded:'revoked-refund'}[row.fixtureOrderState]||'not-issued';
 const expectedPayment=row.fixtureOrderState==='refunded'?'refunded-simulation':expectedRights!=='not-issued'?'confirmed-simulation':row.fixtureOrderState;
 return r.state===expectedRights&&p.state===expectedPayment&&p.reconcileSameAttempt===['unknown-payment','awaiting-payment'].includes(row.fixtureOrderState)&&(row.fixtureOrderState==='not-started'?p.attemptId===null:id(p.attemptId))&&(r.state==='not-issued'?r.licenceId===null:id(r.licenceId))&&row.refundState===(row.fixtureOrderState==='refunded'?'confirmed-demo':row.fixtureOrderState==='refund-pending'?'pending-demo':null);
}
export function ownPurchaseMatchesView(row,view){
 if(view==='all')return true;
 if(view==='library')return row.rights.licenceId!==null;
 return view==='needs-review'&&(row.payment.reconcileSameAttempt||row.rights.state==='proof-pending'||row.rights.state==='expired'||row.refundState==='pending-demo'||row.payment.state==='confirmed-simulation'&&row.rights.state==='valid-demo'&&!row.mediaAccess.actualProtectedDelivery);
}
export function ownPurchaseMatchesQuery(row,query){return !query.trim()||`${row.title}\n${row.creatorDisplayName}\n${row.spotName}\n${row.orderId}\n${row.receiptId}`.toLowerCase().includes(query.trim().toLowerCase());}
export function ownPurchaseMatchesFormat(row,format){return format==='all'||row.format===format;}
const baseKeys=['sourceRealm','scopeKey','simulation','fixtureIdsAreCoreIds','realCoreAuthority','actualPaymentEnabled','actualRGBProof','actualProtectedMediaDelivered','privateOtherBuyersIncluded'];
const validBase=v=>v.sourceRealm==='crays-isolated-demo'&&hex(v.scopeKey)&&v.simulation===true&&v.fixtureIdsAreCoreIds===false&&v.realCoreAuthority===false&&v.actualPaymentEnabled===false&&v.actualRGBProof===false&&v.actualProtectedMediaDelivered===false&&v.privateOtherBuyersIncluded===false;
export function validOwnPurchasePage(value,input={}){
 let command;try{command=captureOwnPurchaseListCommand(input);}catch{return false;}
 if(!exact(value,[...baseKeys,'schema','view','query','format','limit','entries','visibleCount','hasMore','nextCursor'])||!validBase(value)||value.schema!=='crays.own-creator-purchase-page.v2'||value.view!==command.view||value.query!==command.query||value.format!==command.format||value.limit!==command.limit||!Array.isArray(value.entries)||value.entries.length>command.limit||!Number.isSafeInteger(value.visibleCount)||value.visibleCount<value.entries.length||typeof value.hasMore!=='boolean'||value.hasMore!==Boolean(value.nextCursor)||!(value.nextCursor===null||exact(value.nextCursor,['afterOrderId','scope']))||command.before&&command.before.scope!==value.scopeKey)return false;
 if(!command.before&&value.hasMore!==(value.visibleCount>value.entries.length))return false;
 if(value.hasMore&&value.visibleCount<=value.entries.length)return false;
 let last=command.before?.afterOrderId||'';
 for(const row of value.entries){if(!validOwnCreatorPurchase(row)||row.orderId<=last||!ownPurchaseMatchesView(row,command.view)||!ownPurchaseMatchesFormat(row,command.format)||!ownPurchaseMatchesQuery(row,command.query))return false;last=row.orderId;}
 if(value.hasMore&&(!value.entries.length||!exact(value.nextCursor,['afterOrderId','scope'])||value.nextCursor.afterOrderId!==last||value.nextCursor.scope!==value.scopeKey))return false;
 return !value.nextCursor||value.hasMore;
}
export function validOwnPurchaseOriginal(value,input){
 let command;try{command=captureOwnPurchaseOriginalCommand(input);}catch{return false;}
 if(!exact(value,[...baseKeys,'schema','selector','state','original'])||!validBase(value)||value.schema!=='crays.own-creator-purchase-original.v2'||!exact(value.selector,['kind','id'])||value.selector.kind!==command.kind||value.selector.id!==command.id)return false;
 if(value.state==='unavailable')return value.original===null;
 if(value.state!=='available'||!validOwnCreatorPurchase(value.original))return false;
 const row=value.original,target=command.kind==='licence'?row.rights.licenceId:row[{order:'orderId',receipt:'receiptId','library-entry':'libraryEntryId'}[command.kind]];
 return target===command.id;
}
