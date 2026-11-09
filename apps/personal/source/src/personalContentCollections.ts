import {mayRead,type ActionContext,type Entity,type Post,type ProductWorld} from './productModel.ts';
import {canReadPaidOriginal} from './paidContentAccess.ts';
import {localPreviewId} from './localPreviewId.ts';

export type PersonalContentRef={itemId:string;postId:string;addedAt:number};
type CollectionEvent={version:number;name:string;state:'active'|'archived';items:PersonalContentRef[];action:string;at:number};
type Receipt={key:string;request:string;version:number;message:string};
export type PersonalContentCollection=Entity&{kind:'personal-content-collection-preview';exampleOnly:true;version:number;name:string;state:'active'|'archived';creationKey:string;items:PersonalContentRef[];history:CollectionEvent[];receipts:Receipt[]};
export type CollectionPostSummary={postId:string;title:string;type:Post['type'];access:'Original available'|'Rights retained · media unavailable'|'Reference retained · media unavailable';protected:boolean;sourceSnapshot:string};
export type CollectionItemProjection={itemId:string;postId:string;addedAt:number;status:'available';post:CollectionPostSummary}|{itemId:string;postId:string;addedAt:number;status:'unavailable'};
const prefix='library.collection.';
const ops=['create','rename','add','remove','archive','restore'];
const unique=(w:ProductWorld,id:string)=>w.objects.filter(o=>o.id===id).length===1;
function name(value:string){if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw Error('Name this personal collection using 1–80 characters.');return value.trim();}
function refsValid(items:PersonalContentRef[]){return Array.isArray(items)&&items.length<=500&&new Set(items.map(i=>i?.itemId)).size===items.length&&new Set(items.map(i=>i?.postId)).size===items.length&&items.every(i=>i&&typeof i.itemId==='string'&&!!i.itemId&&typeof i.postId==='string'&&!!i.postId&&Number.isFinite(i.addedAt)&&Object.keys(i).every(k=>['itemId','postId','addedAt'].includes(k)));}
function valid(o:Entity){try{const c=o as PersonalContentCollection;return c.kind==='personal-content-collection-preview'&&c.exampleOnly===true&&Number.isSafeInteger(c.version)&&c.version>0&&name(c.name)===c.name&&['active','archived'].includes(c.state)&&typeof c.creationKey==='string'&&c.creationKey.length>=8&&refsValid(c.items)&&Array.isArray(c.history)&&c.history.length===c.version&&c.history.every((h,i)=>h.version===i+1&&name(h.name)===h.name&&['active','archived'].includes(h.state)&&refsValid(h.items)&&Number.isFinite(h.at)&&typeof h.action==='string')&&JSON.stringify(c.history.at(-1)?.items)===JSON.stringify(c.items)&&c.history.at(-1)?.name===c.name&&c.history.at(-1)?.state===c.state&&Array.isArray(c.receipts)&&c.receipts.every(r=>typeof r.key==='string'&&r.key.length>=8&&typeof r.request==='string'&&Number.isSafeInteger(r.version)&&r.version<=c.version&&typeof r.message==='string')&&new Set(c.receipts.map(r=>r.key)).size===c.receipts.length;}catch{return false;}}
export function ownPersonalContentCollections(w:ProductWorld):PersonalContentCollection[]{return w.identity.signedIn?w.objects.filter((o):o is PersonalContentCollection=>o.owner===w.owner&&unique(w,o.id)&&valid(o)):[];}
function collection(w:ProductWorld,id:string){const c=ownPersonalContentCollections(w).find(c=>c.id===id);if(!c)throw Error('Open your own unambiguous personal collection.');return c;}

/** No cached title/text/URL fallback. This selector is stricter than public teaser visibility. */
export function personalCollectionPost(w:ProductWorld,postId:string):CollectionPostSummary|undefined {
 if(!w.identity.signedIn)return;
 const rows=w.posts.filter(p=>p.id===postId),p=rows[0];
 if(rows.length!==1||!p||p.archived===true||typeof p.title!=='string'||typeof p.text!=='string'||!['accepted','partial',...(p.author===w.owner?['draft','scheduled','signed','submitted','unknown','failed']:[])].includes(p.status))return;
 const authors=w.people.filter(person=>person.id===p.author);
 if(authors.length>1||authors.some(person=>person.blocked||person.blockedByOther)||!mayRead(w,p)||!canReadPaidOriginal(w,p))return;
 const summary={postId:p.id,title:p.title,type:p.type,access:p.mediaAvailable===true?'Original available' as const:p.protected?'Rights retained · media unavailable' as const:'Reference retained · media unavailable' as const,protected:p.protected};
 // Ephemeral review only. Collection originals and command receipts never retain this source title.
 const sourceSnapshot=JSON.stringify({owner:w.owner,...summary,author:p.author,status:p.status,audience:p.audience,venueId:p.venueId||'',groupId:p.groupId||'',publishingRevision:p.publishing?.revision??null});
 return {...summary,sourceSnapshot};
}
export function personalCollectionItems(w:ProductWorld,id:string,query=''):CollectionItemProjection[] {
 let c:PersonalContentCollection;try{c=collection(w,id);}catch{return [];}
 const q=typeof query==='string'?query.trim().toLowerCase():'';
 return c.items.flatMap((ref):CollectionItemProjection[]=>{const post=personalCollectionPost(w,ref.postId);return post?(!q||post.title.toLowerCase().includes(q)?[{...ref,status:'available',post}]:[]):q?[]:[{...ref,status:'unavailable'}];});
}
export function personalCollectionCandidates(w:ProductWorld,query=''):CollectionPostSummary[]{
 if(!w.identity.signedIn)return [];const q=query.trim().toLowerCase();
 return w.posts.filter(p=>p.saved===true||p.author===w.owner||p.license===true).flatMap(p=>{const post=personalCollectionPost(w,p.id);return post&&(!q||post.title.toLowerCase().includes(q))?[post]:[];});
}
export function personalCollectionOpen(w:ProductWorld,id:string,itemId:string):string {
 const c=collection(w,id),matches=c.items.filter(i=>i.itemId===itemId);if(matches.length!==1||!personalCollectionPost(w,matches[0].postId))throw Error('This original is unavailable with current access. Its opaque reference is retained.');return matches[0].postId;
}
export function personalCollectionReview(w:ProductWorld,operation:string,data:Record<string,string>,id=''):string {
 if(!w.identity.signedIn)throw Error('Sign in to your own personal library.');
 const op=operation.startsWith(prefix)?operation.slice(prefix.length):operation;if(!ops.includes(op))throw Error('Choose a supported collection action.');
 if(op==='create')return JSON.stringify({owner:w.owner,op,name:name(data.name)});
 const c=collection(w,id);if(String(c.version)!==data.version)throw Error('This personal collection changed. Review its current version.');
 if(op==='restore'?c.state!=='archived':c.state!=='active')throw Error('Restore this archived collection before editing it.');
 const payload:Record<string,unknown>={owner:w.owner,op,id:c.id,version:c.version};
 if(op==='rename')payload.name=name(data.name);
 if(op==='add'){
  if(c.items.length>=500)throw Error('This example collection holds at most 500 references.');
  if(c.items.some(i=>i.postId===data.postId))throw Error('This exact original is already in this collection.');
  const post=personalCollectionPost(w,data.postId);if(!post)throw Error('Choose a currently available original from your own library.');payload.postId=post.postId;payload.sourceSnapshot=post.sourceSnapshot;
 }
 if(op==='remove'){const refs=c.items.filter(i=>i.itemId===data.itemId);if(refs.length!==1)throw Error('Choose this exact retained reference.');payload.itemId=refs[0].itemId;payload.postId=refs[0].postId;}
 return JSON.stringify(payload);
}
export function applyPersonalContentCollections(w:ProductWorld,operation:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 if(!operation.startsWith(prefix))return null;
 if(!w.identity.signedIn||ctx.personId&&ctx.personId!==w.owner)throw Error('Sign in to your own personal collections.');
 if(data.approved!=='Yes'||typeof data.requestKey!=='string'||data.requestKey.length<8||data.requestKey.length>160)throw Error('Review this exact collection action and keep its original request reference.');
 const op=operation.slice(prefix.length),id=ctx.objectId||'';
 if(!ops.includes(op))throw Error('Choose a supported personal collection action.');
 // Retain only opaque command references and the user's own chosen collection name, never a source title or URL.
 const request=JSON.stringify({op,id,version:data.version||'',postId:op==='add'?data.postId||'':'',itemId:op==='remove'?data.itemId||'':'',name:['create','rename'].includes(op)?name(data.name):''});
 const raw=w.objects.filter(o=>o.owner===w.owner&&o.kind==='personal-content-collection-preview');
 const receipts=ownPersonalContentCollections(w).flatMap(c=>c.receipts.filter(r=>r.key===data.requestKey).map(r=>({c,r})));
 if(raw.some(o=>!valid(o)&&((o as PersonalContentCollection).receipts||[]).some(r=>r.key===data.requestKey)))throw Error('This original collection request needs review.');
 if(receipts.length){if(receipts.length!==1||receipts[0].r.request!==request)throw Error('This request reference belongs to another collection action.');return {objectId:receipts[0].c.id,message:receipts[0].r.message};}
 const snapshot=personalCollectionReview(w,op,data,id);if(snapshot!==data.snapshot)throw Error('The collection, selected source or access changed. Review again.');
 let c:PersonalContentCollection,message='';
 if(op==='create'){
  if(raw.some(o=>o.creationKey===data.requestKey))throw Error('Keep the existing original collection instead of creating another.');
  c={id:localPreviewId(),owner:w.owner,kind:'personal-content-collection-preview',exampleOnly:true,version:1,name:name(data.name),state:'active',creationKey:data.requestKey,items:[],history:[],receipts:[]};
  if(w.objects.some(o=>o.id===c.id))throw Error('This original reference conflicts. Try a new explicit collection request.');w.objects.push(c);message='Your personal collection was created. No bookmark, post, payment or content right changed.';
 }else{
  c=collection(w,id);c.version++;
  if(op==='rename'){c.name=name(data.name);message='Collection renamed. Original content and bookmarks are unchanged.';}
  if(op==='add'){c.items.push({itemId:localPreviewId(),postId:data.postId,addedAt:now});message='Exact original reference added. This does not copy its file, grant rights or change bookmarks.';}
  if(op==='remove'){c.items=c.items.filter(i=>i.itemId!==data.itemId);message='Reference removed from this collection only. The original content, purchases and bookmarks remain.';}
  if(op==='archive'){c.state='archived';message='Collection archived. Its exact references and history are retained.';}
  if(op==='restore'){c.state='active';message='The same collection was restored. Every original still needs current access.';}
 }
 c.history.push({version:c.version,name:c.name,state:c.state,items:structuredClone(c.items),action:op,at:now});c.receipts.push({key:data.requestKey,request,version:c.version,message});return {objectId:c.id,message};
}
