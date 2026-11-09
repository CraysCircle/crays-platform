import {createHash} from "node:crypto";
import {z} from "zod";

type Rpc={query(sql:string,values:readonly unknown[]):Promise<{rows:unknown[]}>};
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const photo=z.object({sha256:z.string().regex(/^[a-f0-9]{64}$/),contentType:z.enum(["image/jpeg","image/png"]),content:z.string().min(1).max(2796204),bytes:z.number().int().positive().max(2097152),width:z.number().int().positive().max(20000),height:z.number().int().positive().max(20000)}).strict();
export function createPublicAmbassadorPortraitHandler(rpc:Rpc){
 return async function(request:Request):Promise<Response>{
  const absent=(status:number)=>new Response(null,{status,headers});
  if(request.method!=="GET")return new Response(null,{status:405,headers:{...headers,Allow:"GET"}});
  const url=new URL(request.url);
  // These fixtures are expressly authorized for the local TEST website only.
  // Never promote licensed internal prototype assets into the public live estate.
  const host=request.headers.get("host")??"";
  if(!["127.0.0.1:18790","localhost:18790"].includes(host)||!["http://127.0.0.1:18790","http://localhost:18790","http://127.0.0.1:18890","http://localhost:18890"].includes(url.origin))return absent(421);
  const match=/^\/api\/crays\/clubs\/public\/ambassadors\/([a-z0-9]+(?:-[a-z0-9]+)*)\/portrait$/.exec(url.pathname);
  if(!match||match[1].length>120)return absent(404);
  if([...url.searchParams.keys()].some(k=>k!=="sha")||url.searchParams.getAll("sha").length!==1)return absent(400);
  const sha=url.searchParams.get("sha")!;
  if(!/^[a-f0-9]{64}$/.test(sha))return absent(400);
  try{
   const r=await rpc.query("SELECT crays_core_rpc.club_growth_public_ambassador_portrait_test_v1($1,$2) data",[match[1],sha]);
   if(r.rows.length!==1)throw new Error("INVALID_SOURCE");
   const row=r.rows[0];
   if(!row||typeof row!=="object"||!("data" in row))throw new Error("INVALID_SOURCE");
   if(row.data===null)return absent(404);
   const p=photo.parse(row.data),bytes=Buffer.from(p.content,"base64");
   if(p.sha256!==sha||bytes.length!==p.bytes||createHash("sha256").update(bytes).digest("hex")!==sha)throw new Error("ORIGINAL_BYTES_MISMATCH");
   return new Response(new Uint8Array(bytes),{headers:{...headers,"Content-Type":p.contentType}});
  }catch{return absent(503);}
 };
}
