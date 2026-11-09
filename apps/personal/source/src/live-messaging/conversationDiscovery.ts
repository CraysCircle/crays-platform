import type {ProductWorld} from '../productModel';
/** Per-render identity/ambiguity projection, without reading message contents
 * or retaining permission decisions between renders. */
export function conversationDiscovery(w:ProductWorld,isLegacy:(id:string)=>boolean){
 const objectCounts=new Map<string,number>(),personCounts=new Map<string,number>(),messaged=new Set<string>();
 for(const o of w.objects)objectCounts.set(o.id,(objectCounts.get(o.id)||0)+1);
 for(const p of w.people)personCounts.set(p.id,(personCounts.get(p.id)||0)+1);
 for(const o of w.objects)if(o.owner===w.owner&&o.kind==='private-message'&&typeof o.personId==='string'&&objectCounts.get(o.id)===1)messaged.add(o.personId);
 return {objectCounts,people:w.people.filter(p=>!isLegacy(p.id)&&personCounts.get(p.id)===1&&(p.contact||messaged.has(p.id)))};
}
