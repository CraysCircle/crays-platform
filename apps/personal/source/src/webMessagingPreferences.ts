import type {ProductWorld} from './productModel';
export const typingPreferenceKey=(owner:string)=>'web-typing-preference:'+owner;
export function typingPreference(w:ProductWorld){
 const value=w.settings[typingPreferenceKey(w.owner)];
 // The frozen baseWorld has one initial account, thorben. Do not attribute its old global preference to another account.
 const legacy=w.owner==='thorben'?w.settings.typing:undefined;
 return {value:w.identity.signedIn&&(typeof value==='boolean'?value:value===undefined&&legacy===true),expected:JSON.stringify([value??null,legacy??null]),problem:value!==undefined&&typeof value!=='boolean'};
}
export function saveTypingPreference(w:ProductWorld,owner:string,expected:string,value:boolean){
 if(!owner||!w.identity.signedIn||w.owner!==owner||typeof value!=='boolean'||typingPreference(w).expected!==expected)throw Error('Your account or this preference changed. Review the current setting again.');
 if(typingPreference(w).problem)throw Error('This saved preference needs review. Its original value is retained.');
 return {...w,settings:{...w.settings,[typingPreferenceKey(owner)]:value}};
}
