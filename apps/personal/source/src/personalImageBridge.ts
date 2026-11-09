import type {ActionContext,ActionResult,ProductWorld} from './productModel.ts';
import {imageFor,imageAccess,imageExport,imageReview,imageLinkedMediaCurrent,imageLinkedPublicationCurrent} from './personalImageJourney.ts';
type Run=(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext)=>ActionResult;
function need(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
/** A provisional media/post copy is committed only together with its exact source binding. */
export function personalImageBridge(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,run:Run):ActionResult{
 const id=ctx.objectId||'',r=imageFor(w,id),version=Number(data.selectedVersion);
 need(w.identity.signedIn&&data.approved==='Yes'&&r&&imageAccess(w,r),'Review your exact current private image output.');
 need((!ctx.sourceTaskId||ctx.sourceTaskId===r.sourceTaskId)&&(!ctx.capabilityId||ctx.capabilityId===r.capabilityId)&&data.version===String(r.version)&&data.review===imageReview(w,r.draft,r.id),'This task, output, input or permission changed. Review again.');
 const a=imageExport(w,id,version);need(a.mime==='image/png'&&Number.isSafeInteger(version),'Choose an actual saved image version.');
 const context:ActionContext={featureId:'AL-293',objectId:id,sourceTaskId:r.sourceTaskId,capabilityId:r.capabilityId};
 need(r.mediaLinks.filter(x=>x.version===version).length<=1&&r.publicationDrafts.filter(x=>x.version===version).length<=1,'This output version has conflicting original links.');
 const priorMedia=r.mediaLinks.find(x=>x.version===version);let mediaId=priorMedia?.mediaId||'',provisional=w;
 if(mediaId)need(imageLinkedMediaCurrent(w,mediaId),'The previously linked private media original changed or is no longer readable.');
 else{
  const added=run(w,'media.add',{name:r.versions[version-1].draft.title,mime:'image/png',dataUrl:a.dataUrl,size:String(Math.floor(a.dataUrl.split(',')[1].length*3/4)),rights:'Yes',provider:'Not selected'},{featureId:'AL-196'});need(added.ok,added.message);mediaId=added.objectId;
  const current=imageFor(added.world,id);need(current&&imageAccess(added.world,current),'The image source changed while preparing its private media copy.');
  const linked=run(added.world,'personal.image.media.attach',{approved:'Yes',review:imageReview(added.world,current.draft,id),version:String(current.version),selectedVersion:String(version),mediaId},context);need(linked.ok,linked.message);provisional=linked.world;
 }
 if(op==='personal.image.media.save')return{ok:true,world:provisional,objectId:mediaId,message:'This saved output is linked to the same private media original. Nothing was published.'};
 need(op==='personal.image.publication.save','Choose a private media or separate publication draft.');
 const current=imageFor(provisional,id);need(current,'The original image result is missing.');const old=current.publicationDrafts.find(x=>x.version===version);
 if(old){need(imageLinkedPublicationCurrent(provisional,old.postId),'The existing publication draft changed or its source is no longer readable.');return{ok:true,world:provisional,objectId:old.postId,message:'The same separate unsent publication draft is ready to review.'};}
 const title=current.versions[version-1].draft.title;
 const prepared=run(provisional,'complete.publishing.save',{format:'Post',publisherId:w.owner,text:title,title,audience:'Public',targets:'["global"]',media:JSON.stringify([{id:mediaId,name:title,url:a.dataUrl,kind:'image',alt:title,state:'local'}]),mediaRights:'Yes',offer:'No',expectedVersion:'0'},{featureId:'AL-113'});need(prepared.ok,prepared.message);
 const post=prepared.world.posts.find(p=>p.id===prepared.objectId&&p.author===w.owner&&p.status==='draft');need(post,'The own unsent publication draft is unavailable.');post.mediaId=mediaId;
 const latest=imageFor(prepared.world,id);need(latest,'The source image result changed.');
 const attached=run(prepared.world,'personal.image.publication.attach',{approved:'Yes',version:String(latest.version),review:imageReview(prepared.world,latest.draft,id),selectedVersion:String(version),postId:post.id},context);need(attached.ok,attached.message);
 return{ok:true,world:attached.world,objectId:post.id,message:'Separate unsent publication draft prepared. Review its audience, signer and destinations before publishing.'};
}
