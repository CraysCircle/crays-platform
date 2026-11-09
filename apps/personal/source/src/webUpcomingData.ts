import type {Entity,ProductWorld,Venue} from './productModel';
/** Isolated click-dummy fixtures, never a Core booking or a provider confirmation. */
export function withWebUpcomingFixtures(world:ProductWorld):ProductWorld{
 if(!world.identity.signedIn||world.owner!=='thorben'||world.identity.destination!=='Demo account'||world.settings.webUpcomingFixturesV1)return world;
 const venue:Venue={id:'web-demo-marina',name:'Marina Hotel · Forest City',type:'Club',city:'Forest City',description:'A place to stay, meet and enjoy time together.',image:'/assets/crays/member-marina-original.webp',services:['Stay','Dining','Golf','Wellness'],visited:false,membership:'none',grant:'none',otherGrant:false,presence:'none',visibility:{},area:'Forest City',operatorActive:false,role:'Guest',relay:''};
 const common={owner:world.owner,kind:'booking',venueId:venue.id,timezone:'Asia/Kuala_Lumpur',paymentStatus:'Not confirmed',webPreviewFixture:true};
 const objects:Entity[]=[
  {...common,id:'web-demo-marina-stay',name:'Marina Hotel · Forest City',bookingType:'stay',planCategory:'Stay',date:'2026-11-11',endDate:'2026-11-30',time:'15:00',nights:19,partySize:'2',status:'confirmed',participants:'Thorben and Daniel',image:'/assets/crays/member-marina-original.webp'},
  {...common,id:'web-demo-club-dinner',name:'Dinner at The Club',planCategory:'Dinner',date:'2026-11-12',time:'19:00',endTime:'21:00',partySize:'2',status:'confirmed',image:'/assets/crays/member-dining.webp'},
  {...common,id:'web-demo-team-golf',name:'Team golf',planCategory:'Golf',date:'2026-11-14',time:'08:00',endTime:'11:00',partySize:'4',status:'requested',image:'/assets/crays/member-golf.webp'},
  {...common,id:'web-demo-spa',name:'Spa session',planCategory:'Wellness',date:'2026-11-15',time:'16:00',endTime:'17:00',partySize:'2',status:'confirmed',image:'/assets/crays/member-wellness.webp'},
  {...common,id:'web-demo-undated',name:'Massage for 2',planCategory:'Wellness',date:'',time:'',partySize:'2',status:'draft',image:'/assets/crays/member-wellness.webp'},
  {...common,id:'web-demo-past',name:'Dinner with friends',planCategory:'Dinner',date:'2026-10-20',time:'19:00',status:'confirmed',image:'/assets/crays/member-dining.webp'},
  {...common,id:'web-demo-cancelled',name:'An afternoon on the course',planCategory:'Golf',date:'2026-10-22',time:'14:00',status:'cancelled',image:'/assets/crays/member-golf.webp'},
 ];
 return {...world,settings:{...world.settings,webUpcomingFixturesV1:true},venues:world.venues.some(v=>v.id===venue.id)?world.venues:[...world.venues,venue],objects:[...world.objects,...objects.filter(o=>!world.objects.some(existing=>existing.id===o.id))]};
}
