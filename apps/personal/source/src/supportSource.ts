import {mayRead,type ActionContext,type ProductWorld,type Payment} from './productModel.ts';
const text=(v:unknown,max=500):v is string=>typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=max&&!/nsec1|-----BEGIN.*PRIVATE KEY/i.test(v);
const paymentValid=(p:Payment)=>text(p.id)&&text(p.sourceId)&&text(p.recipient)&&text(p.asset,100)&&text(p.amount,100)&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(p.amount)&&typeof p.status==='string'&&['prepared','approved','submitted','pending','confirmed','unknown','failed','cancelled'].includes(p.status);
/** Exact own support metadata. It never authorizes refunds, payment retries or media access. */
export function supportSource(w:ProductWorld,ctx:Partial<ActionContext>,paymentChoice=''){
 const empty={owner:'',sourceId:'',partyId:'',partyName:'CRAYS support',paymentId:'',payment:'No payment linked',licence:'Not applicable',media:'Not applicable',licenceReferences:[] as string[]};
 if(w.identity.signedIn!==true||!text(w.owner))return {state:empty,candidates:[] as Payment[],held:true,review:JSON.stringify(empty)};
 let malformed=false;
 for(const field of ['objects','payments','posts','venues','people'] as const){const rows=w[field];if(!Array.isArray(rows)||rows.some(x=>!x||typeof x!=='object'||Array.isArray(x)))malformed=true;}
 w={...w,objects:(Array.isArray(w.objects)?w.objects:[]).filter(x=>x&&typeof x==='object'),payments:(Array.isArray(w.payments)?w.payments:[]).filter(x=>x&&typeof x==='object'),posts:(Array.isArray(w.posts)?w.posts:[]).filter(x=>x&&typeof x==='object'),venues:(Array.isArray(w.venues)?w.venues:[]).filter(x=>x&&typeof x==='object'),people:(Array.isArray(w.people)?w.people:[]).filter(x=>x&&typeof x==='object')};
 if([ctx.objectId,ctx.sourceId,ctx.postId,ctx.venueId].some(v=>v!==undefined&&v!==''&&!text(v)))malformed=true;
 const ids=[ctx.objectId,ctx.sourceId,ctx.postId].filter((v):v is string=>typeof v==='string'&&!!v);
 const uniquePost=(id:string)=>{const rows=w.posts.filter(p=>p.id===id);if(rows.length!==1||!text(rows[0].id)||!text(rows[0].author)||!['Public','Community','On-site','Private group'].includes(rows[0].audience))return;try{return mayRead(w,rows[0])?rows[0]:undefined;}catch{return;}};
 const uniqueObject=(id:string)=>{const rows=w.objects.filter(o=>o.id===id);return rows.length===1&&rows[0].owner===w.owner?rows[0]:undefined;};
 const ownPayments=w.payments.filter(p=>p.owner===w.owner&&w.payments.filter(q=>q.id===p.id).length===1&&paymentValid(p));
 const direct=ownPayments.filter(p=>ids.includes(p.id));
 const post=ids.map(uniquePost).find(Boolean)||direct.map(p=>uniquePost(p.sourceId)).find(Boolean);
 const object=ids.map(uniqueObject).find(Boolean)||direct.map(p=>uniqueObject(p.sourceId)).find(Boolean);
 const candidates=ownPayments.filter(p=>p.sourceId===post?.id||p.sourceId===object?.id||direct.includes(p));
 const chosen=paymentChoice?candidates.find(p=>p.id===paymentChoice):direct.length===1?direct[0]:candidates.length===1?candidates[0]:undefined;
 const venues=ctx.venueId?w.venues.filter(v=>v.id===ctx.venueId):[],venue=venues.length===1?venues[0]:undefined;
 const partyId=chosen?.recipient||post?.author||(text(object?.sellerId)?object.sellerId:text(object?.venueId)?object.venueId:venue?.id)||'';
 const namedPerson=w.people.filter(p=>p.id===partyId),namedVenue=w.venues.filter(v=>v.id===partyId);
 const partyName=text(chosen?.merchantCheckout?.sellerName)?chosen.merchantCheckout!.sellerName:text(w.profiles?.[partyId]?.name)?w.profiles[partyId].name:namedPerson.length===1?namedPerson[0].name:namedVenue.length===1?namedVenue[0].name:partyId?'Original provider':'CRAYS support';
 const licence=post?.protected?w.objects.filter(o=>text(o.id)&&o.owner===w.owner&&o.kind==='license'&&o.postId===post.id&&(!chosen||o.sourcePayment===chosen.id)&&w.objects.filter(q=>q.id===o.id).length===1).map(o=>({id:o.id,status:text(o.status)?o.status:'Needs review'})):[];
 const sourceId=post?.id||object?.id||chosen?.sourceId||venue?.id||'';
 const unknown=ids.some(id=>!uniquePost(id)&&!uniqueObject(id)&&!direct.some(p=>p.id===id));
 const requestedOriginals=[...ids.map(id=>uniquePost(id)?.id),...ids.map(id=>uniqueObject(id)?.id),...direct.map(p=>p.sourceId)].filter(Boolean);
 const conflicting=new Set(requestedOriginals).size>1||Boolean(post&&object&&post.id!==object.id)||direct.some(p=>post&&p.sourceId!==post.id||object&&p.sourceId!==object.id);
 const held=malformed||unknown||conflicting||!!ctx.venueId&&venues.length!==1||!!paymentChoice&&!chosen||candidates.length>1&&!chosen;
 const state={owner:w.owner,sourceId,partyId,partyName:typeof partyName==='string'?partyName:'Original provider',paymentId:chosen?.id||'',payment:chosen?`${chosen.status} · ${chosen.amount} ${chosen.asset}`:candidates.length>1?'Choose the exact original payment':'No payment linked',licence:post?post.protected?(licence.length?licence.map(l=>l.status).join(' · '):post.license===true?'Original reports access granted':'Not granted'):'No paid licence required':'Not applicable',media:post?(post.mediaAvailable===true?'Source reports media available':'Media currently unavailable'):'Not applicable',licenceReferences:licence.map(l=>l.id)};
 return {state,candidates,held,review:JSON.stringify(state)};
}
