import type {ProductWorld,Entity} from './productModel';
export function creatorUSDPreviewPrice(sellerId:string,subscription:boolean){const i=['maya-creator','kai-creator','lena-creator'].indexOf(sellerId);return String(subscription?[9,12,19][Math.max(0,i)]:[4,6,8][Math.max(0,i)]);}
/** Original offers/receipts remain intact. Only named sample offers get a separate new USD proposal. */
export function withCreatorUSDPreview(w:ProductWorld):ProductWorld{
 if(w.owner!=='thorben'||!w.settings.demoHistory)return w;
 const known=new Set(['alex','maya-creator','kai-creator','lena-creator']);
 const added=w.objects.filter(o=>o.kind==='public-creator-offer'&&o.sample===true&&o.version==='demo-offer-v1'&&o.currency!=='USD'&&known.has(String(o.sellerId))&&w.posts.some(p=>p.id===o.postId&&p.author===o.sellerId)&&!w.objects.some(n=>n.id===`usd-preview:${o.id}`)).map(o=>({...o,id:`usd-preview:${o.id}`,supersedesOfferId:o.id,currency:'USD',price:creatorUSDPreviewPrice(String(o.sellerId),o.type==='subscription'),version:'usd-preview-v2',sourceAuthority:'fictional-preview',pricingProposal:true,conditions:`${String(o.conditions||'')} Independent USD preview proposal; no conversion of the original payment-asset price.`}));
 return added.length?{...w,objects:[...added,...w.objects]}:w;
}
export function currentCreatorOffer(w:ProductWorld,o:Entity){return o.kind==='public-creator-offer'&&o.status==='published-demo'&&o.currency==='USD'&&!w.objects.some(n=>n.kind==='public-creator-offer'&&n.status==='published-demo'&&n.supersedesOfferId===o.id);}
