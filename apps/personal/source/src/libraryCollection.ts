import {ownPrivateAccount} from './ownPrivateAccount';
import {mayRead,type ProductWorld,type Post,type Payment} from './productModel.ts';
export const libraryViews=['Saved','Read','Purchased','Your posts','Drafts','Planned'] as const;
export type LibraryView=typeof libraryViews[number];
function readableOriginal(world:ProductWorld,post:Post){
 return (post.author===world.owner||post.status==='accepted'||post.status==='partial')&&mayRead(world,post);
}
const statuses=new Set(['prepared','approved','submitted','pending','confirmed','unknown','failed','refunded']);
function ownPayments(world:ProductWorld){
 if(!ownPrivateAccount(world))return [];
 return world.payments.filter(p=>p.owner===world.owner&&p.purpose==='Content purchase'&&typeof p.id==='string'&&p.id&&typeof p.sourceId==='string'&&p.sourceId&&statuses.has(p.status)&&world.payments.filter(x=>x.id===p.id).length===1);
}
export function libraryPaymentLabel(payment:Payment){
 const labels:Record<string,string>={prepared:'Payment draft · not submitted',approved:'Approved · not yet confirmed',submitted:'Submitted · awaiting outcome',pending:'Payment pending',confirmed:'Paid · content access separate',unknown:'Outcome unknown · check original payment',failed:'Payment failed · no new access confirmed',refunded:'Refund recorded · review access separately'};
 return labels[payment.status]||'Payment record needs source review';
}
export function libraryAccessLabel(world:ProductWorld,post:Post){
 if(!ownPrivateAccount(world))return 'Sign in to review your access';
 const originals=world.posts.filter(p=>p.id===post.id);
 if(originals.length!==1)return 'Original needs source review';
 post=originals[0];
 if(!readableOriginal(world,post))return 'Original unavailable with current access';
 const payments=ownPayments(world).filter(p=>p.sourceId===post.id);
 const access=post.license===true?(post.mediaAvailable===true?'Ready to open':'Rights retained · media unavailable'):'';
 if(payments.length>1)return [access,`${payments.length} original payment records · review separately`].filter(Boolean).join(' · ');
 if(access)return [access,payments[0]?.status==='unknown'?'Payment outcome unknown':payments[0]?.status==='refunded'?'Refund recorded':''].filter(Boolean).join(' · ');
 return payments[0]?libraryPaymentLabel(payments[0]):'Saved original';
}
export function libraryCollection(world:ProductWorld,view:string,query:string){
 const empty={posts:[] as Post[],unavailable:[] as {sourceId:string;payments:Payment[]}[],recordsNeedingReview:0};
 if(!ownPrivateAccount(world)||!libraryViews.includes(view as LibraryView))return empty;
 const payments=ownPayments(world),q=typeof query==='string'?query.trim().toLowerCase():'';
 const readable=world.posts.filter(p=>typeof p.id==='string'&&typeof p.title==='string'&&typeof p.text==='string'&&world.posts.filter(x=>x.id===p.id).length===1&&readableOriginal(world,p));
 const posts=readable.filter(p=>(view==='Saved'?p.saved===true:view==='Read'?(Number.isFinite(p.readPosition)&&p.readPosition>0||typeof p.highlight==='string'&&!!p.highlight):view==='Purchased'?p.license===true||payments.some(x=>x.sourceId===p.id):view==='Drafts'?p.author===world.owner&&p.status==='draft':view==='Planned'?p.author===world.owner&&p.status==='scheduled':p.author===world.owner)&&`${p.title} ${p.text}`.toLowerCase().includes(q));
 const unavailable:typeof empty.unavailable=[];
 if(view==='Purchased')for(const sourceId of new Set(payments.map(p=>p.sourceId))){
  if(readable.some(p=>p.id===sourceId))continue;
  const originals=payments.filter(p=>p.sourceId===sourceId);
  // Search only the owner's payment metadata, never a now-hidden post's title or text.
  if(!q||originals.some(p=>`${p.reference||''} ${p.recipient||''} ${p.sourceId}`.toLowerCase().includes(q)))unavailable.push({sourceId,payments:originals});
 }
 return {posts,unavailable,recordsNeedingReview:world.payments.filter(p=>p.owner===world.owner&&p.purpose==='Content purchase'&&!payments.includes(p)).length};
}
