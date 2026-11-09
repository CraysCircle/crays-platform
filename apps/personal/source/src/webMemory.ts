import type {ProductWorld,Entity,ActionContext} from './productModel';
import {localPreviewId} from './localPreviewId';
const need=(ok:unknown,text:string)=>{if(!ok)throw Error(text);};
const ownerReady=(w:ProductWorld)=>w.identity.signedIn===true&&typeof w.owner==='string'&&!!w.owner.trim()&&w.owner===w.owner.trim()&&w.owner.length<=300;
export function ownMemory(w:ProductWorld){if(!ownerReady(w)||!Array.isArray(w.objects))return [];return w.objects.filter(o=>o&&typeof o.id==='string'&&!!o.id.trim()&&o.id===o.id.trim()&&o.id.length<=300&&o.owner===w.owner&&o.kind==='memory'&&w.objects.filter(x=>x&&x.id===o.id).length===1&&typeof o.name==='string'&&!!o.name.trim()&&typeof o.purpose==='string'&&!!o.purpose.trim()&&typeof o.source==='string'&&o.status==='confirmed'&&(o.version===undefined||typeof o.version==='number'&&Number.isInteger(o.version)&&o.version>0));}
export function memorySource(w:ProductWorld,id:string):Entity{need(ownerReady(w),'Sign in to your own memory.');const rows=ownMemory(w).filter(o=>o.id===id);need(rows.length===1,'Review this exact own memory. Ambiguous or unavailable originals are retained.');return rows[0];}
export const memorySnapshot=(w:ProductWorld,id:string)=>JSON.stringify({owner:w.owner,original:memorySource(w,id)});
export function memoryDraftReview(w:ProductWorld,fact:string,purpose:string){need(ownerReady(w),'Sign in to your own memory.');need(typeof fact==='string'&&fact.trim()&&fact.length<=4000,'Choose the exact fact, up to 4000 characters.');need(typeof purpose==='string'&&purpose.trim()&&purpose.length<=1000,'Choose a purpose, up to 1000 characters.');return JSON.stringify({owner:w.owner,fact:fact.trim(),purpose:purpose.trim()});}
export const memoryCorrectionReview=(w:ProductWorld,id:string,fact:string,purpose:string)=>JSON.stringify({source:memorySnapshot(w,id),draft:memoryDraftReview(w,fact,purpose)});
export function applyWebMemory(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext){
 if(!op.startsWith('web.memory.'))return;
 need(ownerReady(w)&&(!ctx.personId||ctx.personId===w.owner),'Review your own signed-in memory.');
 need(data.approved==='Yes','Confirm this exact memory review first.');
 if(op==='web.memory.confirm'){
  need(data.reviewSnapshot===memoryDraftReview(w,data.fact,data.purpose),'The fact, purpose or account changed. Review again.');
  const same=w.objects.filter(o=>o.owner===w.owner&&o.kind==='memory'&&o.name===data.fact.trim()&&o.purpose===data.purpose.trim());
  need(same.length<=1,'These original memories need a duplicate review.');
  if(same.length){need(ownMemory(w).some(o=>o===same[0]),'Review the exact existing memory and its original identity.');return {objectId:same[0].id,message:'This exact own fact and purpose are already confirmed. No duplicate was added.'};}
  const memory:Entity={id:localPreviewId(),owner:w.owner,kind:'memory',name:data.fact.trim(),purpose:data.purpose.trim(),source:'Explicitly confirmed by you',status:'confirmed',confirmedAt:Date.now(),version:1,realExecution:false};need(!w.objects.some(o=>o.id===memory.id),'Review the memory identity again.');w.objects.unshift(memory);
  return {objectId:memory.id,message:'This selected fact and purpose were confirmed in your own local memory. No external agent or source was changed.'};
 }
 const memory=memorySource(w,ctx.objectId||'');
 if(op==='web.memory.correct'){
  need(data.reviewSnapshot===memoryCorrectionReview(w,memory.id,data.fact,data.purpose),'This original memory or correction changed. Review again.');
  memory.name=data.fact.trim();memory.purpose=data.purpose.trim();memory.source='Corrected by you';memory.correctedAt=Date.now();memory.version=Number(memory.version||0)+1;
  return {objectId:memory.id,message:'Only this own memory was corrected. Original notes, source versions and other records are unchanged.'};
 }
 need(op==='web.memory.forget','Choose the exact memory action.');need(data.reviewSnapshot===memorySnapshot(w,memory.id),'This original memory changed. Review it again before forgetting.');
 w.objects=w.objects.filter(o=>o!==memory);
 return {objectId:memory.id,message:'This selected own memory was removed from the local preview. Original notes and other records remain separate; external services and indexes were not erased.'};
}
