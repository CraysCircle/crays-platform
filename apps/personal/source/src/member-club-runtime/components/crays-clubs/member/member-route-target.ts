export type MemberRouteTarget={kind:"absent"}|{kind:"invalid"}|{kind:"target";id:string};
/** A broken or empty explicit link is not an overview request. No fabricated identifier. */
export function parseMemberRouteTarget(route:string):MemberRouteTarget{
 const slash=route.indexOf("/");if(slash===-1)return {kind:"absent"};
 const encoded=route.slice(slash+1);if(!encoded||encoded.includes("/"))return {kind:"invalid"};
 try{const id=decodeURIComponent(encoded);if(!id||id.length>180||/[\u0000-\u001f\u007f]/.test(id))return {kind:"invalid"};return {kind:"target",id};}catch{return {kind:"invalid"};}
}
