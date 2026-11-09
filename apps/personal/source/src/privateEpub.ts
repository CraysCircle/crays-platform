import {mayRead,type ActionContext,type Entity,type ProductWorld} from './productModel.ts';
import {canReadPaidOriginal} from './paidContentAccess.ts';
import {localPreviewId} from './localPreviewId.ts';
import {createPrivateEpub,sha256Hex,type EpubTextChapter} from './privateEpubGenerator.ts';
import {privateEpubResource,type EpubResourceRef} from './privateEpubResources.ts';
export type EpubChapterRef={postId:string;sourceRevision:string;permissionId:string;title:string};
export type PrivateEpubDraft={title:string;creator:string;language:string;chapters:EpubChapterRef[];resources?:EpubResourceRef[]};
type Artifact={sha256:string;size:number;files:{path:string;size:number;crc32:number}[];generatedAt:number;draftFingerprint:string};
export type PrivateEpubJob=Entity&{kind:'private-epub-job-preview';exampleOnly:true;version:number;taskId:string;taskFingerprint:string;creationKey:string;creationFingerprint:string;draft:PrivateEpubDraft;state:'prepared'|'unknown'|'failed'|'ready';artifact:Artifact|null;history:{version:number;state:string;at:number;action:string;draft:PrivateEpubDraft;artifact:Artifact|null}[];receipts:{key:string;request:string}[]};
type CopyPermission=Entity&{kind:'epub-copy-permission-preview';version:number;issuerId:string;recipientId:string;postId:string;sourceRevision:string;state:'active'|'revoked';startsAt:number;expiresAt:number;format:'EPUB';scope:'text-body-copy-only';reviewProof:string;exampleOnly:true};
const prefix='epub.';
function need(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
function unique(w:ProductWorld,id:string,kind:string){const rows=w.objects.filter(o=>o.id===id);return rows.length===1&&rows[0].kind===kind?rows[0]:undefined;}
function taskFingerprint(w:ProductWorld,id:string){const t=unique(w,id,'agent-task');need(w.identity.signedIn&&t?.owner===w.owner&&t.origin==='explicit-chuck-request'&&t.aiExecutionRequested===true&&typeof t.sourceMessageId==='string'&&t.sourceMessageId.length>0&&t.aiRequestMessageId===t.sourceMessageId&&(t.capabilityId==='B2C-CAP-120'||(t.sourceContext as Record<string,string>|undefined)?.capabilityId==='B2C-CAP-120')&&typeof t.request==='string'&&t.request.trim()&&!['cancelled','failed'].includes(String(t.status)),'Open your own current offline-reading task.');return sha256Hex(JSON.stringify({owner:w.owner,id,request:t.request,revision:t.aiRequestRevision||1,message:t.sourceMessageId||'',context:t.sourceContext||{}}));}
function readableText(w:ProductWorld,id:string){
 need(w.identity.signedIn,'Sign in to your own private reading.');const matches=w.posts.filter(p=>p.id===id),p=matches[0];
 need(matches.length===1&&p&&!p.archived&&['note','article','document'].includes(p.type)&&(p.author===w.owner?!['withdrawn','deleted'].includes(p.status):['accepted','partial'].includes(p.status))&&mayRead(w,p)&&canReadPaidOriginal(w,p),'This exact text original is unavailable with current reading access.');
 const authors=w.people.filter(person=>person.id===p.author);need(authors.length<=1&&!authors.some(person=>person.blocked||person.blockedByOther),'This author or original is no longer available.');
 const text=p.fullText||p.text;need(typeof text==='string'&&text.trim()&&text.length<=200000,'Select a supported text body; attached PDFs, images and protected files are not fetched.');
 return {post:p,text,revision:sha256Hex(JSON.stringify({id:p.id,author:p.author,title:p.title,text,type:p.type,status:p.status,audience:p.audience,groupId:p.groupId||'',venueId:p.venueId||'',publishingRevision:p.publishing?.revision||0}))};
}
function permissionProof(g:Pick<CopyPermission,'issuerId'|'recipientId'|'postId'|'sourceRevision'|'startsAt'|'expiresAt'>){return sha256Hex(JSON.stringify({issuerId:g.issuerId,recipientId:g.recipientId,postId:g.postId,sourceRevision:g.sourceRevision,startsAt:g.startsAt,expiresAt:g.expiresAt,format:'EPUB',scope:'text-body-copy-only',authority:'author-personally-reviewed-local-example'}));}
function qualifiedPermission(w:ProductWorld,id:string,postId:string,revision:string,now:number){const g=unique(w,id,'epub-copy-permission-preview') as CopyPermission|undefined,p=w.posts.find(p=>p.id===postId);return g&&g.owner===g.issuerId&&g.issuerId===p?.author&&g.recipientId===w.owner&&g.postId===postId&&g.sourceRevision===revision&&g.exampleOnly===true&&g.format==='EPUB'&&g.scope==='text-body-copy-only'&&g.state==='active'&&g.startsAt<=now&&g.expiresAt>now&&g.reviewProof===permissionProof(g)?g:undefined;}
export function privateEpubSource(w:ProductWorld,postId:string,permissionId='',now=Date.now()){
 const source=readableText(w,postId),own=source.post.author===w.owner;
 need(own||qualifiedPermission(w,permissionId,postId,source.revision,now),'Reading access is not copy/export permission. This source needs its author’s exact current EPUB text-copy grant.');
 return {postId,title:source.post.title,text:source.text,sourceRevision:source.revision,permissionId:own?'':permissionId,rightBasis:own?'own-authored-text' as const:'author-granted-text-copy' as const};
}
export function privateEpubCandidates(w:ProductWorld,now=Date.now()){
 if(!w.identity.signedIn)return [];
 return w.posts.flatMap(p=>{for(const permissionId of ['',...w.objects.filter(o=>o.kind==='epub-copy-permission-preview'&&o.postId===p.id&&o.recipientId===w.owner).map(o=>o.id)]){try{return [privateEpubSource(w,p.id,permissionId,now)];}catch{/* Try the next exact current grant; never infer copying from reading. */}}return [];});
}
export function privateEpubDraftReview(w:ProductWorld,taskId:string,input:PrivateEpubDraft,now=Date.now()){
 const fp=taskFingerprint(w,taskId);need(input&&typeof input.title==='string'&&input.title.trim().length>0&&input.title.length<=200&&typeof input.creator==='string'&&input.creator.trim().length>0&&input.creator.length<=160&&/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(input.language)&&Array.isArray(input.chapters)&&input.chapters.length>0&&input.chapters.length<=100&&new Set(input.chapters.map(c=>c.postId)).size===input.chapters.length,'Review title, creator, language and one to 100 unique text originals.');
 const chapters=input.chapters.map(c=>{need(c&&typeof c.title==='string'&&c.title.trim()&&c.title.length<=200&&typeof c.permissionId==='string','Give each selected chapter its own title.');const source=privateEpubSource(w,c.postId,c.permissionId,now);need(source.sourceRevision===c.sourceRevision&&source.permissionId===c.permissionId,'A selected source version or export permission changed. Select its current original again.');return {postId:c.postId,sourceRevision:c.sourceRevision,permissionId:c.permissionId,title:c.title.trim()};});
 const resources=input.resources||[];need(Array.isArray(resources)&&resources.length<=6&&new Set(resources.map(r=>r.assetId)).size===resources.length,'Review up to six unique image originals.');const selectedResources=resources.map(r=>{need(typeof r.alt==='string'&&r.alt.trim()&&r.alt.length<=300,'Describe each permitted embedded image.');const original=privateEpubResource(w,r.assetId);need(original.sourceRevision===r.sourceRevision,'An image original or its export scope changed. Remove it or select its current original again.');return {assetId:r.assetId,sourceRevision:r.sourceRevision,alt:r.alt.trim()};});
 const draft={title:input.title.trim(),creator:input.creator.trim(),language:input.language,chapters,...(selectedResources.length?{resources:selectedResources}:{})};
 return {draft,taskFingerprint:fp,snapshot:JSON.stringify({owner:w.owner,taskId,taskFingerprint:fp,draft})};
}
function validJob(o:Entity):boolean{try{const j=o as PrivateEpubJob;return Boolean(j.kind==='private-epub-job-preview'&&j.exampleOnly===true&&Number.isSafeInteger(j.version)&&j.version>0&&typeof j.taskId==='string'&&/^[a-f0-9]{64}$/.test(j.taskFingerprint)&&typeof j.creationKey==='string'&&typeof j.creationFingerprint==='string'&&['prepared','unknown','failed','ready'].includes(j.state)&&Array.isArray(j.draft.chapters)&&j.draft.chapters.every(c=>Object.keys(c).every(k=>['postId','sourceRevision','permissionId','title'].includes(k))&&/^[a-f0-9]{64}$/.test(c.sourceRevision))&&(!j.draft.resources||(Array.isArray(j.draft.resources)&&j.draft.resources.length<=6&&j.draft.resources.every(r=>Object.keys(r).every(k=>['assetId','sourceRevision','alt'].includes(k))&&typeof r.assetId==='string'&&typeof r.alt==='string'&&/^[a-f0-9]{64}$/.test(r.sourceRevision))))&&Array.isArray(j.history)&&j.history.length===j.version&&j.history.at(-1)?.state===j.state&&JSON.stringify(j.history.at(-1)?.draft)===JSON.stringify(j.draft)&&Array.isArray(j.receipts)&&new Set(j.receipts.map(r=>r.key)).size===j.receipts.length&&(j.state!=='ready'||j.artifact&&/^[a-f0-9]{64}$/.test(j.artifact.sha256)&&j.artifact.size>0));}catch{return false;}}
export function ownPrivateEpubJobs(w:ProductWorld):PrivateEpubJob[]{return w.identity.signedIn?w.objects.filter((o):o is PrivateEpubJob=>o.owner===w.owner&&unique(w,o.id,'private-epub-job-preview')===o&&validJob(o)):[];}
function job(w:ProductWorld,id:string){const j=ownPrivateEpubJobs(w).find(j=>j.id===id);need(j,'Open your own unambiguous private EPUB job.');return j;}
function currentJob(w:ProductWorld,id:string,now:number){const j=job(w,id),review=privateEpubDraftReview(w,j.taskId,j.draft,now);need(review.taskFingerprint===j.taskFingerprint,'The original Chuck request changed. Earlier private export metadata is retained.');return {j,review};}
export function privateEpubPreview(w:ProductWorld,id:string,now=Date.now()){
 const {j}=currentJob(w,id,now);
 return j.draft.chapters.map(c=>{const s=privateEpubSource(w,c.postId,c.permissionId,now);return {title:c.title,text:s.text,sourceId:`post:${c.postId}`,sourceRevision:s.sourceRevision} satisfies EpubTextChapter;});
}
export function privateEpubProjection(w:ProductWorld,id:string,now=Date.now()){
 let j:PrivateEpubJob;try{j=job(w,id);}catch{return;}
 try{return {job:j,held:false,message:'Current source and text-copy rights reviewed.',chapters:privateEpubPreview(w,id,now),resources:currentResources(w,j)};}catch(e){return {job:j,held:true,message:e instanceof Error?e.message:String(e),chapters:[]};}
}
export function privateEpubActionSnapshot(w:ProductWorld,id:string,action:string,now=Date.now()){const {j,review}=currentJob(w,id,now);return JSON.stringify({id,version:j.version,action,review:sha256Hex(review.snapshot),state:j.state});}
function currentResources(w:ProductWorld,j:PrivateEpubJob){return (j.draft.resources||[]).map(r=>{const current=privateEpubResource(w,r.assetId);need(current.sourceRevision===r.sourceRevision,'An embedded image source changed.');return {id:r.assetId,mime:current.mime,bytes:current.bytes,alt:r.alt};});}
export function privateEpubDownload(w:ProductWorld,id:string,now=Date.now()){
 const {j}=currentJob(w,id,now);need(j.state==='ready'&&j.artifact,'Generate and validate this private EPUB first.');
 need(j.artifact.draftFingerprint===sha256Hex(JSON.stringify(j.draft)),'The export metadata changed. Generate a fresh reviewed result.');
 const result=createPrivateEpub({id:j.id,title:j.draft.title,creator:j.draft.creator,language:j.draft.language,modifiedAt:j.artifact.generatedAt,chapters:privateEpubPreview(w,id,now),resources:currentResources(w,j)});
 need(result.sha256===j.artifact.sha256&&result.size===j.artifact.size,'The current artifact differs from its retained generation receipt.');
 return {...result,filename:`crays-private-reading-${j.id.replace(/[^a-zA-Z0-9-]/g,'')}.epub`};
}
export function epubCopyPermissionReview(w:ProductWorld,postId:string,recipientId:string,expiresAt:string,now=Date.now()){
 const source=readableText(w,postId);need(source.post.author===w.owner,'Only this original’s signed-in author can grant its text-copy scope.');
 need(typeof recipientId==='string'&&recipientId!==w.owner&&w.people.filter(p=>p.id===recipientId&&!p.blocked&&!p.blockedByOther).length===1,'Choose an exact known recipient for this personal permission.');
 const expiry=Date.parse(expiresAt);need(Number.isFinite(expiry)&&expiry>now&&expiry<=now+365*86400000,'Choose a future permission expiry within one year.');
 return {postId,recipientId,sourceRevision:source.revision,expiresAt:expiry,snapshot:JSON.stringify({issuerId:w.owner,recipientId,postId,sourceRevision:source.revision,expiresAt:expiry,scope:'text-body-copy-only',format:'EPUB'})};
}
export function ownIssuedEpubPermissions(w:ProductWorld):CopyPermission[]{return w.identity.signedIn?w.objects.filter((o):o is CopyPermission=>o.kind==='epub-copy-permission-preview'&&o.owner===w.owner&&o.issuerId===w.owner&&unique(w,o.id,o.kind)===o&&o.exampleOnly===true):[];}
export function applyPrivateEpub(w:ProductWorld,op:string,d:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 if(!op.startsWith(prefix))return null;
 need(w.identity.signedIn&&(!ctx.personId||ctx.personId===w.owner)&&d.approved==='Yes'&&typeof d.requestKey==='string'&&d.requestKey.length>=8&&d.requestKey.length<=160,'Personally review your own exact private export action.');
 if(op==='epub.permission.grant'){
  const review=epubCopyPermissionReview(w,d.postId,d.recipientId,d.expiresAt,now);need(d.snapshot===review.snapshot,'The source, recipient or expiry changed. Review this exact permission again.');
  const prior=w.objects.filter(o=>o.kind==='epub-copy-permission-preview'&&o.owner===w.owner&&o.creationKey===d.requestKey);if(prior.length){need(prior.length===1&&prior[0].creationSnapshot===sha256Hex(review.snapshot),'This permission request already has different details.');return {objectId:prior[0].id,message:'Same exact author permission retained; no second grant.'};}
  const g:CopyPermission={id:localPreviewId(),owner:w.owner,kind:'epub-copy-permission-preview',version:1,issuerId:w.owner,recipientId:review.recipientId,postId:review.postId,sourceRevision:review.sourceRevision,state:'active',startsAt:now,expiresAt:review.expiresAt,format:'EPUB',scope:'text-body-copy-only',reviewProof:'',exampleOnly:true,creationKey:d.requestKey,creationSnapshot:sha256Hex(review.snapshot)};g.reviewProof=permissionProof(g);w.objects.push(g);return {objectId:g.id,message:'Exact local author-granted text-copy permission saved. Reading access and purchases remain separate; no file was sent.'};
 }
 if(op==='epub.permission.revoke'){const g=ownIssuedEpubPermissions(w).find(g=>g.id===ctx.objectId);need(g&&g.state==='active'&&d.version===String(g.version),'Open your current exact issued permission.');need(d.snapshot===JSON.stringify({id:g.id,version:g.version,state:g.state,reviewProof:g.reviewProof}),'Review this exact permission withdrawal.');g.state='revoked';g.version++;return {objectId:g.id,message:'Future source previews and exports using this grant stop. Files already downloaded cannot be recalled.'};}
 if(op==='epub.job.create'){
  let input:PrivateEpubDraft;try{input=JSON.parse(d.draft);}catch{throw Error('Review this complete private EPUB draft.');}const review=privateEpubDraftReview(w,d.taskId,input,now);need(d.snapshot===review.snapshot,'The selected sources, export rights or metadata changed. Review again.');
  const prior=w.objects.filter(o=>o.owner===w.owner&&o.kind==='private-epub-job-preview'&&o.creationKey===d.requestKey);if(prior.length){need(prior.length===1&&validJob(prior[0])&&prior[0].creationFingerprint===sha256Hex(review.snapshot),'This export request already belongs to another original.');return {objectId:prior[0].id,message:'Opening the same private EPUB job. No duplicate export.'};}
  const j:PrivateEpubJob={id:localPreviewId(),owner:w.owner,kind:'private-epub-job-preview',exampleOnly:true,version:1,taskId:d.taskId,taskFingerprint:review.taskFingerprint,creationKey:d.requestKey,creationFingerprint:sha256Hex(review.snapshot),draft:review.draft,state:'prepared',artifact:null,history:[],receipts:[]};j.history.push({version:1,state:j.state,at:now,action:'Personally reviewed source selection, chapter order and export rights',draft:structuredClone(j.draft),artifact:null});w.objects.push(j);return {objectId:j.id,message:'Private EPUB job prepared. No file or publication has been created yet.'};
 }
 const j=job(w,ctx.objectId||''),request=sha256Hex(JSON.stringify({op,version:d.version,snapshot:d.snapshot,draft:d.draft||'',outcome:d.outcome||''})),receipt=j.receipts.find(r=>r.key===d.requestKey);
 need(taskFingerprint(w,j.taskId)===j.taskFingerprint,'The original Chuck request changed. Earlier private export metadata is retained.');if(op!=='epub.job.edit')currentJob(w,j.id,now);if(receipt){need(receipt.request===request,'This request reference belongs to a different export action.');return {objectId:j.id,message:'Same private export action retained. No duplicate job or file generation.'};}
 need(d.version===String(j.version),'This private export job changed. Review its current version.');
 if(op==='epub.job.edit'){
  let input:PrivateEpubDraft;try{input=JSON.parse(d.draft);}catch{throw Error('Review the complete edited EPUB draft.');}const review=privateEpubDraftReview(w,j.taskId,input,now);need(d.snapshot===review.snapshot,'The edited source selection or metadata changed. Review again.');j.draft=review.draft;j.state='prepared';j.artifact=null;
 }else{
  need(d.snapshot===privateEpubActionSnapshot(w,j.id,op,now),'Review this exact current export operation.');
  if(op==='epub.job.generate'){
   const result=createPrivateEpub({id:j.id,title:j.draft.title,creator:j.draft.creator,language:j.draft.language,modifiedAt:now,chapters:privateEpubPreview(w,j.id,now),resources:currentResources(w,j)});j.artifact={sha256:result.sha256,size:result.size,files:result.files,generatedAt:now,draftFingerprint:sha256Hex(JSON.stringify(j.draft))};j.state='ready';
  }else if(op==='epub.job.scenario'){need(d.scenario==='explicit-local-example'&&['unknown','failed'].includes(d.outcome),'Choose an explicit interrupted or failed local generation example.');j.state=d.outcome as 'unknown'|'failed';j.artifact=null;}else throw Error('Choose a supported private EPUB action.');
 }
 j.version++;j.history.push({version:j.version,state:j.state,at:now,action:op,draft:structuredClone(j.draft),artifact:j.artifact?structuredClone(j.artifact):null});j.receipts.push({key:d.requestKey,request});
 return {objectId:j.id,message:j.state==='ready'?'Real EPUB bytes with selected permitted resources generated with a local ZIP/manifest receipt. Reopen and download checks current source rights again; no external EPUBCheck service was run.':j.state==='prepared'?'Edited original export job is ready for fresh generation. Earlier history is retained.':'Local generation outcome retained on the same job. No successful downloadable file is claimed.'};
}
