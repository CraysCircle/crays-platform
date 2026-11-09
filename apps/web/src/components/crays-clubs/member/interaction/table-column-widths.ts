/** Redistribute space between data columns while preserving the table's total width. */
export function resizeTableColumns(widths:readonly number[],index:number,requested:number,min=70,max=800,fixedColumns:readonly number[]=[0]):number[]{
 const next=[...widths];if(index<0||fixedColumns.includes(index)||index>=next.length||!Number.isFinite(requested)||next.some(x=>!Number.isFinite(x)||x<=0))return next;
 let delta=Math.max(min,Math.min(max,requested))-next[index];
 const peers=[...next.keys()].filter(i=>i>index&&!fixedColumns.includes(i)).concat([...next.keys()].filter(i=>i<index&&!fixedColumns.includes(i)).reverse());
 for(const i of peers){
  const change=delta>0?Math.min(delta,Math.max(0,next[i]-min)):Math.max(delta,-Math.max(0,max-next[i]));
  next[i]-=change;next[index]+=change;delta-=change;
  if(Math.abs(delta)<.01)break;
 }
 return next.map(n=>Math.round(n*100)/100);
}
export function parseTableColumnWidths(raw:string,count:number,fixedColumns:readonly number[]=[0]):number[]{
 try{const value=raw.length<4000?JSON.parse(raw):null;return Array.isArray(value)&&value.length===count&&value.every((v,i)=>typeof v==='number'&&Number.isFinite(v)&&v>=(fixedColumns.includes(i)?16:40)&&v<=800)?value:[];}catch{return [];}
}
