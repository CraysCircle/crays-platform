import {readPanelArrangement} from './webPanelArrangement';
export const contentAccessFieldIds=['audience','group','purchase','access','preview','fullText','duration','conditions'] as const;
/** Preserve the original raw legacy key. Map only identifiable original field panels, not old title/help/button positions. */
export function migrateContentAccessLayout(raw:string):string{
 if(!raw||raw.length>=16000)return '';
 try{
  const input=JSON.parse(raw),order=input?.order;
  if(!Array.isArray(order)||![12,13].includes(order.length)||new Set(order).size!==order.length||order.some(id=>typeof id!=='string'||!/^(0|[1-9]\d*)$/.test(id)||Number(id)>=order.length))return '';
  const group=order.length===13;
  const source=group?['audience','group','purchase','access','preview','fullText','duration','conditions']:['audience','purchase','access','preview','fullText','duration','conditions'];
  const ids=Object.fromEntries(source.map((id,index)=>[String(index+2),id]));
  return JSON.stringify(readPanelArrangement(JSON.stringify({order:order.map(id=>ids[id]).filter(Boolean),sizes:Object.fromEntries(Object.entries(input.sizes||{}).filter(([id])=>ids[id]).map(([id,value])=>[ids[id],value]))}),contentAccessFieldIds));
 }catch{return '';}
}
