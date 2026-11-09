import type {ProductWorld} from './productModel';
import type {GuestCatalogueItem} from './venueCatalogue';
/** Fictional offers grounded in SaaS Community/Explore/Wellbeing and public CRAYS service themes.
 * Fresh illustrative USD proposals, NOT FX conversion of historical EUR/MYR records.
 * These are NOT admitted real Vendure products, stock, seller routing or published Nostr posts. */
export const spaceServiceExamples=[
 {id:'community-evening',category:'Community',name:'An evening together',description:'A shared table, seasonal food and time to meet the community. Drinks and dietary requirements are agreed separately.',image:'venue-table.png',duration:'2 hours',price:'18.00',unit:'guest'},
 {id:'forest-city-discovery',category:'Explore',name:'Discover Forest City',description:'A small-group waterfront walk. Agree the route, meeting point, weather arrangements and accessibility with the host.',image:'forest-city-marina.webp',duration:'90 minutes',price:'12.00',unit:'guest'},
 {id:'move-together',category:'Wellbeing',name:'Move together',description:'A hosted movement session. The instructor confirms suitability, intensity, equipment and available places before the visit.',image:'venue-gym.jpg',duration:'60 minutes',price:'15.00',unit:'guest'},
 {id:'focus-day',category:'Workspace',name:'Your day to focus',description:'A workspace day with a seat and Wi-Fi. Desk location, opening hours and any meeting-room extras need confirmation.',image:'lifestyle-pro-00.jpg',duration:'Day access',price:'20.00',unit:'guest'},
 {id:'creator-studio',category:'Creative',name:'Make room for your next idea',description:'Request a content-studio session. Equipment, assistance, recording rights and setup time are confirmed by the Spot.',image:'lifestyle-pro-02.webp',duration:'60 minutes',price:'45.00',unit:'session'},
 {id:'creative-workshop',category:'Learning',name:'Create something together',description:'A hands-on community workshop. The host confirms the theme, materials, language and participant requirements.',image:'lifestyle-pro-01.webp',duration:'2 hours',price:'30.00',unit:'guest'},
] as const;
export function withSpaceServiceExamples(input:ProductWorld):ProductWorld{
 if(input.owner!=='thorben'||!input.settings.demoHistory||input.settings.spaceServiceExamples==='2026-10-20-usd-v2')return withClubStayExample(input);
 const w={...input,objects:[...input.objects],settings:{...input.settings,spaceServiceExamples:'2026-10-20-usd-v2'}};
 for(const venue of w.venues.filter(v=>['forest-city','harbor-house','coast','work','move'].includes(v.id))){
  const definitions=spaceServiceExamples.filter(s=>venue.id==='forest-city'||(s.category==='Community'&&venue.services.includes('Community events'))||(s.category==='Wellbeing'&&venue.services.some(x=>/gym|wellbeing/i.test(x)))||(s.category==='Workspace'&&venue.services.some(x=>/workspace|desk/i.test(x))));
  const id=`preview-usd-service-catalogue:${venue.id}`;if(w.objects.some(o=>o.id===id)||!definitions.length)continue;
  const releasedItems:GuestCatalogueItem[]=definitions.map(s=>({id:`preview-service:${venue.id}:${s.id}`,name:s.name,description:s.description,category:s.category,kind:'service',unit:s.unit,allergens:'Not supplied',availability:'unknown',variants:[{variantId:'standard',label:'Standard preview option',spacePrice:s.price,sourcePrice:s.price,currency:'USD',priceVersion:`preview-usd-price:${venue.id}:${s.id}:v2`,externalVariantId:`preview-vendure-variant:${venue.id}:${s.id}`}],catalogueId:id,catalogueVersion:1,sellerId:`preview-seller:${venue.id}`,channelId:`preview-channel:${venue.id}`,venueId:venue.id,taxStatus:'unknown',serviceDuration:s.duration,audience:'All guests',image:s.image,sourceAuthority:'fictional-preview'}));
  // Retain old fictional currency snapshots for existing requests; retire them from new sales.
  w.objects=w.objects.map(o=>o.id===`preview-service-catalogue:${venue.id}`&&o.sourceAuthority==='fictional-preview'&&o.owner===`preview-team:${venue.id}`?{...o,status:'withdrawn',supersededBy:id}:o);
  w.objects.push({id,kind:'venue-catalogue',owner:`preview-team:${venue.id}`,scopeId:`preview-scope:${venue.id}`,venueId:venue.id,version:1,status:'released-demo',sources:[],items:[],receipts:[],releasedItems,publishedVersion:1,sourceAuthority:'fictional-preview',liveExecution:false});
 }
 return withClubStayExample(w);
}

/** Additional explicitly fictional room source; existing ticket/service originals are unchanged. */
function withClubStayExample(input:ProductWorld):ProductWorld{
 if(input.owner!=='thorben'||!input.settings.demoHistory||!input.venues.some(v=>v.id==='forest-city')||input.objects.some(o=>o.id==='preview-club-room-catalogue:forest-city:v1'))return input;
 const id='preview-club-room-catalogue:forest-city:v1',item:GuestCatalogueItem={id:'preview-club-room:forest-city:double',name:'A stay at Forest City',description:'Explicit fictional double-room offer for the clickdummy. No live hotel inventory, PMS connection or actual reservation.',category:'Stays',kind:'service',unit:'room-night',allergens:'Not applicable to this room offer',availability:'unknown',variants:[{variantId:'double-room',label:'Double room · fictional example',spacePrice:'120.00',sourcePrice:'120.00',currency:'USD',priceVersion:'fictional-club-room-price:v1',externalVariantId:'fictional-club-double-room:v1'}],catalogueId:id,catalogueVersion:1,sellerId:'preview-seller:forest-city',channelId:'preview-channel:forest-city',venueId:'forest-city',taxStatus:'unknown',sourceAuthority:'fictional-preview',audience:'All guests',image:'forest-city-marina.webp',serviceDuration:'Per room-night',stay:{source:'explicit-fictional-club-room-v1',liveExecution:false,roomType:'Double room · fictional example',maxGuestsPerRoom:2,maxRooms:5,maxNights:30,checkInTime:'15:00',checkOutTime:'11:00',timezone:'Asia/Kuala_Lumpur',cancellation:'Fictional example: cancellation request has no charge. Cancellation needs its own labelled response; no refund or real hotel action.',feeMinor:0,taxMinor:0}};
 return {...input,objects:[...input.objects,{id,kind:'venue-catalogue',owner:'preview-team:forest-city',scopeId:'preview-room-scope:forest-city',venueId:'forest-city',version:1,status:'released-demo',sources:[],items:[],receipts:[],publishedVersion:1,sourceAuthority:'fictional-preview',liveExecution:false,releasedItems:[item]}]};
}
