import {isMerchantExampleVenue} from './merchantExampleScope.ts';
import type {ActionContext,ProductWorld} from './productModel.ts';
import {ownMerchantCheckout} from './merchantCheckout.ts';
import {localPreviewId} from './localPreviewId.ts';

export type MerchantInvoiceDocument={id:string;version:number;createdAt:number;text:string;source:'explicit-fictional-seller';liveExecution:false;supersedes?:string};
export type MerchantInvoicePreview={kind:'merchant-invoice-preview';owner:string;orderId:string;paymentId:string;venueId:string;sellerId:string;sellerName:string;sourceTaskId:string;snapshot:string;amountMinor:number;currency:'USD';liveExecution:false;revision:number;requestId:string;state:'requested'|'unknown'|'missing'|'available';createdAt:number;documents:MerchantInvoiceDocument[];events:{key:string;operation:string;payload:string;at:number}[];correction?:{id:string;documentId:string;note:string;state:'requested'|'unknown'|'declined'|'issued';createdAt:number;response?:string}};
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
export function invoiceOriginal(w:ProductWorld,orderId:string,paymentId:string){
 const matches=w.objects.filter(o=>o.id===orderId),o=matches[0],p=ownMerchantCheckout(w,paymentId),c=p?.merchantCheckout;
 if(matches.length!==1||!o||o.owner!==w.owner||o.kind!=='order'||!p||!c||p.sourceId!==o.id||c.venueId!==o.venueId||!isMerchantExampleVenue(c.venueId)||!['confirmed','refunded'].includes(p.status))return;
 return {order:o,payment:p,checkout:c};
}
export function merchantInvoiceRecord(w:ProductWorld,orderId:string,paymentId:string){
 const original=invoiceOriginal(w,orderId,paymentId);if(!original)return;const r=original.order.merchantInvoicePreview as MerchantInvoicePreview|undefined,c=original.checkout;
 if(!r||r.kind!=='merchant-invoice-preview'||r.owner!==w.owner||r.orderId!==orderId||r.paymentId!==paymentId||r.venueId!==c.venueId||r.sellerId!==c.sellerId||r.sellerName!==c.sellerName||r.sourceTaskId!==(c.sourceTaskId||'')||r.snapshot!==c.orderSnapshot||r.amountMinor!==c.amountMinor||r.currency!=='USD'||r.liveExecution!==false||!Number.isSafeInteger(r.revision)||r.revision<1||!Array.isArray(r.events)||!Array.isArray(r.documents)||!['requested','unknown','missing','available'].includes(r.state))return;
 if(r.documents.some((d,i)=>d.version!==i+1||d.source!=='explicit-fictional-seller'||d.liveExecution!==false||!d.id||!d.text||!Number.isFinite(d.createdAt)||i>0&&d.supersedes!==r.documents[i-1].id)||new Set(r.documents.map(d=>d.id)).size!==r.documents.length||r.state==='available'&&!r.documents.length||r.state!=='available'&&r.documents.length)return;
 if(r.correction&&(!r.documents.some(d=>d.id===r.correction!.documentId)||!['requested','unknown','declined','issued'].includes(r.correction.state)||!r.correction.note?.trim()))return;
 return r;
}
function document(r:MerchantInvoicePreview):MerchantInvoiceDocument{
 const previous=r.documents.at(-1),version=r.documents.length+1;
 return {id:localPreviewId(),version,createdAt:Date.now(),source:'explicit-fictional-seller',liveExecution:false,...(previous?{supersedes:previous.id}:{}),text:[
  'CRAYS · FICTIONAL SELLER DOCUMENT', 'NOT A TAX INVOICE · NOT VALID FOR ACCOUNTING',
  `Seller: ${r.sellerName}`,`Seller reference: ${r.sellerId}`,`Spot: ${r.venueId}`,`Original order: ${r.orderId}`,`Original payment: ${r.paymentId}`,`Reviewed order total: ${(r.amountMinor/100).toFixed(2)} USD`,`Example document version: ${version}`,
  version>1?'Correction reviewed in this selected fictional seller scenario. Earlier document versions remain in the original history.':'Document supplied in the explicitly selected fictional seller scenario.',
  'No real invoice number, tax assessment, tax registration, billing address verification or legal invoice issuance is represented. Payment, fulfilment, refunds and this document have independent states.',
 ].join('\n')};
}
export function applyMerchantInvoicePreview(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('merchant.invoice.example.'))return;
 need(w.identity.relayState!=='offline','Reconnect your original account before sending or checking a seller document request.');
 const original=invoiceOriginal(w,ctx.objectId||'',d.paymentId);need(original,'Open your own original paid Coffee or Store order and payment.');const {order:o,checkout:c}=original;
 need(ctx.venueId===c.venueId&&(!ctx.sourceTaskId||ctx.sourceTaskId===(c.sourceTaskId||'')),'Keep this original seller, Spot and Chuck task.');
 need(d.approved==='Yes'&&!!d.actionKey?.trim(),'Review and approve this explicit document action.');
 let r=merchantInvoiceRecord(w,o.id,d.paymentId);if(o.merchantInvoicePreview)need(r,'The original seller document needs review.');
 const payload=JSON.stringify({outcome:d.outcome||'',documentId:d.documentId||'',note:d.note||''});
 const prior=r?.events.find(e=>e.key===d.actionKey);if(prior){need(prior.operation===op&&prior.payload===payload,'This reference belongs to another document action.');return {objectId:o.id,message:'The original document action is retained. No duplicate request or document.'};}
 if(op==='merchant.invoice.example.request'){
  need(!r,'Keep the existing document request and check its response.');
  r={kind:'merchant-invoice-preview',owner:w.owner,orderId:o.id,paymentId:d.paymentId,venueId:c.venueId,sellerId:c.sellerId,sellerName:c.sellerName,sourceTaskId:c.sourceTaskId||'',snapshot:c.orderSnapshot,amountMinor:c.amountMinor,currency:'USD',liveExecution:false,revision:1,requestId:localPreviewId(),state:'requested',createdAt:Date.now(),documents:[],events:[]};o.merchantInvoicePreview=r;
 }else{
  need(r&&d.expectedRevision===String(r.revision),'Review the current original document status.');
  if(op==='merchant.invoice.example.check'){
   need(!r.documents.length&&['Unknown','Missing','Available'].includes(d.outcome),'Check this same outstanding document request.');
   if(d.outcome==='Available'){
    const sellers=w.venues.filter(v=>v.id===c.venueId);need(sellers.length===1&&sellers[0].operatorActive&&sellers[0].name===c.sellerName,'The exact original seller is unavailable. Retain this unresolved request.');r.documents.push(document(r));r.state='available';
   }else r.state=d.outcome==='Missing'?'missing':'unknown';
  }else if(op==='merchant.invoice.example.correction.request'){
   need(r.state==='available'&&!r.correction&&r.documents.at(-1)?.id===d.documentId,'Review this document before requesting one correction.');need(!!d.note?.trim()&&d.note.length<=2000&&d.reviewedNote===d.note,'Review these exact correction words before sending.');
   r.correction={id:localPreviewId(),documentId:d.documentId,note:d.note,state:'requested',createdAt:Date.now()};
  }else if(op==='merchant.invoice.example.correction.check'){
   need(r.correction&&['requested','unknown'].includes(r.correction.state)&&['Unknown','Declined','Issued'].includes(d.outcome),'Check the same unresolved correction request.');
   if(d.outcome==='Issued'){
    const sellers=w.venues.filter(v=>v.id===c.venueId);need(sellers.length===1&&sellers[0].operatorActive&&sellers[0].name===c.sellerName,'The original seller is unavailable. The existing document remains in your history.');r.documents.push(document(r));r.correction.state='issued';r.correction.response='The selected fictional seller supplied a replacement example document. No actual billing or tax details were amended.';
   }else {r.correction.state=d.outcome==='Declined'?'declined':'unknown';r.correction.response=d.outcome==='Declined'?'The selected fictional seller declined the correction. The original document is retained.':'The seller response is unresolved. No replacement was issued.';}
  }else throw Error('Choose a supported seller document example.');
  r.revision++;
 }
 r.events.push({key:d.actionKey,operation:op,payload,at:Date.now()});
 return {objectId:o.id,message:'Original seller document example updated. No payment, refund, fulfilment or real invoice was changed.'};
}
