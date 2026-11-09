import type {ProductWorld} from './productModel.ts';
import {guestVenueCatalogue,catalogueLineSnapshot,prepareCatalogueQuote,type GuestCatalogueItem} from './venueCatalogue.ts';
export type OrderBasketLine={id:string;variant:string;quantity:number}&Partial<ReturnType<typeof catalogueLineSnapshot>>;
export function catalogueOrderLines(w:ProductWorld,venueId:string,lines:OrderBasketLine[]):OrderBasketLine[]{
 const current=guestVenueCatalogue(w,venueId);
 const hasCatalogue=w.objects.some(o=>o.kind==='venue-catalogue'&&o.venueId===venueId&&('releasedItems' in o||o.status==='withdrawn'));
 if(current===null&&!hasCatalogue){if(lines.some(l=>l.catalogueId))throw Error('This catalogue is no longer available. Keep your original order and review new choices separately.');return structuredClone(lines);}
 return lines.map(line=>{
  if(!line.catalogueId||!line.variantId)throw Error('The menu has changed. Choose this item and variant from the current Spot menu.');
  const exact=catalogueLineSnapshot(w,venueId,line.id,line.variantId,line.quantity,line.modifierSelections);
  for(const key of ['catalogueId','catalogueVersion','priceVersion','unitPrice','currency','sellerId','channelId','configurationKey'] as const)
   if(line[key]!==exact[key])throw Error('This menu price or version changed. Review the current variant before requesting a new quote.');
  if(JSON.stringify(line.gymRetailClassification)!==JSON.stringify(exact.gymRetailClassification))throw Error('This Gym physical classification, seller, price book or stock projection changed. Review its current original.');
  if(JSON.stringify(line.modifierSnapshot)!==JSON.stringify(exact.modifierSnapshot))throw Error('The selected options changed. Review this exact configuration again.');
  return exact;
 });
}
export function catalogueEstimate(w:ProductWorld,venueId:string,lines:OrderBasketLine[]){return lines.some(l=>l.catalogueId)?prepareCatalogueQuote(w,venueId,lines.map(l=>({id:l.id,variantId:l.variantId!,quantity:l.quantity,modifierSelections:l.modifierSelections}))):undefined;}
export type GuestMenuProduct={id:string;name:string;category:string;description:string;variant:string[];catalogue?:GuestCatalogueItem};
export function catalogueMenuProducts(w:ProductWorld,venueId:string):GuestMenuProduct[]|null {
 const entries=guestVenueCatalogue(w,venueId);
 if(entries===null)return w.objects.some(o=>o.kind==='venue-catalogue'&&o.venueId===venueId&&('releasedItems' in o||o.status==='withdrawn'))?[]:null;
 return entries.filter(i=>i.kind!=='service').map(i=>({id:i.id,name:i.name,category:i.kind==='drink'?'Drinks':i.kind==='product'?(i.category||'Shop'):'Food',description:i.description,variant:i.variants.map(v=>v.variantId),catalogue:i}));
}
