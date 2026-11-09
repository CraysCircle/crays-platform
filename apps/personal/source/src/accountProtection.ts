import {ownPrivateAccount} from './ownPrivateAccount';
import type {ProductWorld,ActionContext} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';

const safeSourceId=(id:unknown):id is string=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,180}$/.test(id)&&!/^nsec1/i.test(id);
const safePublicIdentity=(value:unknown):value is string=>typeof value==='string'&&!!value.trim()&&value.length<=300&&!/nsec1|-----BEGIN.*PRIVATE KEY/i.test(value);
export function securityPauseSnapshot(w:ProductWorld){
 if(!ownPrivateAccount(w))throw Error('Sign in to review your own account protection.');
 return JSON.stringify({owner:w.owner,signer:w.identity.signer,active:w.objects.filter(o=>o.owner===w.owner&&o.kind==='delegation'&&o.status==='active').map(o=>JSON.stringify(o)).sort()});
}
export function socialPreviewExport(w:ProductWorld,selected:string[]){
 if(!ownPrivateAccount(w))throw new Error('Sign in to export your own permitted social data.');
 if(!selected.length||new Set(selected).size!==selected.length||selected.some(k=>!['identity','posts','relationships'].includes(k)))throw new Error('Choose the social data you want to include.');
 if(selected.includes('identity')&&!safePublicIdentity(w.identity.publicId))throw Error('Review your public identity at its original source before exporting.');
 const ownPosts=(selected.includes('posts')?w.posts:[]).filter(p=>p.author===w.owner&&safeSourceId(p.id)&&w.posts.filter(x=>x.id===p.id).length===1).map(p=>{
  const fields=['title','text','fullText','type','audience','status'] as const;
  if(fields.some(key=>p[key]!==undefined&&typeof p[key]!=='string'))throw Error('An authored post needs a source review before export.');
  return {id:p.id,author:p.author,...Object.fromEntries(fields.filter(key=>typeof p[key]==='string').map(key=>[key,p[key]]))};
 });
 const relationshipChoices=(selected.includes('relationships')?w.people:[]).filter(p=>safeSourceId(p.id)&&w.people.filter(x=>x.id===p.id).length===1&&[p.contact,p.following,p.blocked].some(v=>v===true)).map(p=>({personId:p.id,...Object.fromEntries((['contact','following','blocked'] as const).filter(key=>typeof p[key]==='boolean').map(key=>[key,p[key]]))}));
 return {format:'crays.social-preview.v1',owner:w.owner,fictional:true,scope:[...selected],
  ...(selected.includes('identity')?{identity:{publicId:w.identity.publicId}}:{}),
  ...(selected.includes('posts')?{ownPosts}:{}),
  ...(selected.includes('relationships')?{relationshipChoices}:{}),
  limits:['Local preview data only; not a complete production export or signed Nostr archive.','No private keys, authentication codes, private messages, other people’s profile fields, hidden affiliations, media files, wallet balances or licence transfer.','This file does not change relays or delete public copies.']};
}


export const ownExportScopes=['profile','preferences','memory','purchase-rights'] as const;
export type OwnExportScope=typeof ownExportScopes[number];
export type OwnExportManifest={format:'crays.own-data-manifest.v1';owner:string;fictional:true;manifestOnly:true;scope:OwnExportScope[];sources:{id:string;label:string;status:'included-metadata'|'empty'|'unavailable'|'excluded';records:{id:string;kind:string;status:string;version?:number}[];availableFields?:string[];note:string}[];limits:string[]};
/** A reviewed inventory, not an archive engine: never serialise arbitrary objects or protected content. */
export function ownExportManifest(w:ProductWorld,selected:string[]):OwnExportManifest{
 if(!ownPrivateAccount(w))throw Error('Sign in to review your own data export.');
 if(!selected.length||new Set(selected).size!==selected.length||selected.some(s=>!ownExportScopes.includes(s as OwnExportScope)))throw Error('Choose the own data categories to review.');
 const unique=w.objects.filter(o=>o.owner===w.owner&&w.objects.filter(x=>x.id===o.id).length===1);
 const safeId=(id:unknown)=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,180}$/.test(id)&&!/^nsec1/i.test(id);
 const safeStatus=(status:unknown)=>typeof status==='string'&&['private','confirmed','valid','revoked','expired','pending','unknown','prepared','submitted','processing','failed','cancelled','cancelled-demo','confirmed-demo','refunded','refunded-demo','missing','unavailable','invalid'].includes(status)?status:'Needs source review';
 const refs=(kinds:string[])=>unique.filter(o=>kinds.includes(String(o.kind))&&safeId(o.id)).map(o=>({id:o.id,kind:String(o.kind),status:safeStatus(o.status),...(Number.isSafeInteger(o.version)&&Number(o.version)>0?{version:Number(o.version)}:{})}));
 const sources:OwnExportManifest['sources']=[];
 for(const id of ownExportScopes.filter(id=>selected.includes(id))){
  if(id==='profile'){
   const profile=w.profiles[w.owner],availableFields=profile?['name','username','bio','description','city'].filter(k=>typeof profile[k]==='string'&&Boolean(profile[k].trim())):[];
   sources.push({id,label:'Own profile',status:profile?'included-metadata':'unavailable',records:[],availableFields,note:'Field inventory only. No field values, private contact details, keys or sign-in information are in this manifest.'});
  }else if(id==='preferences'){
   const records=refs(['private-matching-preference']).filter(r=>r.status==='private');sources.push({id,label:'Private preferences',status:records.length?'included-metadata':'empty',records,note:'Own saved source references only. Preference text, Dating details and matching-use permissions are excluded; this grants no matching or sharing access.'});
  }else if(id==='memory'){
   const records=refs(['memory']).filter(r=>r.status==='confirmed');sources.push({id,label:'Confirmed memories',status:records.length?'included-metadata':'empty',records,note:'Own confirmed memory references only. Fact text, relationship details and source documents are excluded. Forgotten or unconfirmed memories are not reconstructed.'});
  }else{
   const records=refs(['license']);
   for(const p of w.payments.filter(p=>p.owner===w.owner&&w.payments.filter(x=>x.id===p.id).length===1&&safeId(p.id)))records.push({id:p.id,kind:'payment',status:safeStatus(p.status)});
   sources.push({id,label:'Purchases & licence evidence',status:records.length?'included-metadata':'empty',records,note:'Own original evidence references and recorded status only. Payment is not a licence; this does not transfer assets, certify rights or include protected media.'});
  }
 }
 sources.push({id:'provider-archives',label:'Provider archives',status:'unavailable',records:[],note:'Live provider exports, signed Nostr archives, complete account data and provider retention decisions are not connected in this clickdummy.'},{id:'protected-data',label:'Excluded private sources',status:'excluded',records:[],note:'Private keys, sign-in secrets, other people’s records, private messages, health values, revoked source content and media files are not included.'});
 return {format:'crays.own-data-manifest.v1',owner:w.owner,fictional:true,manifestOnly:true,scope:ownExportScopes.filter(s=>selected.includes(s)),sources,limits:['This file is a local export manifest, not the actual content archive or a full production export.','Only named own source references and field inventories are included; inaccessible or conflicting records are not copied.','A download neither grants access nor deletes, migrates, restores or shares any source. No import into another service is guaranteed.','Keep original purchase evidence separately. Licence metadata is not a transferable media right; public Nostr copies cannot be globally erased.']};
}
export type PortabilityDownload=ReturnType<typeof socialPreviewExport>|OwnExportManifest;

export function applyAccountProtection(w:ProductWorld,op:string,data:Record<string,string>,ctx:Partial<ActionContext>,now=Date.now()):{objectId:string;message:string}|null{
 if(!['security.pause','security.report','social.migration.prepare'].includes(op))return null;
 if(!ownPrivateAccount(w)||(ctx.personId&&ctx.personId!==w.owner))throw new Error('Sign in to manage your own account protection.');
 if(!Number.isFinite(now))throw new Error('Check the current time before recording this action.');
 if(op==='social.migration.prepare'){
  let target:URL;try{target=new URL(data.destination);}catch{throw new Error('Enter a valid wss:// relay address for this review.');}
  if(target.protocol!=='wss:'||!target.hostname||target.username||target.password||target.hash||!data.requestId?.trim()||data.requestId!==data.requestId.trim()||data.requestId.length>120)throw new Error('Use a wss:// relay address without credentials or a fragment.');
  if(data.confirmed!=='Yes')throw new Error('Review the target and migration limits before saving.');
  const destination=target.href,matches=w.objects.filter(o=>o.owner===w.owner&&o.kind==='relay-migration'&&o.requestId===data.requestId);
  if(matches.length>1||matches.some(o=>!safeSourceId(o.id)||w.objects.filter(x=>x.id===o.id).length!==1))throw Error('Conflicting relay review originals need source review.');
  const old=matches[0];
  if(old){if(old.to!==destination)throw new Error('This migration review already has a different destination. Open its original.');return {objectId:old.id,message:'The same migration review is already prepared. No relay connection changed.'};}
  const id=localPreviewId();w.objects.unshift({id,owner:w.owner,kind:'relay-migration',name:'Relay migration review',from:[...w.identity.relaySelection],to:destination,requestId:data.requestId,state:'prepared',status:'prepared-not-connected',signature:'not-performed',fictional:true,createdAt:now});
  return {objectId:id,message:'Migration review prepared locally. No connection, signature, content transfer or deletion was performed.'};
 }
 if(op==='security.pause'){
  if(data.confirmed!=='Yes')throw new Error('Review and confirm this preview pause first.');
  if(data.reviewedSnapshot!==undefined&&data.reviewedSnapshot!==securityPauseSnapshot(w))throw Error('Your signing or active delegations changed. Cancel and review again.');
  const active=w.objects.filter(o=>o.owner===w.owner&&o.kind==='delegation'&&o.status==='active');
  const changed=w.identity.signer!=='revoked'||active.length>0;
  if(!changed)return {objectId:'',message:'Sensitive preview actions are already paused. No other access was changed.'};
  const before=w.identity.signer;w.identity.signer='revoked';
  for(const o of active){o.status='paused-by-security';o.securityPausedAt=now;o.securityPreviousStatus='active';}
  const id=localPreviewId();w.objects.unshift({id,owner:w.owner,kind:'security-pause-preview',name:'Sensitive actions paused',status:'applied-locally',fictional:true,at:now,previousSigner:before,delegationIds:[...new Set(active.map(o=>o.id).filter(safeSourceId))],ambiguousDelegationRecords:active.filter(o=>!safeSourceId(o.id)||w.objects.filter(x=>x.id===o.id).length!==1).length});
  return {objectId:id,message:'Own preview signing and active delegations paused. Separate apps, device sessions and existing transactions were not revoked, cancelled or refunded.'};
 }
 const text=(data.text||'').trim(),requestId=(data.requestId||'').trim();
 if(!text||text.length>2000||!requestId||requestId.length>120)throw new Error('Describe what happened, then save this sample review request.');
 const matches=w.objects.filter(o=>o.owner===w.owner&&o.kind==='security-report'&&o.requestId===requestId);
 if(matches.length>1||matches.some(o=>!safeSourceId(o.id)||w.objects.filter(x=>x.id===o.id).length!==1))throw Error('Conflicting saved report originals need source review.');
 const old=matches[0];
 if(old){if(old.text!==text)throw new Error('This request was already saved with different details. Open its original record.');return {objectId:old.id,message:'This same sample review request is already saved. Access remains unchanged.'};}
 const id=localPreviewId();w.objects.unshift({id,owner:w.owner,kind:'security-report',name:'Possible false alarm',text,requestId,status:'prepared-not-submitted',fictional:true,createdAt:now});
 return {objectId:id,message:'Sample review request saved here; no support message was sent. Signing and permissions remain unchanged.'};
}
