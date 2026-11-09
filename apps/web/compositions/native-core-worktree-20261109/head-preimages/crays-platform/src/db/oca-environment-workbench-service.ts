import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getCorePgPool } from "./client";
import type { CraysRouteContext } from "../lib/dal/server-trust";
import { resolveOcaEnvironmentPrincipal } from "./oca-environment-principal";
import { bindOcaEnvironmentBrowserTicket } from "./oca-environment-browser-ticket";
import { issueAndResolveOcaEnvironmentReadTicket } from "./oca-environment-ticket-issuer";
import { resolveOcaEnvironmentReadAuthority } from "./oca-environment-read-authority-service";
import { readOcaEnvironmentRecordFamily } from "./oca-environment-read-model-repository";
import { OCA_ENVIRONMENT_READ_OPERATIONS } from "../graphql/oca-environment-documents";
import { getInternalGraphQLRateDimensions } from "../graphql/performance/request-metadata";

type Operation = keyof typeof OCA_ENVIRONMENT_READ_OPERATIONS;
export type OcaEnvironmentPageName = Exclude<(typeof OCA_ENVIRONMENT_READ_OPERATIONS)[Operation]["page"], null>;
export type OcaEnvironmentPageCursors = Partial<Record<OcaEnvironmentPageName, string | null>>;
export type OcaEnvironmentReadPageInput = { first?: number | null; cursors?: OcaEnvironmentPageCursors | null; originalIdempotencyKey?: string | null };
const pages = Object.values(OCA_ENVIRONMENT_READ_OPERATIONS).filter(x=>x.family!==null && x.page!==null);
function empty(operation:Operation,status:string,code:string,correlationId:string){
  const common={status,code,correlationId,nextSafeAction:status==="unavailable"
    ?"Retry the original read without inferring environment state."
    :"Return to an authorized Environment readiness view."};
  return operation==="OcaEnvironmentReadinessWorkbench"
    ?{...common,...Object.fromEntries(pages.map(p=>[p.page,{status,records:[],hasMore:false,endCursor:null}]))}
    :{...common,record:null,...(operation==="ReconcileOcaEnvironmentCommand"?{replacementCommandProhibited:true}:{})};
}

/** Registered, typed read path only. No runtime/controller/provider mutation. */
export async function readOcaEnvironmentWorkbench(
  route:CraysRouteContext,request:Request,operation:Operation,
  recordId:string|null,correlationId:string,pageInput:OcaEnvironmentReadPageInput={},
){
  const principal=resolveOcaEnvironmentPrincipal(route);
  if(principal.status!=="resolved")return empty(operation,"denied",principal.code,correlationId);
  const expected=OCA_ENVIRONMENT_READ_OPERATIONS[operation];
  const actual=getInternalGraphQLRateDimensions(request).operation.replace(/^sha256:/,"");
  if(actual!==expected.hash)return empty(operation,"denied","OPERATION_NOT_GRANTED",correlationId);
  const reconciliation=operation==="ReconcileOcaEnvironmentCommand";
  if(reconciliation && (typeof pageInput.originalIdempotencyKey!=="string" || !/^[\x21-\x7e]{16,200}$/.test(pageInput.originalIdempotencyKey)))return empty(operation,"denied","INVALID_ORIGINAL_REQUEST_KEY",correlationId);
  if(!reconciliation && expected.family!==null && (!recordId||recordId.length>200||recordId.trim()!==recordId||/[\x00-\x1f\x7f]/.test(recordId))){
    return empty(operation,"denied","INVALID_RECORD_ID",correlationId);
  }
  const first=pageInput.first??20;
  const cursors=pageInput.cursors??{};
  if(operation==="OcaEnvironmentReadinessWorkbench" && (
    !Number.isSafeInteger(first)||first<1||first>100||
    Object.keys(cursors).some(key=>!pages.some(item=>item.page===key))||
    Object.values(cursors).some(value=>value!==null &&
      (typeof value!=="string"||!value||value.length>200||value.trim()!==value||/[\x00-\x1f\x7f]/.test(value))))) {
    return empty(operation,"denied","INVALID_READ_REQUEST",correlationId);
  }
  const delivery=await bindOcaEnvironmentBrowserTicket(route,request,actual);
  if(delivery.status==="denied" || delivery.status==="unavailable") {
    return empty(operation,delivery.status,delivery.code,correlationId);
  }
  let client:PoolClient;
  try{client=await getCorePgPool().connect();}catch{return empty(operation,"unavailable","CORE_UNAVAILABLE",correlationId);}
  try{
    await client.query("begin isolation level repeatable read read only");
    // GUC scope is not a substitute for a real non-bypass application role.
    const role=await client.query<{rolsuper:boolean;rolbypassrls:boolean}>(
      "select rolsuper,rolbypassrls from pg_roles where rolname=current_user");
    if(!role.rows[0]||role.rows[0].rolsuper||role.rows[0].rolbypassrls){
      await client.query("rollback");return empty(operation,"unavailable","CORE_AUTHORITY_UNAVAILABLE",correlationId);
    }
    const authority=delivery.status==="requires_issuance"
      ?await issueAndResolveOcaEnvironmentReadTicket(route,delivery.request,actual,client)
      :await resolveOcaEnvironmentReadAuthority(route,delivery.request,actual,client);
    if(authority.status!=="resolved"){
      await client.query("rollback");return empty(operation,authority.status,authority.code,correlationId);
    }
    if(operation==="OcaEnvironmentReadinessWorkbench"){
      const result:Record<string,unknown>={status:"available",code:"ALLOWED",correlationId,
        nextSafeAction:"Select an authorized current record and inspect its readiness."};
      for(const item of pages){
        if(item.family!==null && item.page!==null){
          result[item.page]=await readOcaEnvironmentRecordFamily(client,authority,item.family,null,first,cursors[item.page]??null);
        }
      }
      if(Date.parse(authority.expiresAt)<=Date.now()){
        await client.query("rollback");return empty(operation,"denied","AUTHORITY_EXPIRED",correlationId);
      }
      await client.query("commit");return result;
    }
    if(expected.family===null)throw Error("INVALID_REGISTERED_OPERATION");
    const originalKeySha256=reconciliation?createHash("sha256").update(pageInput.originalIdempotencyKey!).digest("hex"):null;
    const page=await readOcaEnvironmentRecordFamily(client,authority,expected.family,recordId,1,null,originalKeySha256);
    if(Date.parse(authority.expiresAt)<=Date.now()){
      await client.query("rollback");return empty(operation,"denied","AUTHORITY_EXPIRED",correlationId);
    }
    await client.query("commit");
    if(reconciliation){
      if(page.status==="permission")return empty(operation,"permission","FIELD_DISCLOSURE_DENIED",correlationId);
      if(page.hasMore)return{status:"conflict",code:"ORIGINAL_REQUEST_KEY_AMBIGUOUS",record:null,replacementCommandProhibited:true,
        nextSafeAction:"Keep the original request key and request authorized investigation. Do not submit a replacement command.",correlationId};
      const record=page.records[0]??null;
      return{status:record?"available":"unknown_outcome",code:record?"ORIGINAL_REQUEST_FOUND":"ORIGINAL_REQUEST_NOT_VISIBLE",record,
        replacementCommandProhibited:true,correlationId,nextSafeAction:record
          ?"Inspect the current authoritative outcome and reconciliation state. Do not submit a replacement command."
          :"An absent record does not prove that the command was not dispatched. Keep the original request key and retry this read within authorized scope."};
    }
    return {status:page.status,code:page.status==="permission"?"FIELD_DISCLOSURE_DENIED"
      :page.records.length?"ALLOWED":"RECORD_NOT_FOUND",record:page.records[0]??null,
      nextSafeAction:page.records.length?"Inspect this current record before preparing an action."
        :"Return to the authorized Environment readiness view.",correlationId};
  }catch{
    await client.query("rollback").catch(()=>{});
    return empty(operation,"unavailable","READ_UNAVAILABLE",correlationId);
  }finally{client.release();}
}
