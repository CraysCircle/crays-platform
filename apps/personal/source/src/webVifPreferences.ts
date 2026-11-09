import {normaliseVifListNames,readVifLists,retainVifLists} from './webVifLists';
import type {ProductWorld} from './productModel';
import {exactConversation} from './conversationTools';
export type VifPreferences={favourite:boolean;muteUntil:number;lists:string[];background:'Original'|'CRAYS neutral gray'};
export const emptyVifPreferences:VifPreferences={favourite:false,muteUntil:0,lists:[],background:'Original'};
export const vifPreferenceKey=(w:ProductWorld,id:string)=>`web-vif-preferences:${w.owner}:${exactConversation(w,id).channel}`;
export function readVifPreferences(w:ProductWorld,id:string){
 const c=exactConversation(w,id);if(!c.canRead)throw Error('Open your own exact conversation.');
 const raw=w.settings[vifPreferenceKey(w,id)],expected=raw===undefined?'':String(raw);let value={...emptyVifPreferences,background:w.settings[c.themeKey]==='CRAYS neutral gray'?'CRAYS neutral gray':'Original'} as VifPreferences;
 if(expected){const d=JSON.parse(expected);if(!d||Object.keys(d).sort().join(',')!=='background,favourite,lists,muteUntil'||typeof d.favourite!=='boolean'||!Number.isSafeInteger(d.muteUntil)||d.muteUntil<0||!Array.isArray(d.lists)||d.lists.some((v:unknown)=>typeof v!=='string'||!v.trim()||v.length>60)||new Set(d.lists.map((v:string)=>v.toLowerCase())).size!==d.lists.length||d.lists.length>20||!['Original','CRAYS neutral gray'].includes(d.background))throw Error('These saved preferences need review. Nothing has been replaced.');value={...d,background:w.settings[c.themeKey]==='CRAYS neutral gray'?'CRAYS neutral gray':'Original'};}
 value={...value,lists:normaliseVifListNames(w,value.lists)};
 return {value,expected:JSON.stringify({raw:expected,theme:w.settings[c.themeKey]??''})};
}
export function saveVifPreferences(w:ProductWorld,owner:string,id:string,expected:string,value:VifPreferences){
 if(w.owner!==owner||!w.identity.signedIn)throw Error('Your signed-in account changed.');const c=exactConversation(w,id);if(!c.canRead)throw Error('This exact conversation is unavailable.');
 if(readVifPreferences(w,id).expected!==expected)throw Error('Preferences changed in another view. Reopen before saving.');
 const retained=retainVifLists(w,readVifLists(w).lists.map(l=>l.name));
 const pending:ProductWorld={...retained,settings:{...retained.settings,[vifPreferenceKey(retained,id)]:JSON.stringify(value)}};readVifPreferences(pending,id);
 const next=retainVifLists(pending,value.lists);
 return {...next,settings:{...next.settings,[c.themeKey]:value.background}};
}
