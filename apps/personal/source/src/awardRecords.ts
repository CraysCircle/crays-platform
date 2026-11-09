import type {Entity, ProductWorld} from './productModel';

/** A saved local example is never authority when its original ID is ambiguous. */
export function ownAwardRecords(w:ProductWorld,kind:string):Entity[]{
 const counts=new Map<string,number>();
 for(const o of w.objects)counts.set(o.id,(counts.get(o.id)||0)+1);
 return w.objects.filter(o=>o.owner===w.owner&&o.kind===kind&&counts.get(o.id)===1);
}
export function assertAwardSlot(w:ProductWorld,id:string,kind:string,existing:boolean){
 const rows=w.objects.filter(o=>o.id===id);
 if(rows.length&&(rows.length!==1||rows[0].owner!==w.owner||rows[0].kind!==kind||!existing))
  throw Error('This saved Props original needs review. Conflicting records were retained; no replacement or repeat was made.');
}
export function awardRecord(value:unknown):value is Record<string,unknown>{return Boolean(value&&typeof value==='object'&&!Array.isArray(value));}
export function awardText(value:unknown):value is string{return typeof value==='string'&&value.trim().length>0;}
export function awardVersion(value:unknown):value is number{return Number.isSafeInteger(value)&&Number(value)>0;}
