/** Admission only; keep an unusable saved original untouched instead of resetting it. */
export type PreviewAdmission<T>={kind:'ready';state:T;source:'new'|'saved'}|{kind:'held';reason:'storage-unavailable'|'invalid-saved-data'|'preparation-failed'};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function savedPreviewShape(value:unknown){
 if(!record(value)||value.version!==1||!record(value.chats)||!record(value.drafts)||!Array.isArray(value.tasks)||!record(value.world))return false;
 const w=value.world;
 if(w.version!==2||typeof w.owner!=='string'||!w.owner.trim()||w.owner!==w.owner.trim()||!record(w.identity)||typeof w.identity.signedIn!=='boolean'||!record(w.profiles)||!Object.hasOwn(w.profiles,w.owner)||!record(w.profiles[w.owner]))return false;
 if(Object.values(w.profiles).some(p=>!record(p)||Object.values(p).some(v=>typeof v!=='string')))return false;
 if(!['people','venues','posts','wallets','payments','objects'].every(key=>Array.isArray(w[key])&&(w[key] as unknown[]).every(record))||!record(w.drafts)||!record(w.settings))return false;
 return true;
}
export function admitSavedPreview<T>(raw:string|null,fresh:()=>T,prepare:(value:unknown)=>T):PreviewAdmission<T>{
 let parsed:unknown;
 try{parsed=raw===null?fresh():JSON.parse(raw);}catch{return {kind:'held',reason:'invalid-saved-data'};}
 if(!savedPreviewShape(parsed))return {kind:'held',reason:'invalid-saved-data'};
 try{return {kind:'ready',source:raw===null?'new':'saved',state:prepare(parsed)};}catch{return {kind:'held',reason:'preparation-failed'};}
}
