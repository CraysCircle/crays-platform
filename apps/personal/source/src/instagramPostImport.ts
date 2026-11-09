import type {Entity,Post,ProductWorld} from './productModel.ts';
import type {PublishingMedia} from './publishing.ts';
import {localPreviewId} from './localPreviewId.ts';

/** Local AL-201 demonstration only. These scopes are not Meta OAuth scope names. */
export const instagramImportScopes=['own-posts-read','import-posts-as-drafts'] as const;
export type InstagramImportAccess={ready:boolean;reason:string;snapshot:string;connectionId:string;account:string};
export type InstagramImportRule=Entity&{kind:'instagram-import-rule-preview';connectionId:string;account:string;accessSnapshot:string;revision:number;status:'active'|'paused';destination:'private-publishing-drafts';liveExecution:false};
export type InstagramImportAttempt=Entity&{kind:'instagram-import-attempt-preview';ruleId:string;ruleRevision:number;connectionId:string;account:string;accessSnapshot:string;status:'unknown'|'completed-example'|'failed';attemptId:string;createdAt:number;liveExecution:false;draftId?:string;eventSnapshot?:string;error?:string};
export type InstagramPostExample={source:'explicit-fictional-instagram-post';connectionId:string;account:string;authorAccount:string;externalPostId:string;permalink:string;caption:string;createdAt:number;format:'Post'|'Reel';media:PublishingMedia[]};
export type InstagramImportProvenance={source:'instagram-import-provenance-preview-v1';owner:string;connectionId:string;account:string;externalPostId:string;eventSnapshot:string;accessSnapshot:string;attemptId:string;ruleId:string;importedAt:number;liveExecution:false};
const serial=(v:unknown)=>JSON.stringify(v);
function need(v:unknown,message:string):asserts v{if(!v)throw Error(message);}
function unique(w:ProductWorld,id:string){const rows=w.objects.filter(o=>o.id===id);return rows.length===1?rows[0]:undefined;}
function ownSession(w:ProductWorld){need(w.identity.signedIn,'Sign in to review your own Instagram import.');}
function word(v:unknown,max=200):v is string{return typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=max&&!/^(nsec1|xprv|tprv)/i.test(v);}
export function instagramImportAccess(w:ProductWorld,connectionId:string):InstagramImportAccess{
 const blocked=(reason:string):InstagramImportAccess=>({ready:false,reason,snapshot:'',connectionId,account:''});
 if(!w.identity.signedIn)return blocked('Sign in to your own account.');
 const c=unique(w,connectionId);
 if(!c||c.kind!=='app-connection'||c.owner!==w.owner||c.providerId!=='instagram'||w.objects.filter(o=>o.kind==='app-connection'&&o.owner===w.owner&&o.providerId==='instagram').length!==1)return blocked('Choose your own unique Instagram connection.');
 if(c.status!=='connected-demo'||c.realConnection!==false||!word(c.account)||!Number.isSafeInteger(c.version)||Number(c.version)<1||!Number.isSafeInteger(c.approvedAt)||Number(c.approvedAt)<=0)return blocked('Review the exact current preview account and connection version.');
 const scopes=c.scopes;
 if(!Array.isArray(scopes)||new Set(scopes).size!==scopes.length||!instagramImportScopes.every(s=>scopes.includes(s)))return blocked('Own-post reading and import-as-drafts require separate permissions. Conversation read is insufficient.');
 const snapshot=serial({owner:w.owner,id:c.id,providerId:c.providerId,account:c.account,version:c.version,approvedAt:c.approvedAt,scopes:[...scopes].sort(),realConnection:false});
 return {ready:true,reason:'Local account permission example only; no Meta account ownership or API access is verified.',snapshot,connectionId:c.id,account:String(c.account)};
}
export function instagramImportRules(w:ProductWorld):InstagramImportRule[]{
 if(!w.identity.signedIn)return [];
 return w.objects.filter(o=>o.kind==='instagram-import-rule-preview'&&o.owner===w.owner&&unique(w,o.id)===o&&word(o.connectionId)&&word(o.account)&&Number.isSafeInteger(o.revision)&&Number(o.revision)>0&&['active','paused'].includes(String(o.status))&&o.destination==='private-publishing-drafts'&&o.liveExecution===false&&typeof o.accessSnapshot==='string') as InstagramImportRule[];
}
function rule(w:ProductWorld,id:string){const rows=instagramImportRules(w).filter(r=>r.id===id);need(rows.length===1,'Choose your own original Instagram import rule.');const r=rows[0];need(w.objects.filter(o=>o.kind===r.kind&&o.owner===w.owner&&o.connectionId===r.connectionId).length===1,'Conflicting Instagram rules need review.');return r;}
export function instagramImportRuleReview(access:InstagramImportAccess){need(access.ready,'Review current own-post import permissions first.');return serial({source:'instagram-rule-review-v1',accessSnapshot:access.snapshot,destination:'private-publishing-drafts',automaticPublication:false,liveExecution:false});}
export function configureInstagramImport(w:ProductWorld,connectionId:string,exactReview:string,personallyApproved:boolean){
 ownSession(w);const access=instagramImportAccess(w,connectionId);need(access.ready,access.reason);need(personallyApproved===true&&exactReview===instagramImportRuleReview(access),'Approve the exact import rule separately from account connection.');
 const next=structuredClone(w),matches=next.objects.filter(o=>o.kind==='instagram-import-rule-preview'&&o.owner===w.owner&&o.connectionId===connectionId);need(matches.length<=1,'Conflicting Instagram import rules need review.');
 if(matches.length){const old=rule(next,matches[0].id);need(!next.objects.some(o=>o.kind==='instagram-import-attempt-preview'&&o.owner===w.owner&&o.ruleId===old.id&&o.status==='unknown'),'Check the original unknown sync before changing its rule.');if(old.status==='active'&&old.accessSnapshot===access.snapshot)return next;Object.assign(old,{account:access.account,accessSnapshot:access.snapshot,revision:old.revision+1,status:'active'});}
 else next.objects.push({id:localPreviewId(),owner:w.owner,kind:'instagram-import-rule-preview',connectionId,account:access.account,accessSnapshot:access.snapshot,revision:1,status:'active',destination:'private-publishing-drafts',liveExecution:false});
 return next;
}
export function pauseInstagramImport(w:ProductWorld,ruleId:string){ownSession(w);const next=structuredClone(w);rule(next,ruleId).status='paused';return next;}
function currentAccess(w:ProductWorld,r:InstagramImportRule){const a=instagramImportAccess(w,r.connectionId);need(r.status==='active'&&a.ready&&a.snapshot===r.accessSnapshot&&a.account===r.account,'Import stopped: connection, account, permission or rule changed. Retained drafts are unchanged.');return a;}
export function startInstagramImportExample(w:ProductWorld,ruleId:string,exactAccessSnapshot:string,personallyApproved:boolean){
 ownSession(w);const r=rule(w,ruleId),a=currentAccess(w,r);need(personallyApproved===true&&exactAccessSnapshot===a.snapshot,'Review this exact source account before pulling the fictional post example.');
 const previous=w.objects.filter(o=>o.kind==='instagram-import-attempt-preview'&&o.owner===w.owner&&o.ruleId===r.id&&o.status==='unknown');need(!previous.length,'Check the same unknown sync; do not start another pull.');
 const next=structuredClone(w),id=localPreviewId();next.objects.push({id,owner:w.owner,kind:'instagram-import-attempt-preview',ruleId:r.id,ruleRevision:r.revision,connectionId:r.connectionId,account:r.account,accessSnapshot:a.snapshot,status:'unknown',attemptId:localPreviewId(),createdAt:Date.now(),liveExecution:false});return next;
}
function originalAttempt(w:ProductWorld,id:string,attemptId:string){const a=unique(w,id) as InstagramImportAttempt|undefined;need(a?.kind==='instagram-import-attempt-preview'&&a.owner===w.owner&&a.liveExecution===false&&word(a.ruleId)&&word(a.connectionId)&&word(a.account)&&Number.isSafeInteger(a.ruleRevision)&&a.ruleRevision>0&&Number.isSafeInteger(a.createdAt)&&a.createdAt>0&&typeof a.accessSnapshot==='string'&&!!a.accessSnapshot&&word(a.attemptId)&&a.attemptId===attemptId&&w.objects.filter(o=>o.kind==='instagram-import-attempt-preview'&&o.attemptId===a.attemptId).length===1&&['unknown','failed','completed-example'].includes(a.status),'Choose your own exact original sync attempt.');return a;}
function validateEvent(e:InstagramPostExample,a:InstagramImportAttempt){
 need(e?.source==='explicit-fictional-instagram-post'&&e.connectionId===a.connectionId&&e.account===a.account&&e.authorAccount===a.account&&word(e.externalPostId)&&typeof e.caption==='string'&&e.caption.length<=10000&&Number.isSafeInteger(e.createdAt)&&e.createdAt>0&&['Post','Reel'].includes(e.format),'Review one fictional post authored by the exact connected account.');
 let url:URL;try{url=new URL(e.permalink);}catch{throw Error('Use an Instagram post permalink, not a download or arbitrary URL.');}
 need(url.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(url.hostname)&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&/^\/(p|reel)\/[A-Za-z0-9_-]+\/$/.test(url.pathname),'Use an Instagram post permalink, not a download or arbitrary URL.');
 need(Array.isArray(e.media)&&e.media.length<=10&&new Set(e.media.map(m=>m.id)).size===e.media.length&&new Set(e.media.map(m=>m.url)).size===e.media.length,'Review up to ten distinct local preview media.');
 for(const m of e.media)need(word(m.id)&&word(m.name)&&word(m.alt,1000)&&m.state==='local'&&['image','video'].includes(m.kind)&&(m.kind==='image'?/^\/assets\/crays\/[\w-]+\.(png|jpe?g|webp)$/i:/^\/assets\/crays\/[\w-]+\.mp4$/i).test(m.url),'Only local fictional preview media is accepted; no external original is fetched.');
 need(e.caption.trim()||e.media.length,'An empty source post cannot create a draft.');need(e.format!=='Reel'||e.media.some(m=>m.kind==='video'),'A Reel example requires local video.');
}
function importedRows(w:ProductWorld,a:InstagramImportAttempt,externalPostId:string){return w.objects.filter(o=>o.kind==='instagram-import-provenance-preview'&&o.owner===w.owner&&o.connectionId===a.connectionId&&o.account===a.account&&o.externalPostId===externalPostId);}
export function reconcileInstagramImportExample(w:ProductWorld,id:string,attemptId:string,outcome:'unknown'|'failed'|'completed-example',event?:InstagramPostExample){
 ownSession(w);const original=originalAttempt(w,id,attemptId);need(['unknown','failed','completed-example'].includes(outcome),'Choose a supported sync outcome.');
 if(original.status!=='unknown'){need(original.status===outcome&&(!event||original.eventSnapshot===serial(event)),'Keep the terminal original outcome; do not replay changed source content.');return structuredClone(w);}
 if(outcome==='unknown')return structuredClone(w);
 const next=structuredClone(w),a=originalAttempt(next,id,attemptId);
 if(outcome==='failed'){a.status='failed';a.error='Fictional source sync failed. Review and resume its rule before a new pull. No draft, signature or publication was created.';const originalRule=unique(next,a.ruleId);if(originalRule?.kind==='instagram-import-rule-preview'&&originalRule.owner===w.owner)originalRule.status='paused';return next;}
 const r=rule(next,a.ruleId);currentAccess(next,r);need(r.revision===a.ruleRevision&&r.accessSnapshot===a.accessSnapshot&&r.account===a.account,'Review a new rule after reconciling this original sync; its source authorization changed.');need(event,'Choose the explicit fictional source post.');validateEvent(event,a);
 const eventSnapshot=serial(event),previous=importedRows(next,a,event.externalPostId);need(previous.length<=1,'Conflicting original import provenance needs review.');
 if(previous.length){const p=previous[0],posts=next.posts.filter(post=>post.id===p.postId);need(unique(next,p.id)===p&&p.source==='instagram-import-provenance-preview-v1'&&p.liveExecution===false&&posts.length===1&&posts[0].author===w.owner&&posts[0].publishing?.owner===w.owner&&p.eventSnapshot===eventSnapshot,'This post was already imported with different or missing original evidence. Keep its draft instead of importing again.');a.status='completed-example';a.draftId=posts[0].id;a.eventSnapshot=eventSnapshot;return next;}
 const postId=localPreviewId(),post:Post={id:postId,author:w.owner,title:event.caption.trim().slice(0,64)||'Imported Instagram draft',text:event.caption,type:event.media.some(m=>m.kind==='video')?'video':event.media.length?'image':'note',audience:'Public',status:'draft',liked:false,saved:false,reposted:false,protected:false,license:false,mediaAvailable:true,createdAt:Date.now(),replies:[],readPosition:0,publishing:{owner:w.owner,publisherId:w.owner,targetIds:[],revision:1,media:structuredClone(event.media),mediaRights:false,venueTag:'',format:event.format}};
 const provenance:InstagramImportProvenance={source:'instagram-import-provenance-preview-v1',owner:w.owner,connectionId:a.connectionId,account:a.account,externalPostId:event.externalPostId,eventSnapshot,accessSnapshot:a.accessSnapshot,attemptId:a.attemptId,ruleId:r.id,importedAt:Date.now(),liveExecution:false};
 next.posts.unshift(post);next.objects.push({id:localPreviewId(),kind:'instagram-import-provenance-preview',postId,...provenance});a.status='completed-example';a.draftId=postId;a.eventSnapshot=eventSnapshot;return next;
}
