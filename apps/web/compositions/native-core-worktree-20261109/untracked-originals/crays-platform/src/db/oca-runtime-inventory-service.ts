import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { getCorePgPool } from "@/db/client";
import type { CraysRouteContext } from "@/lib/dal/server-trust";

const roleMap={admin:"programme_governance","crays-management":"architecture",reviewer:"security"}as const;
const inputSchema=z.object({
 idempotencyKey:z.string().min(16).max(200),runtimeAssetId:z.string().min(3).max(200),
 expectedAssetVersion:z.number().int().positive(),expectedAssetSha256:z.string().regex(/^[0-9a-f]{64}$/),
 observedState:z.enum(["absent","present_unverified","drifted","missing","rejected"]),
 installedVersion:z.string().trim().min(1).max(200).nullable().optional(),
 installedDigest:z.string().regex(/^sha256:[0-9a-f]{64}$/).nullable().optional(),
 evidenceRef:z.string().trim().min(3).max(500),
});
export type ObserveOcaRuntimeAssetInput=z.infer<typeof inputSchema>;
const canonical=(value:unknown):string=>Array.isArray(value)?`[${value.map(canonical).join(",")}]`:value&&typeof value==="object"?`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`:JSON.stringify(value);
const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
type Access={allowed:boolean;code:string;tenantId:string|null;actorId:string|null;actorRole:string|null};
function access(context:CraysRouteContext):Access{
 const actorId=context.session.account?.id??null;
 if(context.authoritySource!=="auth0-crays-session"||!actorId)return{allowed:false,code:"AUTHENTICATION_REQUIRED",tenantId:null,actorId:null,actorRole:null};
 if(!context.tenantId||["anonymous","identity-review","crays-local-review","crays-portal-bridge"].includes(context.tenantId))return{allowed:false,code:"TENANT_REQUIRED",tenantId:null,actorId,actorRole:null};
 const actorRole=roleMap[context.role as keyof typeof roleMap]??null;
 return actorRole?{allowed:true,code:"ALLOWED",tenantId:context.tenantId,actorId,actorRole}:{allowed:false,code:"ROLE_NOT_ADMITTED",tenantId:context.tenantId,actorId,actorRole:null};
}
async function setAuthority(client:PoolClient,a:Access){
 if(!a.allowed||!a.tenantId||!a.actorId||!a.actorRole)throw new Error("OCA_INVENTORY_AUTHORITY_REQUIRED");
 await client.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true),set_config('crays.actor_id',$2,true),set_config('crays.actor_role',$3,true)",[a.tenantId,a.actorId,a.actorRole]);
}
export async function getOcaRuntimeInventory(context:CraysRouteContext,correlationId=crypto.randomUUID()){
 const a=access(context);
 if(!a.allowed)return{status:"denied",access:a,assets:[],releaseBom:[],gaps:[],receipts:[],denials:[],nextSafeAction:"Return to an authorized CRAYS Role Home.",correlationId};
 let client:PoolClient;try{client=await getCorePgPool().connect();}catch{return{status:"unavailable",access:a,assets:[],releaseBom:[],gaps:[],receipts:[],denials:[],nextSafeAction:"Retry the persisted CRAYS Core inventory read; never infer runtime state.",correlationId};}
 try{
  await client.query("begin read only");await setAuthority(client,a);
  const assets=await client.query("select * from crays_core.oca_runtime_asset_inventory_read_model where tenant_id=$1 order by runtime_asset_id limit 100",[a.tenantId]);
  const bom=await client.query("select * from crays_core.oca_release_bom_read_model where tenant_id=$1 order by release_pin_id limit 100",[a.tenantId]);
  const gaps=await client.query("select * from crays_core.oca_inventory_gaps_read_model where tenant_id=$1 order by gap_class,record_id limit 100",[a.tenantId]);
  const receipts=await client.query("select * from crays_core.oca_inventory_command_receipt_read_model where tenant_id=$1 order by created_at desc limit 100",[a.tenantId]);
  const denials=await client.query("select * from crays_core.oca_inventory_denial_receipt_read_model where tenant_id=$1 order by created_at desc limit 100",[a.tenantId]);
  await client.query("commit");
  return{status:assets.rowCount?"ready":"empty",access:a,assets:assets.rows,releaseBom:bom.rows,gaps:gaps.rows,receipts:receipts.rows,denials:denials.rows,nextSafeAction:gaps.rowCount?"Resolve the highest-priority persisted inventory gap before runtime admission.":"Continue to the next dependency-safe OCA task.",correlationId};
 }catch{await client.query("rollback").catch(()=>undefined);return{status:"unavailable",access:a,assets:[],releaseBom:[],gaps:[],receipts:[],denials:[],nextSafeAction:"Retry the persisted CRAYS Core inventory read; never infer runtime state.",correlationId};}finally{client.release();}
}
type Preflight={allowed:boolean;code:string;currentAssetVersion:number|null;currentAssetSha256:string|null;nextSafeAction:string};
async function preflightWithClient(client:PoolClient,context:CraysRouteContext,input:ObserveOcaRuntimeAssetInput):Promise<Preflight>{
 const a=access(context);if(!a.allowed)return{allowed:false,code:a.code,currentAssetVersion:null,currentAssetSha256:null,nextSafeAction:"Return to an authorized CRAYS Role Home."};
 await setAuthority(client,a);
 const current=await client.query<{asset_version:number;asset_sha256:string}>(`select asset_version,asset_sha256 from crays_core.oca_runtime_asset_inventory_read_model where tenant_id=$1 and runtime_asset_id=$2 limit 1`,[a.tenantId,input.runtimeAssetId]);
 const row=current.rows[0];if(!row)return{allowed:false,code:"RUNTIME_ASSET_REQUIRED",currentAssetVersion:null,currentAssetSha256:null,nextSafeAction:"Reload the canonical inventory and select an existing RuntimeAsset."};
 if(row.asset_version!==input.expectedAssetVersion)return{allowed:false,code:"RUNTIME_ASSET_VERSION_CONFLICT",currentAssetVersion:row.asset_version,currentAssetSha256:row.asset_sha256,nextSafeAction:"Reload the RuntimeAsset and review the observation against its current version."};
 if(row.asset_sha256!==input.expectedAssetSha256)return{allowed:false,code:"RUNTIME_ASSET_DIGEST_CONFLICT",currentAssetVersion:row.asset_version,currentAssetSha256:row.asset_sha256,nextSafeAction:"Reload the RuntimeAsset; do not submit against a mismatched fingerprint."};
 if(input.observedState==="absent"&&(input.installedVersion||input.installedDigest))return{allowed:false,code:"ABSENT_ASSET_CANNOT_HAVE_INSTALL_METADATA",currentAssetVersion:row.asset_version,currentAssetSha256:row.asset_sha256,nextSafeAction:"Remove install metadata or select a non-absent observation state."};
 return{allowed:true,code:"ALLOWED",currentAssetVersion:row.asset_version,currentAssetSha256:row.asset_sha256,nextSafeAction:"Submit the exact observation with the same expected version, digest and idempotency key."};
}
export async function preflightObserveOcaRuntimeAsset(context:CraysRouteContext,raw:unknown):Promise<Preflight>{
 const parsed=inputSchema.safeParse(raw);if(!parsed.success)return{allowed:false,code:"VALIDATION_FAILED",currentAssetVersion:null,currentAssetSha256:null,nextSafeAction:parsed.error.issues[0]?.message??"Correct the observation."};
 let client:PoolClient;try{client=await getCorePgPool().connect();}catch{return{allowed:false,code:"PREFLIGHT_UNAVAILABLE",currentAssetVersion:null,currentAssetSha256:null,nextSafeAction:"Retry against CRAYS Core; do not submit without preflight."};}
 try{await client.query("begin read only");const result=await preflightWithClient(client,context,parsed.data);await client.query("commit");return result;}catch{await client.query("rollback").catch(()=>undefined);return{allowed:false,code:"PREFLIGHT_UNAVAILABLE",currentAssetVersion:null,currentAssetSha256:null,nextSafeAction:"Retry against CRAYS Core; do not submit without preflight."};}finally{client.release();}
}
async function persistInventoryDenial(context:CraysRouteContext,input:ObserveOcaRuntimeAssetInput,preflight:Preflight,correlationId:string){
 const a=access(context);if(!a.allowed||!a.tenantId||!a.actorId||!a.actorRole)return null;
 let client:PoolClient;try{client=await getCorePgPool().connect();}catch{return null;}
 try{await client.query("begin");await setAuthority(client,a);const id=randomUUID(),targetHash=sha(input.runtimeAssetId),receiptHash=sha(canonical({id,actorId:a.actorId,reasonCode:preflight.code,targetHash,correlationId}));
 await client.query(`insert into crays_core.oca_inventory_denial_receipts(tenant_id,denial_receipt_id,actor_id,actor_role_key,command_name,reason_code,target_id_sha256,expected_asset_version,expected_asset_sha256,correlation_id,next_safe_action,receipt_sha256)values($1,$2,$3,$4,'ObserveOcaRuntimeAsset',$5,$6,$7,$8,$9,$10,$11)`,[a.tenantId,id,a.actorId,a.actorRole,preflight.code,targetHash,input.expectedAssetVersion,input.expectedAssetSha256,correlationId,preflight.nextSafeAction,receiptHash]);await client.query("commit");return id;
 }catch{await client.query("rollback").catch(()=>undefined);return null;}finally{client.release();}
}
export async function reconcileOcaRuntimeObservation(context:CraysRouteContext,originalIdempotencyKey:string,correlationId:string){
 const a=access(context);if(!a.allowed||!a.tenantId||!a.actorId)return{status:"denied",found:false,receiptId:null,runtimeAssetId:null,runtimeAssetVersion:null,resultCode:null,nextSafeAction:"Return to an authorized CRAYS Role Home.",correlationId};
 if(originalIdempotencyKey.length<16||originalIdempotencyKey.length>200)return{status:"validation_failed",found:false,receiptId:null,runtimeAssetId:null,runtimeAssetVersion:null,resultCode:null,nextSafeAction:"Provide the exact original idempotency key.",correlationId};
 let client:PoolClient;try{client=await getCorePgPool().connect();}catch{return{status:"unavailable",found:false,receiptId:null,runtimeAssetId:null,runtimeAssetVersion:null,resultCode:null,nextSafeAction:"Retry reconciliation against CRAYS Core; do not issue a new command.",correlationId};}
 try{await client.query("begin read only");await setAuthority(client,a);const found=await client.query<Record<string,unknown>>(`select c.* from crays_core.oca_inventory_command_roots r join lateral(select * from crays_core.oca_inventory_command_receipt_versions x where x.tenant_id=r.tenant_id and x.idempotency_root_id=r.idempotency_root_id order by receipt_version desc limit 1)c on true where r.tenant_id=$1 and r.actor_id=$2 and r.idempotency_key_sha256=$3`,[a.tenantId,a.actorId,sha(originalIdempotencyKey)]);await client.query("commit");const row=found.rows[0];return row?{status:"reconciled",found:true,receiptId:row.command_receipt_id,runtimeAssetId:row.consequence_runtime_asset_id,runtimeAssetVersion:row.consequence_runtime_asset_version,resultCode:row.result_code,nextSafeAction:row.next_safe_action,correlationId}:{status:"not_found",found:false,receiptId:null,runtimeAssetId:null,runtimeAssetVersion:null,resultCode:null,nextSafeAction:"Preserve the original key and investigate before any retry.",correlationId};
 }catch{await client.query("rollback").catch(()=>undefined);return{status:"unavailable",found:false,receiptId:null,runtimeAssetId:null,runtimeAssetVersion:null,resultCode:null,nextSafeAction:"Retry reconciliation against CRAYS Core; do not issue a new command.",correlationId};}finally{client.release();}
}

export async function observeOcaRuntimeAsset(context:CraysRouteContext,raw:unknown,correlationId:string){
 const parsed=inputSchema.safeParse(raw);if(!parsed.success)return{status:"preflight_denied",replayed:false,runtimeAssetId:null,runtimeAssetVersion:null,receiptId:null,preflight:{allowed:false,code:"VALIDATION_FAILED",currentAssetVersion:null,currentAssetSha256:null,nextSafeAction:parsed.error.issues[0]?.message??"Correct the observation."},nextSafeAction:"Correct the observation and rerun preflight.",correlationId};
 const input=parsed.data,a=access(context);if(!a.allowed||!a.tenantId||!a.actorId||!a.actorRole)return{status:"denied",replayed:false,runtimeAssetId:null,runtimeAssetVersion:null,receiptId:null,preflight:await preflightObserveOcaRuntimeAsset(context,input),nextSafeAction:"Return to an authorized CRAYS Role Home.",correlationId};
 const idempotencyHash=sha(input.idempotencyKey),payloadHash=sha(canonical({...input,idempotencyKey:undefined}));
 let client:PoolClient;try{client=await getCorePgPool().connect();}catch{return{status:"unknown_outcome",replayed:false,runtimeAssetId:null,runtimeAssetVersion:null,receiptId:null,preflight:null,nextSafeAction:"CRAYS Core is unavailable. Preserve the exact idempotency key and correlation ID.",correlationId};}
 try{
  await client.query("begin");await setAuthority(client,a);
  const prior=await client.query<{canonical_payload_sha256:string;command_receipt_id:string;consequence_runtime_asset_id:string;consequence_runtime_asset_version:number;next_safe_action:string}>(`select r.canonical_payload_sha256,c.command_receipt_id,c.consequence_runtime_asset_id,c.consequence_runtime_asset_version,c.next_safe_action from crays_core.oca_inventory_command_roots r join lateral(select * from crays_core.oca_inventory_command_receipt_versions x where x.tenant_id=r.tenant_id and x.idempotency_root_id=r.idempotency_root_id order by receipt_version desc limit 1)c on true where r.tenant_id=$1 and r.actor_id=$2 and r.idempotency_key_sha256=$3`,[a.tenantId,a.actorId,idempotencyHash]);
  if(prior.rows[0]){await client.query("commit");const p=prior.rows[0];if(p.canonical_payload_sha256!==payloadHash)return{status:"idempotency_conflict",replayed:false,runtimeAssetId:null,runtimeAssetVersion:null,receiptId:p.command_receipt_id,preflight:null,nextSafeAction:"Reuse the original payload or create a new idempotency key.",correlationId};return{status:"replayed",replayed:true,runtimeAssetId:p.consequence_runtime_asset_id,runtimeAssetVersion:p.consequence_runtime_asset_version,receiptId:p.command_receipt_id,preflight:null,nextSafeAction:p.next_safe_action,correlationId};}
  const preflight=await preflightWithClient(client,context,input);if(!preflight.allowed){await client.query("rollback");const receiptId=await persistInventoryDenial(context,input,preflight,correlationId);return{status:"preflight_denied",replayed:false,runtimeAssetId:null,runtimeAssetVersion:null,receiptId,preflight,nextSafeAction:preflight.nextSafeAction,correlationId};}
  const current=(await client.query<Record<string,unknown>>("select * from crays_core.oca_runtime_asset_versions where tenant_id=$1 and runtime_asset_id=$2 order by asset_version desc limit 1",[a.tenantId,input.runtimeAssetId])).rows[0];
  if(!current)throw new Error("RUNTIME_ASSET_REQUIRED");
  const nextVersion=Number(current.asset_version)+1,assetHash=sha(canonical({tenantId:a.tenantId,runtimeAssetId:input.runtimeAssetId,assetVersion:nextVersion,observedState:input.observedState,installedVersion:input.installedVersion??null,installedDigest:input.installedDigest??null,evidenceRef:input.evidenceRef,actorId:a.actorId}));
  const rootId=randomUUID(),receiptId=randomUUID();
  await client.query(`insert into crays_core.oca_inventory_command_roots(tenant_id,idempotency_root_id,actor_id,actor_role_key,command_name,idempotency_key_sha256,canonical_payload_sha256,runtime_asset_id,expected_asset_version,expected_asset_sha256,root_state)values($1,$2,$3,$4,'ObserveOcaRuntimeAsset',$5,$6,$7,$8,$9,'accepted')`,[a.tenantId,rootId,a.actorId,a.actorRole,idempotencyHash,payloadHash,input.runtimeAssetId,input.expectedAssetVersion,input.expectedAssetSha256]);
  await client.query(`insert into crays_core.oca_runtime_asset_versions(tenant_id,runtime_asset_id,asset_version,component_key,asset_class,origin,observed_state,host_scope,installed_version,installed_digest,observed_at,source_authority,supersedes_asset_version,asset_sha256)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),'host_observation',$11,$12)`,[a.tenantId,input.runtimeAssetId,nextVersion,current.component_key,current.asset_class,current.origin,input.observedState,current.host_scope,input.installedVersion??null,input.installedDigest??null,input.expectedAssetVersion,assetHash]);
  const nextSafeAction=input.observedState==="absent"?"OpenClaw remains absent. Resolve SBOM and legal admission gaps before any installation.":"Review the unadmitted observation and resolve drift before any runtime use.";
  const receiptHash=sha(canonical({receiptId,rootId,runtimeAssetId:input.runtimeAssetId,nextVersion,correlationId,nextSafeAction}));
  await client.query(`insert into crays_core.oca_inventory_command_receipt_versions(tenant_id,command_receipt_id,receipt_version,idempotency_root_id,actor_id,actor_role_key,command_name,command_state,result_code,business_completion_state,consequence_runtime_asset_id,consequence_runtime_asset_version,correlation_id,next_safe_action,receipt_sha256)values($1,$2,1,$3,$4,$5,'ObserveOcaRuntimeAsset','completed','OBSERVATION_PERSISTED','persisted',$6,$7,$8,$9,$10)`,[a.tenantId,receiptId,rootId,a.actorId,a.actorRole,input.runtimeAssetId,nextVersion,correlationId,nextSafeAction,receiptHash]);
  await client.query("commit");return{status:"applied",replayed:false,runtimeAssetId:input.runtimeAssetId,runtimeAssetVersion:nextVersion,receiptId,preflight,nextSafeAction,correlationId};
 }catch(error){if(process.env.OCA_RUNTIME_TEST==="true")console.error("OCA008_COMMAND_ERROR",error instanceof Error?error.message:"unknown");await client.query("rollback").catch(()=>undefined);return{status:"unknown_outcome",replayed:false,runtimeAssetId:null,runtimeAssetVersion:null,receiptId:null,preflight:null,nextSafeAction:"Preserve the exact idempotency key and correlation ID; reload before any retry.",correlationId};}finally{client.release();}
}
