import type {ProductWorld} from './productModel';
import {contentAccessSnapshot} from './publishing';
export type AccessReview={owner:string;postId:string;source:string;original:string;draft:string};
const draftKey=(owner:string,id:string)=>`${owner}:access:${id}`;
const validDraft=(value:unknown):value is Record<string,string>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&['audience','purchase','access','duration','conditions','preview','fullText','groupId'].every(key=>typeof (value as Record<string,unknown>)[key]==='string')&&(!Object.hasOwn(value,'sourceReview')||typeof (value as Record<string,unknown>).sourceReview==='string');
export function captureAccessReview(world:ProductWorld,postId:string):AccessReview{
 const source=contentAccessSnapshot(world,postId),post=world.posts.find(p=>p.id===postId),draft=world.drafts[draftKey(world.owner,postId)];
 if(!source||!post||!validDraft(draft))throw Error('Reopen your current original and retained choices before reviewing.');
 return {owner:world.owner,postId,source,original:JSON.stringify(post),draft:JSON.stringify(draft)};
}
export function accessReviewProblem(world:ProductWorld,review:AccessReview):string{
 if(world.owner!==review.owner)return 'Your account changed. Close this review and reopen your own original.';
 const source=contentAccessSnapshot(world,review.postId),post=world.posts.find(p=>p.id===review.postId);
 if(!source||!post)return 'This original or your publishing permission is no longer available. Close this review.';
 if(source!==review.source||JSON.stringify(post)!==review.original)return 'The original changed during this review. Close and review the latest original again.';
 if(!validDraft(world.drafts[draftKey(review.owner,review.postId)]))return 'Your retained choices need review. Nothing has been replaced.';
 if(JSON.stringify(world.drafts[draftKey(review.owner,review.postId)])!==review.draft)return 'Your retained choices changed during this review. Close and review them again.';
 return '';
}
/** Explicit review changes only the held draft's baseline, never its choices or canonical original. */
export function prepareAccessReview(world:ProductWorld,review:AccessReview,confirmed:boolean):ProductWorld{
 if(!confirmed)throw Error('Review and confirm these exact choices first.');
 const problem=accessReviewProblem(world,review);if(problem)throw Error(problem);
 const key=draftKey(review.owner,review.postId);
 return {...world,drafts:{...world.drafts,[key]:{...world.drafts[key],sourceReview:review.source}}};
}
