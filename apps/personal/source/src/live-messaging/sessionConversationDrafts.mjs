import {validMessageText} from './messageLimits.mjs';
const sessions=new WeakMap(),empty=Object.freeze({drafts:Object.freeze({}),replies:Object.freeze({})});
const validKey=(key,account)=>{try{const v=JSON.parse(key);return Array.isArray(v)&&v.length===2&&v[0]===account&&typeof v[1]==='string'&&/^person:[a-zA-Z0-9:._-]{1,180}$/.test(v[1]);}catch{return false;}};
const inactive=Object.freeze({getSnapshot:()=>empty,subscribe:()=>()=>{},setDrafts:()=>{},setReplies:()=>{},viewFor:()=>undefined});
/** Session-only navigation retention. Private text never enters URLs, browser
 * storage or the deterministic demo world. A new canonical port cannot inherit
 * another account/session's drafts; abort immediately clears retained values. */
export function sessionConversationDrafts(port){
 if(!port||typeof port!=='object'||typeof port.accountId!=='string'||!port.accountId||!port.signal?.addEventListener||port.signal.aborted)return inactive;
 if(sessions.has(port))return sessions.get(port);
 let snapshot=empty,closed=false;const views=new Map(),listeners=new Set(),current=()=>!closed&&!port.signal.aborted;
 const emit=()=>{for(const fn of listeners)fn();};
 function update(kind,change){if(!current())return;const next=typeof change==='function'?change(snapshot[kind]):change;if(!next||typeof next!=='object'||Array.isArray(next)||Object.keys(next).length>1000)throw Error('Private draft is unavailable');const result={};for(const [key,value]of Object.entries(next)){if(!validKey(key,port.accountId)||kind==='drafts'&&!validMessageText(value)||kind==='replies'&&value!==null&&!(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)))throw Error('Private draft is unavailable');if(value!==''&&value!==null)result[key]=value;}snapshot=Object.freeze({...snapshot,[kind]:Object.freeze(result)});emit();}
 const close=()=>{if(closed)return;closed=true;snapshot=empty;views.clear();port.signal.removeEventListener('abort',close);emit();listeners.clear();sessions.delete(port);};port.signal.addEventListener('abort',close,{once:true});
 const store=Object.freeze({getSnapshot:()=>current()?snapshot:empty,subscribe(fn){if(!current())return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},setDrafts:change=>update('drafts',change),setReplies:change=>update('replies',change),viewFor(conversationId){if(!current()||!validKey(JSON.stringify([port.accountId,conversationId]),port.accountId))return undefined;if(!views.has(conversationId)){if(views.size>=1000)throw Error('Conversation view limit reached');let position=null;views.set(conversationId,{get position(){return current()?position:null;},set position(value){if(!current())return;if(!value||!['top','height','viewport'].every(k=>Number.isFinite(value[k])&&value[k]>=0&&value[k]<=1e9)||typeof value.nearBottom!=='boolean')throw Error('Invalid conversation view');position=Object.freeze({...value});}});}return views.get(conversationId);}});sessions.set(port,store);return store;
}
