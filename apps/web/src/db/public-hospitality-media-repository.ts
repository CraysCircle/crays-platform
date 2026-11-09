import "server-only";
import { z } from "zod";
import { getProductionPublicPool } from "@/db/clubs-production-public-pool";
import { hospitalitySha256, HOSPITALITY_PROPERTIES, type HospitalityPublicContent } from "@/lib/member-commerce/clubs-hospitality-content-contract";
const hash = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().min(1).max(256).regex(/^[A-Za-z0-9:_.-]+$/);
const asset = z.object({assetId:id,sha256:hash,byteSize:z.number().int().positive().max(10485760),mimeType:z.enum(["image/jpeg","image/png","image/webp"]),width:z.number().int().positive(),height:z.number().int().positive()}).strict();
export const publicHospitalityMediaManifestSchema = z.object({propertyId:z.enum(HOSPITALITY_PROPERTIES),contentVersionId:id,contentSha256:hash,projectionSha256:hash,publicProjectionJson:z.string().min(1).max(2097152),assets:z.array(asset).min(1).max(200)}).strict();
export function checkPublicHospitalityMediaManifest(content: HospitalityPublicContent, raw: unknown) {
 const m=publicHospitalityMediaManifestSchema.parse(raw);
 // Hash the exact stored publication text, never a reserialized jsonb representation.
 // The content argument has already been reconstructed/validated by the existing reader.
 // Exact parsed equality therefore admits only that same complete public projection.
 if(hospitalitySha256(m.publicProjectionJson)!==m.projectionSha256
  ||JSON.stringify(JSON.parse(m.publicProjectionJson))!==JSON.stringify(content)) {
  throw Error("HOSPITALITY_PUBLIC_PROJECTION_CHANGED");
 }
 if(m.propertyId!==content.propertyId||m.contentVersionId!==content.contentVersionId||m.contentSha256!==content.contentSha256
  ||m.assets.length!==content.media.length||new Set(m.assets.map(a=>a.assetId)).size!==m.assets.length)throw Error("HOSPITALITY_PUBLIC_MEDIA_INCOMPLETE");
 for(const item of content.media){const a=m.assets.find(a=>a.assetId===item.assetId);
  if(!a||a.width!==item.width||a.height!==item.height||item.url!=="/api/crays/clubs/media/"+encodeURIComponent(item.assetId))throw Error("HOSPITALITY_PUBLIC_MEDIA_BINDING_CHANGED");}
 return m;
}
function row(response:{rows:unknown[]}){if(response.rows.length!==1)throw Error("HOSPITALITY_PUBLIC_MEDIA_ENVELOPE");const r=z.object({result:z.unknown()}).strict().parse(response.rows[0]);return r.result;}
export async function readPublicHospitalityMediaManifest(propertyId: string, query: (sql: string, values: readonly unknown[]) => Promise<{rows: unknown[]}> = (sql, values) => getProductionPublicPool().query(sql, values)){
 if(!HOSPITALITY_PROPERTIES.some(id=>id===propertyId))return null;
 return row(await query("select crays_core_rpc.hospitality_public_media_manifest_prod_v1($1::text) result",[propertyId]));
}
const bytesSchema=z.object({propertyId:z.enum(HOSPITALITY_PROPERTIES),assetId:id,contentVersionId:id,contentSha256:hash,sha256:hash,byteSize:z.number().int().positive().max(10485760),mimeType:z.enum(["image/jpeg","image/png","image/webp"]),bytesBase64:z.string().min(1).max(15000000)}).strict();
export function checkedPublicHospitalityMedia(assetId:string,raw:unknown){
 if(raw===null)return null;
 const v=bytesSchema.parse(raw);if(v.assetId!==assetId)throw Error("HOSPITALITY_PUBLIC_MEDIA_ASSET_MISMATCH");
 const bytes=Buffer.from(v.bytesBase64.replace(/\s/g,""),"base64");
 if(bytes.length!==v.byteSize||hospitalitySha256(bytes)!==v.sha256)throw Error("HOSPITALITY_PUBLIC_MEDIA_BYTES_MISMATCH");
 return{assetId:v.assetId,propertyId:v.propertyId,bytes,mimeType:v.mimeType,byteSize:v.byteSize,sha256:v.sha256,contentVersionId:v.contentVersionId};
}
export async function readPublicHospitalityMedia(assetId:string){
 if(!id.safeParse(assetId).success)return null;
 return checkedPublicHospitalityMedia(assetId,row(await getProductionPublicPool().query("select crays_core_rpc.hospitality_public_media_read_prod_v1($1::text) result",[assetId])));
}
