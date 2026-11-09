import type {ProductWorld,Entity} from './productModel';
import type {GuestCatalogueItem} from './venueCatalogue';
import {spotMenuIllustration} from './spotMenuIllustrations';
import {spotServiceIllustration} from './spotServiceIllustrations';
import {localSpot,localMedia} from './localSocialData';
import {hoursWeekDays,validateHoursSource,type HoursSource} from './venueHours';

export const LOCAL_SPOT_PROCESS_VERSION='v4';

type Payload={id:string;spotId?:string;name?:string;description?:string;category?:string;sellerId?:string;priceMinor?:number;currency?:string;price?:{amount:string;currency:string};allergenStatement?:string;spaceId?:string;resourceId?:string;experienceId?:string;type?:string;openingHours?:{days:string;opens:string;closes:string}[]};
type Bundle={schema:string;spotId:string;fictionalOnly:boolean;realCoreAuthority:boolean;realProviderAvailability:boolean;realPayments:boolean;privateBuyerRowsIncluded:boolean;rows:{entityId:string;sourceId:string;family:string;sourcePayloadSHA256:string;payload:Payload}[]};
const reads=new Map<string,Promise<Bundle>>();
export function loadLocalSpotProcesses(id:string){
 if(!localSpot(id))return Promise.reject(Error('Choose an available Spot.'));
 if(!reads.has(id))reads.set(id,fetch('/assets/crays-spot-processes-v1/'+encodeURIComponent(id)+'.json',{credentials:'omit',redirect:'error'}).then(async response=>{if(!response.ok)throw Error('This Spot’s details could not be loaded.');const d=await response.json() as Bundle;if(d.schema!=='crays.synthetic-public-spot-processes.v1'||d.spotId!==id||d.fictionalOnly!==true||d.realCoreAuthority!==false||d.realProviderAvailability!==false||d.realPayments!==false||d.privateBuyerRowsIncluded!==false||d.rows.filter(r=>r.family==='venueDetailFixtures.menuProducts').length!==12||d.rows.some(r=>r.payload.spotId&&r.payload.spotId!==id))throw Error('This Spot catalogue needs review.');return d;}).catch(error=>{reads.delete(id);throw error;}));
 return reads.get(id)!;
}
export function withLocalSpotProcesses(w:ProductWorld,d:Bundle):ProductWorld{
 const spot=localSpot(d.spotId),venue=w.venues.find(v=>v.id===d.spotId),key='local-spot-processes:'+d.spotId;
 if(w.owner!=='thorben'||!w.identity.signedIn||!spot||!venue||w.settings[key]===LOCAL_SPOT_PROCESS_VERSION)return w;
 const catalogueId=d.spotId+'-catalogue-v1',rows=d.rows,items:GuestCatalogueItem[]=[];
 for(const r of rows){const p=r.payload,isMenu=r.family==='venueDetailFixtures.menuProducts',isExperience=r.family==='processFixtures.experiences';if(!isMenu&&!isExperience)continue;
  const offer=isExperience?rows.find(o=>o.family==='processFixtures.salesOffers'&&o.payload.type==='bookable-experience'&&o.payload.experienceId===p.id)?.payload:null;
  const amount=isMenu?((p.priceMinor||0)/100).toFixed(2):offer?.price?.amount||p.price?.amount;
  if(!amount||!/^\d+\.\d{2}$/.test(amount)||(isMenu?p.currency:offer?.price?.currency||p.price?.currency)!=='USD')throw Error('Review this exact catalogue price.');
  const category=isExperience?'Experiences':p.category||'Kitchen',kind=isExperience?'service':/drink|beverage|coffee/i.test(category)?'drink':/retail|shop/i.test(category)?'product':'food';
  items.push({id:p.id,name:p.name||'House offer',description:p.description||'',category,kind,unit:isExperience?'person':kind==='drink'?'serving':kind==='product'?'item':'plate',allergens:p.allergenStatement||'Review the current details with the house.',availability:'unknown',variants:[{variantId:p.id+':standard',label:'Standard',spacePrice:amount,sourcePrice:amount,currency:'USD',priceVersion:'fictional-price:'+p.id+':v1',externalVariantId:'fictional-variant:'+p.id+':standard'}],catalogueId,catalogueVersion:1,sellerId:p.sellerId||offer?.sellerId||d.spotId.replace('-spot-','-operator-'),channelId:'fictional-channel:'+d.spotId,venueId:d.spotId,taxStatus:'unknown',sourceAuthority:'fictional-preview',...(isExperience?{serviceDuration:'Confirm duration',image:spotServiceIllustration(p.id)||localMedia(spot.picture)}:{image:spotMenuIllustration(p.id)})});
 }
 if(items.length!==15)throw Error('This catalogue is incomplete.');
 const records:Entity[]=[{id:catalogueId,owner:d.spotId,kind:'venue-catalogue',scopeId:'venue:'+d.spotId,venueId:d.spotId,version:1,publishedVersion:1,status:'released-fictional-preview',sources:[],items:[],receipts:[],releasedItems:items,fixtureOnly:true,realCoreAuthority:false,realProviderImport:false,clubSaasPermitted:false},...rows.map(r=>({id:'spot-process-source:'+r.entityId,owner:w.owner,kind:'local-spot-process-source',venueId:d.spotId,family:r.family,sourceId:r.sourceId,sourcePayloadSHA256:r.sourcePayloadSHA256,payload:r.payload,fixtureOnly:true,realProviderAvailability:false}))];
 const detail=rows.find(r=>r.family==='venueDetailFixtures.venueDetails')?.payload;
 let openingHours=venue.openingHours;
 if(!openingHours&&detail?.openingHours){const source:HoursSource={venueId:d.spotId,locationName:spot.name,timezone:spot.timezone||'UTC',timezoneBasis:'Explicit fictional location scenario; not a verified operator schedule.',weekly:hoursWeekDays.map((day,i)=>{const h=detail.openingHours!.find(h=>h.days===(i<5?'Monday–Friday':'Saturday–Sunday'));return {day,closed:!h,opens:h?.opens||'',closes:h?.closes||'',overnight:false};}),exceptions:[],sourceId:d.spotId+':fictional-hours-v1',observedAt:Date.UTC(2026,9,30),revision:1,kind:'fictional-example',status:'published'};validateHoursSource(source);openingHours=source;}
 const ids=new Set(w.objects.map(o=>o.id));return {...w,venues:w.venues.map(v=>v.id===d.spotId?{...v,openingHours,services:[...new Set([...v.services,...(items.some(i=>i.kind==='food'||i.kind==='drink')?['Food & drinks']:[]),...(items.some(i=>i.kind==='product')?['Shop']:[])])]}:v),objects:[...w.objects.map(o=>o.id===catalogueId&&o.fixtureOnly===true&&o.realCoreAuthority===false?records[0]:o),...records.filter(r=>!ids.has(r.id))],settings:{...w.settings,[key]:LOCAL_SPOT_PROCESS_VERSION}};
}
