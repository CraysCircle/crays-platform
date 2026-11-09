import type {ProductWorld,Entity} from './productModel.ts';
import {guestVenueCatalogue} from './venueCatalogue.ts';
import type {CatalogueModifierSelection} from './catalogueModifiers.ts';
/** Preparatory interpretation for the local clickdummy. Never an order, mandate or payment. */
export type ChuckPurchaseChoice={id:string;variantId:string;quantity:string;modifierSelections:CatalogueModifierSelection[]};
export function chuckCommerceTask(w:ProductWorld,id:string):Entity|undefined{
 if(!w.identity.signedIn)return;const rows=w.objects.filter(o=>o.id===id);const t=rows[0];
 return rows.length===1&&t.owner===w.owner&&t.kind==='agent-task'&&['AL-141','AL-148'].includes(String(t.sourceFunction))&&typeof t.request==='string'&&!!t.request.trim()?t:undefined;
}
export function chuckCommerceTaskCanPrepare(w:ProductWorld,id:string){const t=chuckCommerceTask(w,id);return !!t&&!['cancelled','stopped','paused','failed','completed','succeeded'].includes(String(t.status));}
export function chuckCommerceOrders(w:ProductWorld,taskId:string){if(!chuckCommerceTask(w,taskId))return [];return w.objects.filter(o=>o.owner===w.owner&&o.kind==='order'&&o.sourceTaskId===taskId&&w.objects.filter(other=>other.id===o.id).length===1);}
export function chuckCommerceBasketKey(venueId:string,taskId?:string){return taskId?`basket:${venueId}:chuck:${taskId}`:`basket:${venueId}`;}
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const numbers:Record<string,string>={a:'1',an:'1',one:'1',two:'2',three:'3',four:'4',five:'5',ein:'1',eine:'1',einen:'1',eins:'1',zwei:'2',drei:'3',vier:'4',fünf:'5'};
export function suggestChuckPurchase(w:ProductWorld,taskId:string,venueId:string,text:string){
 if(!chuckCommerceTaskCanPrepare(w,taskId))throw Error('Reopen your own active purchase task.');
 if(w.venues.filter(v=>v.id===venueId&&v.operatorActive).length!==1)throw Error('Choose the exact available Spot first.');
 if(typeof text!=='string'||!text.trim()||text.length>4000)throw Error('Review your purchase words first.');
 const menu=guestVenueCatalogue(w,venueId)||[],rows:ChuckPurchaseChoice[]=[],questions:string[]=[];
 for(const item of menu.filter(i=>i.kind!=='service')){
  // Only the known fictional latte fixture has a short alias; other names stay exact.
  const alias=item.id==='crays-coffee-bar-preview:configured-latte'?'latte':item.name;
  const match=new RegExp(`\\b${escape(alias)}(?:s)?\\b`,'i').exec(text);if(!match)continue;
  const prefix=text.slice(0,match.index);if(item.id==='crays-coffee-bar-preview:espresso'&&/\bextra\s*$/i.test(prefix))continue;
  const quantityMatch=prefix.match(/(?:^|\s)(\d{1,3}|a|an|one|two|three|four|five|ein|eine|einen|eins|zwei|drei|vier|fünf)\s*$/i),quantity=quantityMatch?(numbers[quantityMatch[1].toLowerCase()]||quantityMatch[1]):'';
  if(!quantity)questions.push(`How many ${item.name}?`);
  const variants=item.variants.filter(v=>new RegExp(`\\b${escape(v.label)}\\b`,'i').test(text));
  const variantId=variants.length===1?variants[0].variantId:item.variants.length===1?item.variants[0].variantId:'';
  if(!variantId)questions.push(`Choose the exact variant for ${item.name}.`);
  const modifierSelections=(item.modifierGroups||[]).map(g=>{const codes=g.options.filter(o=>{
   const phrase=o.optionCode==='milk-oat'?'(?:oat(?: drink| milk)?|hafer(?:milch|drink)?)':o.optionCode==='milk-classic'?'(?:classic milk|regular milk|kuhmilch)':o.optionCode==='extra-shot'?'(?:extra espresso shot|extra shot|zusätzlichem espresso)':escape(o.displayName);
   return new RegExp(`\\b${phrase}\\b`,'i').test(text);
  }).map(o=>o.optionCode);if(codes.length<g.minSelections||codes.length>g.maxSelections)questions.push(`Review ${g.displayName} for ${item.name}.`);return {groupCode:g.groupCode,optionCodes:codes};});
  rows.push({id:item.id,variantId,quantity,modifierSelections});
 }
 if(!rows.length)questions.push('Which item would you like? Choose from this Spot’s current menu.');
 if(/\b(no|without|not|kein|keine|ohne)\b/i.test(text)){for(const r of rows)r.modifierSelections=[];questions.push('Your request includes an exclusion. Confirm each option and tell the seller what must be excluded.');}
 return {rows,questions,source:'explicit-local-interpretation-example' as const,liveExecution:false as const};
}
