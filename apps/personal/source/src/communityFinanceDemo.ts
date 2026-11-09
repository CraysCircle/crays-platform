/** Frontend-only interaction state for the labelled clickdummy. No accounting model or provider adapter. */
import type {CommunityMembership} from './communityMemberships';
import {sha256Hex} from './privateEpubGenerator';
export type FinanceDocumentDemo={id:string;requestId:string;state:'pending'|'unknown'|'missing'|'failed'|'issued';amount:number;issuedAt?:number;body?:string;hash?:string};
export type RefundDemo={id:string;amount:number;reason:string;at:number;payout:'requested'|'pending'|'unknown'|'failed'|'paid';credit:FinanceDocumentDemo};
export type AllocationDemo={id:string;amount:number;at:number;reversed:boolean};
export type CommunityFinanceDemo={version:1;owner:string;membershipId:string;source:string;revision:number;invoice:FinanceDocumentDemo;refunds:RefundDemo[];allocations:AllocationDemo[];history:{id:string;label:string;at:number}[]};
const digest=(value:unknown)=>sha256Hex(JSON.stringify(value));
export function communityFinanceSource(r:CommunityMembership){return digest({owner:r.owner,subject:r.subjectId,id:r.id,createdAt:r.createdAt,offer:r.offer});}
const minor=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>0;
const time=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function initialCommunityFinanceDemo(r:CommunityMembership):CommunityFinanceDemo{return {version:1,owner:r.owner,membershipId:r.id,source:communityFinanceSource(r),revision:1,invoice:{id:'',requestId:'example-invoice-request:'+r.id,state:r.invoice.status==='pending'?'pending':'missing',amount:r.offer.amountMinor},refunds:[],allocations:[],history:[]};}
export function communityFinanceDemo(r:CommunityMembership,raw:string):CommunityFinanceDemo|undefined{
 try{if(!minor(r.offer.amountMinor))return;const s=(raw?JSON.parse(raw):initialCommunityFinanceDemo(r)) as CommunityFinanceDemo;
  if(s.version!==1||s.owner!==r.owner||s.membershipId!==r.id||s.source!==communityFinanceSource(r)||!Number.isSafeInteger(s.revision)||s.revision<1||!Array.isArray(s.refunds)||!Array.isArray(s.allocations)||!Array.isArray(s.history))return;
  const document=(d:FinanceDocumentDemo,amount:number)=>d&&d.amount===amount&&['pending','unknown','missing','failed','issued'].includes(d.state)&&typeof d.requestId==='string'&&!!d.requestId&&(d.state==='issued'?typeof d.id==='string'&&!!d.id&&time(d.issuedAt)&&typeof d.body==='string'&&!!d.body&&d.body.length<=64000&&d.hash===sha256Hex(d.body):d.id===''&&d.body===undefined&&d.hash===undefined&&d.issuedAt===undefined);
  if(!document(s.invoice,r.offer.amountMinor)||!s.refunds.every(f=>typeof f.id==='string'&&!!f.id&&minor(f.amount)&&typeof f.reason==='string'&&f.reason.length<=500&&time(f.at)&&['requested','pending','unknown','failed','paid'].includes(f.payout)&&document(f.credit,f.amount)))return;
  if(!s.allocations.every(a=>typeof a.id==='string'&&!!a.id&&minor(a.amount)&&time(a.at)&&typeof a.reversed==='boolean')||!s.history.every(e=>typeof e.id==='string'&&!!e.id&&typeof e.label==='string'&&time(e.at)))return;
  const ids=[s.invoice.requestId,...(s.invoice.id?[s.invoice.id]:[]),...s.refunds.flatMap(f=>[f.id,f.credit.requestId,...(f.credit.id?[f.credit.id]:[])]),...s.allocations.map(a=>a.id),...s.history.map(e=>e.id)];if(new Set(ids).size!==ids.length)return;
  const reserved=s.refunds.filter(f=>f.payout!=='failed').reduce((n,f)=>n+f.amount,0),allocated=s.allocations.filter(a=>!a.reversed).reduce((n,a)=>n+a.amount,0);if(!Number.isSafeInteger(reserved)||!Number.isSafeInteger(allocated)||reserved+(r.refund.status==='none'?0:r.refund.amountMinor)>r.offer.amountMinor||allocated>r.offer.amountMinor)return;
  if((s.refunds.length||s.allocations.length)&&r.payment.status!=='paid')return;
  if(s.allocations.length&&s.invoice.state!=='issued')return;
  if(s.refunds.some(f=>f.credit.state==='issued')&&s.invoice.state!=='issued')return;
  return s;
 }catch{return;}
}
export const communityFinanceReview=(r:CommunityMembership,s:CommunityFinanceDemo)=>digest({source:communityFinanceSource(r),payment:r.payment,billing:r.billing,legacyRefund:r.refund,demo:s});
export function communityFinanceRemaining(r:CommunityMembership,s:CommunityFinanceDemo){const earlier=r.refund.status==='none'?0:r.refund.amountMinor;return Math.max(0,r.offer.amountMinor-earlier-s.refunds.filter(f=>f.payout!=='failed').reduce((n,f)=>n+f.amount,0));}
export function communityFinanceMoneyInput(value:string){if(!/^\d+(?:\.\d{1,2})?$/.test(value))return;const [whole,fraction='']=value.split('.'),amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));return minor(amount)?amount:undefined;}
function textDocument(r:CommunityMembership,document:FinanceDocumentDemo,kind:'Invoice'|'Correction',at:number){return ['CRAYS DESIGN EXAMPLE — NOT A TAX INVOICE',kind+' example',r.offer.groupName+' · '+r.offer.name,'Supplier: '+r.offer.sellerName,'Bill to: '+(r.billing?.name||'Not supplied'),'Billing address: '+(r.billing?.address||'Not supplied'),'Amount: USD '+(document.amount/100).toFixed(2),'Period: '+r.offer.period,'Recorded: '+new Date(at).toISOString(),'Tax breakdown: not supplied','Original membership: '+r.id,'No real payment, accounting service or legal invoice is connected.'].join('\n');}
export type FinanceDemoAction={kind:'invoice';outcome:FinanceDocumentDemo['state']}|{kind:'refund';amount:string;reason:string}|{kind:'payout';id:string;outcome:RefundDemo['payout']}|{kind:'credit';id:string;outcome:FinanceDocumentDemo['state']}|{kind:'allocate';amount:string}|{kind:'reverse';id:string};
export function nextCommunityFinanceDemo(r:CommunityMembership,current:CommunityFinanceDemo,action:FinanceDemoAction,now=Date.now()):CommunityFinanceDemo{
 if(!communityFinanceDemo(r,JSON.stringify(current))||!time(now))throw Error('Open this same current original payment and its example.');
 const s=structuredClone(current),fresh=()=>crypto.randomUUID(),record=(label:string)=>s.history.push({id:fresh(),label,at:now});
 const issue=(doc:FinanceDocumentDemo,kind:'Invoice'|'Correction')=>{if(doc.state==='issued')return;doc.state='issued';doc.id=fresh();doc.issuedAt=now;doc.body=textDocument(r,doc,kind,now);doc.hash=sha256Hex(doc.body);};
 if(action.kind==='invoice'){
  if(s.invoice.state==='issued'){if(action.outcome!=='issued')throw Error('The original issued example stays recorded.');return current;}
  if(action.outcome==='issued')issue(s.invoice,'Invoice');else s.invoice.state=action.outcome;record('Original invoice example: '+action.outcome);
 }else if(action.kind==='refund'){
  const amount=communityFinanceMoneyInput(action.amount);if(r.payment.status!=='paid'||!amount||amount>communityFinanceRemaining(r,s)||action.reason.length>500)throw Error('Review an amount within the original remaining paid payment.');
  s.refunds.push({id:fresh(),amount,reason:action.reason.trim(),at:now,payout:'requested',credit:{id:'',requestId:fresh(),state:'pending',amount}});record('Partial refund requested in example; payout and correction remain separate.');
 }else if(action.kind==='payout'||action.kind==='credit'){
  const rows=s.refunds.filter(f=>f.id===action.id),f=rows[0];if(rows.length!==1)throw Error('Open this original refund.');
  if(action.kind==='payout'){
   if(f.payout==='paid'){if(action.outcome!=='paid')throw Error('The confirmed example payout stays recorded.');return current;}
   if(action.outcome==='paid'&&s.refunds.filter(o=>o.id!==f.id&&o.payout!=='failed').reduce((n,o)=>n+o.amount,0)+f.amount+(r.refund.status==='none'?0:r.refund.amountMinor)>r.offer.amountMinor)throw Error('Other original requests reserve this amount.');f.payout=action.outcome;record('Original refund payout example: '+action.outcome);
  }else{
   if(f.credit.state==='issued'){if(action.outcome!=='issued')throw Error('The original linked correction stays recorded.');return current;}
   if(action.outcome==='issued'){if(s.invoice.state!=='issued')throw Error('The correction needs its original issued invoice.');if(s.refunds.filter(o=>o.credit.state==='issued').reduce((n,o)=>n+o.amount,0)+f.amount>r.offer.amountMinor)throw Error('Credits must remain within the original invoice.');issue(f.credit,'Correction');}else f.credit.state=action.outcome;record('Separate invoice correction example: '+action.outcome);
  }
 }else if(action.kind==='allocate'){
  const amount=communityFinanceMoneyInput(action.amount),allocated=s.allocations.filter(a=>!a.reversed).reduce((n,a)=>n+a.amount,0);if(r.payment.status!=='paid'||s.invoice.state!=='issued'||!amount||amount>Math.min(r.offer.amountMinor-allocated,communityFinanceRemaining(r,s)-allocated))throw Error('Review the original available payment and invoice balance.');s.allocations.push({id:fresh(),amount,at:now,reversed:false});record('Existing example payment allocated; no new charge.');
 }else{
  const rows=s.allocations.filter(a=>a.id===action.id);if(rows.length!==1||rows[0].reversed)throw Error('Open the same current original allocation.');rows[0].reversed=true;record('Original allocation reversed in example; payment unchanged.');
 }
 s.revision++;if(!communityFinanceDemo(r,JSON.stringify(s)))throw Error('Keep the original example details; this change could not be recorded.');return s;
}
