import type {ProductWorld} from './productModel';
export const vifLocalViewKey=(w:ProductWorld,id:string)=>{const channel=id==='alex'?'person:alex':id==='circle'?'group:circle-design':id==='chuck'?'agent:'+w.owner:id;return `web-vif-local-view:${w.owner}:${channel}`;};
export function vifLocalView(w:ProductWorld,id:string){
 const raw=w.identity.signedIn?w.settings[vifLocalViewKey(w,id)]:undefined,expected=raw===undefined?'':String(raw);
 if(!expected)return {expected,hiddenIds:[] as string[],removed:false,problem:false};
 try{const p=JSON.parse(expected);if(!p||Object.keys(p).sort().join(',')!=='hiddenIds,removed,version'||p.version!==1||typeof p.removed!=='boolean'||!Array.isArray(p.hiddenIds)||p.hiddenIds.length>10000||p.hiddenIds.some((v:unknown)=>typeof v!=='string'||!v.trim())||new Set(p.hiddenIds).size!==p.hiddenIds.length)throw Error();return {expected,hiddenIds:p.hiddenIds as string[],removed:p.removed as boolean,problem:false};}catch{return {expected,hiddenIds:[] as string[],removed:false,problem:true};}
}
