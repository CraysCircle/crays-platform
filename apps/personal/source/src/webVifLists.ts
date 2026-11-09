import type {ProductWorld} from './productModel';
export type VifList={id:string;name:string;aliases:string[];registered:boolean};
type Registry={owner:string;revision:number;lists:{id:string;name:string;aliases:string[]}[]};
const fold=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase('en');
const key=(w:ProductWorld)=>'web-vif-lists:'+w.owner;
function storedPreferences(w:ProductWorld){return Object.entries(w.settings).filter(([k])=>k.startsWith('web-vif-preferences:'+w.owner+':')).sort(([a],[b])=>a.localeCompare(b)).map(([k,raw])=>{if(typeof raw!=='string')throw Error('Saved conversation preferences need review.');const d=JSON.parse(raw);if(!d||Object.keys(d).sort().join(',')!=='background,favourite,lists,muteUntil'||typeof d.favourite!=='boolean'||!Number.isSafeInteger(d.muteUntil)||d.muteUntil<0||!['Original','CRAYS neutral gray'].includes(d.background)||!Array.isArray(d.lists)||d.lists.length>20||d.lists.some((n:unknown)=>typeof n!=='string'||!n.trim()||n.length>60)||new Set(d.lists.map(fold)).size!==d.lists.length)throw Error('Saved conversation preferences need review. Their originals have been kept.');return {key:k,raw,value:d as {favourite:boolean;muteUntil:number;lists:string[];background:string}};});}
export function readVifLists(w:ProductWorld){
 if(!w.identity.signedIn||!w.owner)throw Error('Sign in to review your private chat lists.');
 const raw=w.settings[key(w)];let registry:Registry={owner:w.owner,revision:0,lists:[]};
 if(raw!==undefined){if(typeof raw!=='string')throw Error('Your list registry needs review.');registry=JSON.parse(raw);if(!registry||registry.owner!==w.owner||!Number.isSafeInteger(registry.revision)||registry.revision<0||!Array.isArray(registry.lists)||registry.lists.some(l=>!l||typeof l.id!=='string'||!l.id||typeof l.name!=='string'||!l.name.trim()||l.name.length>60||!Array.isArray(l.aliases)||l.aliases.some(n=>typeof n!=='string'||!n.trim()||n.length>60)||!l.aliases.some(n=>fold(n)===fold(l.name)))||new Set(registry.lists.map(l=>l.id)).size!==registry.lists.length)throw Error('Your list registry needs review. Its original has been kept.');const aliases=registry.lists.flatMap(l=>[...new Set(l.aliases.map(fold))]);if(new Set(aliases).size!==aliases.length)throw Error('These list names have conflicting identities. Nothing has been replaced.');}
 const preferences=storedPreferences(w),lists:VifList[]=registry.lists.map(l=>({...l,aliases:[...l.aliases],registered:true}));
 for(const p of preferences)for(const name of p.value.lists){if(lists.some(l=>l.aliases.some(n=>fold(n)===fold(name))))continue;lists.push({id:'legacy:'+encodeURIComponent(fold(name)),name,aliases:[name],registered:false});}
 return {lists,registry,preferences,expected:JSON.stringify([raw??'',preferences.map(p=>[p.key,p.raw])])};
}
export function normaliseVifListNames(w:ProductWorld,names:string[]){const lists=readVifLists(w).lists;return [...new Set(names.map(n=>lists.find(l=>l.aliases.some(a=>fold(a)===fold(n)))?.name||n))];}
export function applyVifList(w:ProductWorld,owner:string,expected:string,action:'Create'|'Rename'|'Delete',listId:string,name:string,newId:string,confirmed:boolean){
 if(w.owner!==owner||!w.identity.signedIn)throw Error('Your signed-in account changed.');const state=readVifLists(w);if(state.expected!==expected)throw Error('Your lists or conversation choices changed. Reopen this review before saving.');
 if(!['Create','Rename','Delete'].includes(action))throw Error('Choose an explicit list action.');
 const selected=state.lists.find(l=>l.id===listId),nextName=name.trim();
 if(action!=='Delete'&&(!nextName||nextName.length>60))throw Error('Use a list name of 1–60 characters.');
 if(action!=='Delete'&&state.lists.some(l=>l.id!==(action==='Rename'?listId:'')&&l.aliases.some(a=>fold(a)===fold(nextName))))throw Error('A private list already uses this name.');
 if(action!=='Create'&&!selected)throw Error('Choose this exact original list.');
 if(action==='Delete'&&!confirmed)throw Error('Confirm removal of this private grouping first.');
 const lists=state.lists.filter(l=>l.registered||l.id===listId&&action==='Rename').map(({registered,...l})=>({...l,aliases:[...l.aliases]}));
 if(action==='Create'){if(!newId||state.lists.some(l=>l.id===newId))throw Error('This new list identity needs review.');lists.push({id:newId,name:nextName,aliases:[nextName]});}
 if(action==='Rename'){const list=lists.find(l=>l.id===listId)!;list.name=nextName;list.aliases=[...new Set([...list.aliases,nextName])];}
 const settings={...w.settings};
 if(action!=='Create')for(const p of state.preferences){const names=action==='Delete'?p.value.lists.filter(n=>!selected!.aliases.some(a=>fold(a)===fold(n))):p.value.lists.map(n=>selected!.aliases.some(a=>fold(a)===fold(n))?nextName:n);if(JSON.stringify(names)!==JSON.stringify(p.value.lists))settings[p.key]=JSON.stringify({...p.value,lists:names});}
 settings[key(w)]=JSON.stringify({owner,revision:state.registry.revision+1,lists:action==='Delete'?lists.filter(l=>l.id!==listId):lists});
 const next={...w,settings};readVifLists(next);return next;
}
/** Called only during an explicit preference save, never while reading legacy data. */
export function retainVifLists(w:ProductWorld,names:string[]){
 const state=readVifLists(w),wanted=new Set(names.map(fold)),missing=state.lists.filter(l=>!l.registered&&wanted.has(fold(l.name)));
 if(!missing.length)return w;
 const lists=[...state.registry.lists,...missing.map(({registered,...l})=>l)];
 const next={...w,settings:{...w.settings,[key(w)]:JSON.stringify({owner:w.owner,revision:state.registry.revision+1,lists})}};readVifLists(next);return next;
}
