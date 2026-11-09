/** Reviewed Pexels illustrations, shared across list, detail and basket. Exact stable menu IDs only. */
export function spotMenuIllustration(id:string):string|undefined{
 const match=/^crays-demo-01a1863a-v1-spot-\d{4}-menu-(\d+)$/.exec(id);
 const index=match?Number(match[1]):0;
 return index>=1&&index<=12?'/assets/crays-menu-v1/menu-'+String(index).padStart(2,'0')+'.webp':undefined;
}
