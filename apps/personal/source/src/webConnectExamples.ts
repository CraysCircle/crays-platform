import type {Person,ProductWorld} from './productModel';
/** Fictional web-only actors; no Core users, imported identities or private disclosures. */
export function withWebConnectExamples(world:ProductWorld):ProductWorld{
 if(world.owner!=='thorben'||!world.identity.signedIn||world.identity.destination!=='Demo account'||world.settings.webConnectExamplesV1)return world;
 const place=world.venues.find(v=>v.id==='harbor-house');if(!place)return world;
 const actors:Person[]=[
  {id:'web-demo-connect-nora',name:'Nora Ellis',bio:'Film, travel and the stories that start around a shared table.',avatar:'person-maya-creator.webp',purpose:'Socializing',requestPurposes:['Socializing','Business']},
  {id:'web-demo-connect-jordan',name:'Jordan Park',bio:'Design, shared spaces and small creative collaborations.',avatar:'person-lena-creator.webp',purpose:'Business',requestPurposes:['Socializing','Business']},
  {id:'web-demo-connect-leah',name:'Leah Taylor',bio:'Movement, good food and thoughtful conversations with new people.',avatar:'person-kai-creator.webp',purpose:'Socializing',requestPurposes:['Socializing','Business']},
 ].map(p=>({...p,following:false,contact:false,blocked:false,requestsEnabled:true,request:'none',consentSelf:false,consentOther:false,communityVenueIds:['harbor-house'],publicAffiliationIds:['space:harbor-house'],localPresence:false,localVisibility:{Socializing:false,Business:false,Dating:false}} as Person));
 return {...world,settings:{...world.settings,webConnectExamplesV1:true},people:[...world.people,...actors.filter(p=>!world.people.some(x=>x.id===p.id))],objects:[...world.objects,{id:'web-demo-connect-provenance',owner:world.owner,kind:'web-demo-scenario',name:'Illustrative community introductions',actors:actors.map(p=>p.id),sourceAuthority:'fictional-preview',liveExecution:false}]};
}
