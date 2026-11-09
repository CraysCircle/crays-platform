import {gymRetailExampleCatalogue} from './gymRetailExample.ts';
import {gymRetailVenueId} from './merchantExampleScope.ts';
import {coffeeModifierExample} from './coffeeModifierExample.ts';
import type {ProductWorld,Venue} from './productModel.ts';
/** Listing preference only: no membership, current presence or private-chat authority. */
export function isYourSpace(v:Venue){return v.relayJoined===true||v.visited||['active','provisional'].includes(v.membership);}
export function discoverySpaces(w:ProductWorld){return w.venues.filter(v=>v.operatorActive&&(!w.identity.signedIn||!isYourSpace(v)));}
/** Clearly fictional public examples; no relay subscription, nomination or service purchase is created. */
export function withDiscoverySpaces(w:ProductWorld):ProductWorld{
 if(w.owner!=='thorben'||!w.settings.demoHistory)return w;
 const descriptions=[
  {id:'discover-aster-resort',name:'Aster Bay Resort',city:'Langkawi, Malaysia',type:'Resort',image:'lifestyle-club-05.jpg',services:['Food & drinks','Table booking','Community events','Gym & wellbeing'],description:'A fictional island resort for slower mornings, shared meals and wellbeing. Explore dining, activities and the resort community. Stay requests, room availability, day access and a confirmed booking remain separate; imagery illustrates the atmosphere.'},
  {id:'discover-cedar-hotel',name:'Cedar House Hotel',city:'London',type:'Hotel',image:'lifestyle-club-08.jpg',services:['Food & drinks','Table booking','Meeting room','Community events'],description:'A fictional city hotel with a lobby café, private meeting rooms and small gatherings. A room booking, visitor reservation and hotel community access each have their own review. This is an illustrative hotel, not live availability.'},
  {id:'discover-makers-trade-show',name:'Future Makers Trade Show',city:'Singapore',type:'Trade show',image:'lifestyle-pro-00.jpg',services:['Community events','Meeting room','Coffee'],description:'A fictional business trade show bringing exhibitors, visitors and ideas together. Explore the programme and request a meeting. Admission, exhibitor credentials, meeting confirmation and permission to contact an attendee are separate. Workspace imagery is illustrative, not a photograph of this event.'},
  {id:'discover-light-exhibition',name:'Light & Form Exhibition',city:'Berlin',type:'Exhibition',image:'lifestyle-pro-01.webp',services:['Community events','Coffee'],description:'A fictional exhibition of design, light and independent makers. Explore sessions and prepare a visit. A ticket applies to its stated date and admission terms; it does not grant reproduction rights or direct access to other visitors. Imagery is illustrative.'},
  {id:'discover-horizon-cruise',name:'Horizon Voyage',city:'Mediterranean',type:'Cruise ship',image:'lifestyle-club-05.jpg',services:['Food & drinks','Table booking','Community events','Gym & wellbeing'],description:'A fictional cruise-ship community for a shared journey: dining, onboard events and movement. A cruise booking, boarding documents, access to a particular sailing and voluntary social visibility are independent. No sailing schedule or ship connectivity is confirmed; imagery is illustrative.'},
  {id:'discover-skyway-airport',name:'Skyway Airport Lounge',city:'Dubai',type:'Airport',image:'lifestyle-club-10.jpg',services:['Coffee','Food & drinks','Desk booking','Meeting room'],description:'A fictional airport-lounge Spot for coffee, focus and a moment between journeys. Terminal access, boarding eligibility, lounge admission, a desk booking and social visibility each need their own permission. This example does not represent an airport partnership, flight or live lounge availability.'},
  {id:'crays-coffee-bar-preview',name:'CRAYS Coffee Bar',city:'Forest City, Malaysia',type:'Coffee bar',image:'coffee-original-hero.jpg',services:['Coffee','Table booking','Community events'],description:'Coffee, a shared table and a place to return to. Explore drinks, light bites and community moments. This fictional CRAYS Coffee Bar illustrates the planned experience; it is not a confirmed address, opening or live menu.'},
  {id:'crays-store-preview',name:'CRAYS Store',city:'Forest City, Malaysia',type:'Retail store',image:'lifestyle-pro-02.webp',services:['Shop'],description:'Discover CRAYS essentials, explore product options and prepare a pickup order from this exact Store. This is a fictional retail preview with illustrative imagery and products, not live stock or a confirmed store opening.'},
  {id:'crays-gym-preview',name:'CRAYS Gym',city:'Forest City, Malaysia',type:'Gym & wellbeing',image:'venue-gym.jpg',services:['Training','Coaching','Recipes','Community events'],description:'Training, coaching and a community that moves with you. Explore the planned CRAYS Gym experience. This fictional Forest City preview is separate from the published Sankt Augustin location; opening hours, access and availability are not confirmed.'},
  {id:'discover-juniper',name:'Juniper Rooftop',city:'Lisbon',type:'Rooftop hotel & bar',image:'lifestyle-club-07.jpg',services:['Table booking','Community events'],description:'A fictional rooftop hotel and bar for slower evenings above the city. Explore the place, then review each table, event or stay separately. This is a discovery example, not a live venue or availability claim.'},
  {id:'discover-atelier',name:'Atelier Coast',city:'Barcelona',type:'Restaurant & creative space',image:'lifestyle-club-06.jpg',services:['Food & drinks','Table booking','Community events'],description:'A fictional neighbourhood restaurant where shared tables meet creative evenings. The host reviews each request; discovering the place does not join its community or confirm a reservation.'},
  {id:'discover-common-ground',name:'Common Ground',city:'Dubai',type:'Coffee & coworking',image:'lifestyle-pro-00.jpg',services:['Coffee','Desk booking','Meeting room'],description:'A fictional coffee and coworking space for a change of scenery. Browse independently; desk requests, community access and personal introductions have their own permissions.'},
 ];
 const added:Venue[]=descriptions.filter(v=>!w.venues.some(old=>old.id===v.id)).map(v=>({...v,visited:false,relayJoined:false,membership:'none',grant:'None',otherGrant:false,presence:'none',visibility:{Socializing:false,Business:false,Dating:false},area:'Public preview',operatorActive:true,role:'Guest',relay:`wss://${v.id}.example.invalid`}));
 const photoFixes=[['discover-horizon-cruise','Horizon Voyage','lifestyle-club-09.jpg','lifestyle-club-05.jpg'],['discover-skyway-airport','Skyway Airport Lounge','lifestyle-pro-03.webp','lifestyle-club-10.jpg']];
 const replacements=w.venues.map(v=>{const fix=photoFixes.find(([id,name,old])=>v.id===id&&v.name===name&&v.image===old);return fix?{...v,image:fix[3]}:v;});
 if(replacements.some((v,i)=>v!==w.venues[i]))w={...w,venues:replacements};
 const legacyCoffee=w.venues.find(v=>v.id==='crays-coffee-bar-preview'&&v.name==='CRAYS Coffee Bar'&&v.image==='venue-table.png');
 if(legacyCoffee)w={...w,venues:w.venues.map(v=>v===legacyCoffee?{...v,image:'coffee-original-hero.jpg'}:v)};
 let next=added.length?{...w,venues:[...w.venues,...added]}:w;
 // Only extend our original fictional Gym fixture; preserve custom venues and historical orders.
 const gym=next.venues.find(v=>v.id===gymRetailVenueId&&v.name==='CRAYS Gym'&&v.type==='Gym & wellbeing'&&v.relay===`wss://${gymRetailVenueId}.example.invalid`);
 if(gym&&!gym.services.includes('Shop'))next={...next,venues:next.venues.map(v=>v===gym?{...v,services:[...v.services,'Shop']}:v)};
 if(gym&&!next.objects.some(o=>o.kind==='venue-catalogue'&&o.venueId===gymRetailVenueId))next={...next,objects:[...next.objects,gymRetailExampleCatalogue()]};
 const specs=[
  {venueId:'crays-coffee-bar-preview',kind:'drink',items:[['espresso','Espresso','Coffee','3.00'],['iced-coffee','Iced coffee','Coffee','4.00']]},
  {venueId:'crays-store-preview',kind:'product',items:[['tote','CRAYS everyday tote','Essentials','18.00'],['bottle','CRAYS water bottle','Essentials','24.00']]},
 ];
 const catalogues=specs.filter(spec=>!next.objects.some(o=>o.kind==='venue-catalogue'&&o.venueId===spec.venueId)).map(spec=>{
  const id=`preview-brand-catalogue:${spec.venueId}`;
  return {id,kind:'venue-catalogue',owner:`preview-team:${spec.venueId}`,scopeId:`preview-scope:${spec.venueId}`,venueId:spec.venueId,version:1,status:'released-demo',sources:[],items:[],receipts:[],publishedVersion:1,sourceAuthority:'fictional-preview',liveExecution:false,
   releasedItems:spec.items.map(([key,name,category,price])=>({id:`${spec.venueId}:${key}`,name,description:'Illustrative product and USD price for the clickdummy; availability needs confirmation.',category,kind:spec.kind,unit:'item',allergens:'Not supplied',availability:'unknown',variants:[{variantId:'standard',label:'Standard',spacePrice:price,sourcePrice:price,currency:'USD',priceVersion:`${id}:${key}:v1`,externalVariantId:`preview:${spec.venueId}:${key}`}],catalogueId:id,catalogueVersion:1,sellerId:`preview-seller:${spec.venueId}`,channelId:`preview-channel:${spec.venueId}`,venueId:spec.venueId,taxStatus:'unknown',audience:'All guests',sourceAuthority:'fictional-preview'}))};
 });
 const result=catalogues.length?{...next,objects:[...next.objects,...catalogues]}:next;
 // Extend only our known fictional fixture; never rewrite custom/operator catalogues or old orders.
 const example=result.objects.find(o=>o.id==='preview-brand-catalogue:crays-coffee-bar-preview'&&o.sourceAuthority==='fictional-preview'&&o.owner==='preview-team:crays-coffee-bar-preview'&&o.version===1);
 if(example&&Array.isArray(example.releasedItems)&&!example.releasedItems.some((i:{id:string})=>i.id==='crays-coffee-bar-preview:configured-latte')){
  const releasedItems=example.releasedItems;
  const base=releasedItems.find((i:{id:string})=>i.id==='crays-coffee-bar-preview:iced-coffee');
  if(base)return {...result,objects:result.objects.map(o=>o===example?{...o,releasedItems:[...releasedItems,coffeeModifierExample(base)]}:o)};
 }
 return result;
}

export const spotCategories=['All Spots','CRAYS Club','CRAYS Coffee Bars','CRAYS Stores','CRAYS Gym','Rooftops','Hotels & resorts','Trade shows','Exhibitions','Cruise ships','Airports'] as const;
export function matchesSpotCategory(v:Venue,category:string){
 if(!category||category==='All Spots')return true;
 if(category==='CRAYS Club')return /^crays club\b/i.test(v.name);
 if(category==='CRAYS Coffee Bars')return /^crays coffee bar\b/i.test(v.name);
 if(category==='CRAYS Stores')return /^crays store\b/i.test(v.name);
 if(category==='CRAYS Gym')return /^crays gym\b/i.test(v.name);
 if(category==='Rooftops')return /rooftop/i.test(v.type);
 if(category==='Hotels & resorts')return /hotel|resort/i.test(v.type);
 if(category==='Trade shows')return /trade show/i.test(v.type);
 if(category==='Exhibitions')return /exhibition/i.test(v.type);
 if(category==='Cruise ships')return /cruise ship/i.test(v.type);
 if(category==='Airports')return /airport/i.test(v.type);
 return false;
}
