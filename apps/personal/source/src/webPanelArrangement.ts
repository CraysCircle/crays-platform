/** Browser-local presentation only. Never store task, guest or account records. */
export type PanelSize = {width?:number;height?:number};
export type PanelArrangement = {order:string[];sizes:Record<string,PanelSize>};
export function readPanelArrangement(raw:string, ids:readonly string[]):PanelArrangement {
 let input:unknown;try{input=raw.length<16000?JSON.parse(raw):null;}catch{input=null;}
 const o=input&&typeof input==='object'?input as Record<string,unknown>:{};
 const order=[...new Set([...(Array.isArray(o.order)?o.order.filter((id):id is string=>typeof id==='string'&&ids.includes(id)):[]),...ids])];
 const sizes:Record<string,PanelSize>={};
 if(o.sizes&&typeof o.sizes==='object') for(const id of ids){
  const size=(o.sizes as Record<string,PanelSize>)[id];if(!size||typeof size!=='object')continue;
  const valid=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
  if(valid(size.width,180,2400)||valid(size.height,100,2000))sizes[id]={...(valid(size.width,180,2400)?{width:size.width}:{}),...(valid(size.height,100,2000)?{height:size.height}:{})};
 }
 return {order,sizes};
}
