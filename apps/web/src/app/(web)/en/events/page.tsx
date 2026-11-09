import { permanentRedirect } from "next/navigation";
export default async function EventsRoute({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const values=await searchParams;const query=new URLSearchParams();
 for(const [key,value] of Object.entries(values)){if(Array.isArray(value))value.forEach(v=>query.append(key,v));else if(value!==undefined)query.append(key,value);}
 permanentRedirect("/en/experiences"+(query.size?"?"+query.toString():""));
}
