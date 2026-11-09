import "server-only";
import {readFile,lstat} from "node:fs/promises";
import {createHash} from "node:crypto";
import {z} from "zod";
export const runtime="nodejs";export const dynamic="force-dynamic";
const root="/srv/crays/dev-state/member-area-screen1-20261006/member-demo100-20261012/public-media/";
const assetSchema=z.object({file:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/),publicPath:z.string(),assetId:z.string().min(1),offerId:z.string().regex(/^member-demo-20261012-[0-9]{3}$/)}).passthrough();
export async function GET(_:Request,{params}:{params:Promise<{asset:string}>}){
 try{const {asset}=await params;if(!/^member-demo-20261012-(?:00[1-9]|0[1-9][0-9]|100)-[a-f0-9]{12}\.png$/.test(asset))throw Error("ASSET_NOT_ADMITTED");const registry=JSON.parse(await readFile(root+"ASSET_REGISTRY.json","utf8"));const entry=assetSchema.parse(registry[asset]);if(entry.file!==asset||entry.publicPath!=="/api/member-demo-media/"+asset||!asset.endsWith(entry.sha256.slice(0,12)+".png"))throw Error("ASSET_BINDING_MISMATCH");const stat=await lstat(root+asset);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024||stat.size<8)throw Error("ASSET_INVALID");const bytes=await readFile(root+asset);if(bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a"||createHash("sha256").update(bytes).digest("hex")!==entry.sha256)throw Error("ASSET_SHA_MISMATCH");return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/png","Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff","ETag":"\""+entry.sha256+"\""}});}catch{return new Response("Image unavailable.",{status:404,headers:{"Cache-Control":"no-store"}});}
}
