/** NEXT_DEPLOYMENT. Navigation only: never grants access to an original record. */
export type AmbassadorPersonalView="overview"|"requests"|"bookings"|"links"|"settlements"|"documents";
export type AmbassadorRoute={kind:"programme"}|{kind:"invalid"}|{kind:"personal";view:AmbassadorPersonalView;originalId:string|null};
const views=new Set<string>(["overview","requests","bookings","links","settlements","documents"]);
const detailViews=new Set<string>(["requests","bookings","settlements","documents"]);
function validId(value:string){return value.length>0&&value.length<=200&&!/[\u0000-\u001f\u007f]/.test(value);}
export function parseAmbassadorRoute(route:string):AmbassadorRoute {
 const parts=route.replace(/^#/,"").split("/");
 if(parts[0]!=="ambassador"||parts.length>3)return {kind:"invalid"};
 if(parts.length===1)return {kind:"personal",view:"overview",originalId:null};
 if(parts[1]==="programme"&&parts.length===2)return {kind:"programme"};
 if(!views.has(parts[1]))return {kind:"invalid"};
 const view=parts[1] as AmbassadorPersonalView;
 if(parts.length===2)return {kind:"personal",view,originalId:null};
 if(!detailViews.has(view))return {kind:"invalid"};
 try{const originalId=decodeURIComponent(parts[2]);return validId(originalId)?{kind:"personal",view,originalId}:{kind:"invalid"};}catch{return {kind:"invalid"};}
}
export function ambassadorRouteHash(view:AmbassadorPersonalView,originalId:string|null=null){
 if(!views.has(view)||(originalId!==null&&(!detailViews.has(view)||!validId(originalId))))throw new Error("Invalid Ambassador target");
 return `#ambassador/${view}${originalId===null?"":"/"+encodeURIComponent(originalId)}`;
}
