import "server-only";
import { readPublicHospitalityMedia } from "@/db/public-hospitality-media-repository";
import sharp from "sharp";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,ctx:{params:Promise<{assetId:string}>}){
 const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
 try{const widths=new URL(request.url).searchParams.getAll("w");
  const width=widths.length===1?Number(widths[0]):undefined;
  if(widths.length>1||(width!==undefined&&![320,640,960,1280,1920].includes(width)))return Response.json({status:"invalid_image_size"},{status:400,headers});
  const {assetId}=await ctx.params;const asset=await readPublicHospitalityMedia(assetId);
  if(!asset)return Response.json({status:"not_found"},{status:404,headers});
  // Revalidate the current approved bytes on every request before admitting 304.
  // No immutable URL assumption or cross-request publication cache is introduced.
  const etag=`"${asset.sha256}${width===undefined?"":`-w${width}-webp82-v1`}"`;
  const publicHeaders={...headers,"cache-control":"public, no-cache",etag};
  if(request.headers.get("if-none-match")?.split(",").some(value=>value.trim()===etag)) {
   return new Response(null,{status:304,headers:publicHeaders});
  }
  const bytes=width===undefined?asset.bytes:await sharp(asset.bytes,{limitInputPixels:40000000}).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer();
  return new Response(new Uint8Array(bytes),{status:200,headers:{...publicHeaders,"content-type":width===undefined?asset.mimeType:"image/webp","content-length":String(bytes.length)}});
 }catch{return Response.json({status:"temporarily_unavailable"},{status:503,headers});}
}

// Club data reads run near the existing Frankfurt data source; no project-wide region change.
export const preferredRegion = "fra1";
