import {canManagePublishingOriginal} from './publishing';
import {ownPrivateAccount} from './ownPrivateAccount';
import {hasArtistNftOriginalAccess} from './artistNft.ts';
import {hasCreatorTrialAccess} from './creatorTrial.ts';
import {mayRead,type ProductWorld,type Post} from './productModel.ts';
/** Existing local entitlement model only; not a substitute for server-side/cryptographic authorisation. */
export function canReadPaidOriginal(world:ProductWorld,post:Post){
 const originals=world.posts.filter(p=>p.id===post.id);if(originals.length!==1)return false;
 const original=originals[0];if(!mayRead(world,original))return false;
 return !original.protected||(ownPrivateAccount(world)&&(canManagePublishingOriginal(world,original)||original.license===true||hasArtistNftOriginalAccess(world,original.id)||hasCreatorTrialAccess(world,original)));
}
/** Resolve media only from the unique, currently authorised stored original. */
export function readableOriginalMedia(world:ProductWorld,post:Post){
 if(!canReadPaidOriginal(world,post))return [];
 const original=world.posts.find(p=>p.id===post.id)!;
 return original.mediaAvailable?(original.publishing?.media||original.demoMedia||[]):[];
}

/** Accepted access uses its own term; an invitation expiry does not end an accepted grant. */
export function nextPaidOriginalExpiry(world:ProductWorld,now=Date.now()){
 const times=world.objects.filter(o=>o.owner===world.owner&&o.kind==='creator-access'&&o.status==='active').flatMap(o=>[Number(o.startsAt),Number(o.endsAt)]);
 for(const p of world.posts)if(p.publishing?.format==='Story'&&p.status!=='draft')times.push(Number(p.publishing.storyExpiresAt));
 return Math.min(...times.filter(t=>Number.isFinite(t)&&t>now));
}
