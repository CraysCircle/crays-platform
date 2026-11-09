import "server-only";
import {createHash} from "node:crypto";
import type {Ncrv2FormalAuthorityDecision} from "./ncrv2-formal-authority-verifier";
interface QR<R=Record<string,unknown>>{rows:R[]}
interface Client{query<R=Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<QR<R>>;release():void}
export interface Ncrv2FormalAuthorityDecisionPool{connect():Promise<Client>}
type Row=Record<string,unknown>;
const U=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,H=/^[a-f0-9]{64}$/;
const req=(x:unknown,c:string)=>{if(!x)throw new Error(c)};
const txt=(x:string,n:string)=>{req(x.length>0&&x.trim()===x,"NCRV2_AUTH_DECISION_INVALID_TEXT:"+n);return x};
const uuid=(x:string,n:string)=>{req(U.test(x),"NCRV2_AUTH_DECISION_INVALID_UUID:"+n);return x};
const hash=(x:string,n:string)=>{req(H.test(x),"NCRV2_AUTH_DECISION_INVALID_HASH:"+n);return x};
const iso=(x:unknown,n:string)=>{const d=x instanceof Date?x:new Date(String(x));req(Number.isFinite(d.getTime()),"NCRV2_AUTH_DECISION_INVALID_TIME:"+n);return d.toISOString()};
const sh=(x:string)=>createHash("sha256").update(x).digest("hex");
export interface PersistNcrv2FormalAuthorityDecisionInput{
 id:string;packageId:string;gateEvaluationId:string;evidenceCombinationReceiptSha256:string;formalAuthorityReceiptSha256:string;humanAal2ReceiptSha256:string;decision:Ncrv2FormalAuthorityDecision;
}
export interface Ncrv2FormalAuthorityDecisionRecord extends PersistNcrv2FormalAuthorityDecisionInput{decisionSha256:string;replayed:boolean}
function canonical(i:PersistNcrv2FormalAuthorityDecisionInput){
 uuid(i.id,"id");uuid(i.packageId,"packageId");uuid(i.gateEvaluationId,"gateEvaluationId");hash(i.evidenceCombinationReceiptSha256,"evidenceCombinationReceiptSha256");hash(i.formalAuthorityReceiptSha256,"formalAuthorityReceiptSha256");hash(i.humanAal2ReceiptSha256,"humanAal2ReceiptSha256");
 const d=i.decision;uuid(d.tenantId,"tenantId");hash(d.evaluationScopeSha256,"evaluationScopeSha256");txt(d.evidenceCombinationReceiptId,"evidenceCombinationReceiptId");txt(d.formalAuthorityReceiptId,"formalAuthorityReceiptId");txt(d.humanAal2ReceiptId,"humanAal2ReceiptId");
 req(d.verifierVersion===1,"NCRV2_AUTH_DECISION_VERIFIER_VERSION");req(d.formalRequirementCount===0,"NCRV2_AUTH_DECISION_FORMAL_COUNT");req(d.authorityConsumed===false&&d.formalActionPerformed===false&&d.providerCalled===false&&d.externalMutationPerformed===false,"NCRV2_AUTH_DECISION_SIDE_EFFECT_FLAG");
 const reasons=[...d.blockReasons].sort();reasons.forEach((x,n)=>txt(x,"blockReason."+n));req(new Set(reasons).size===reasons.length,"NCRV2_AUTH_DECISION_DUPLICATE_REASON");
 req(d.eligibleForAtomicConsumption?(d.status==="ELIGIBLE_FOR_SEPARATE_ATOMIC_CONSUMPTION"&&reasons.length===0):(d.status==="BLOCKED"&&reasons.length>0),"NCRV2_AUTH_DECISION_STATUS_MISMATCH");
 const evaluatedAt=iso(d.evaluatedAt,"evaluatedAt"),expiresAt=iso(d.expiresAt,"expiresAt");req(expiresAt>evaluatedAt,"NCRV2_AUTH_DECISION_WINDOW");
 const decision={...d,blockReasons:reasons,evaluatedAt,expiresAt};
 const bound={id:i.id,packageId:i.packageId,gateEvaluationId:i.gateEvaluationId,evidenceCombinationReceiptSha256:i.evidenceCombinationReceiptSha256,formalAuthorityReceiptSha256:i.formalAuthorityReceiptSha256,humanAal2ReceiptSha256:i.humanAal2ReceiptSha256,decision};
 return {...bound,decisionSha256:sh(JSON.stringify(bound))};
}
function row(r:Row):Omit<Ncrv2FormalAuthorityDecisionRecord,"replayed">{
 const reasons=Array.isArray(r.block_reasons)?[...r.block_reasons as string[]].sort():[];
 const decision:Ncrv2FormalAuthorityDecision={verifierVersion:Number(r.verifier_version) as 1,eligibleForAtomicConsumption:r.eligible_for_atomic_consumption===true,status:String(r.decision_status) as Ncrv2FormalAuthorityDecision["status"],blockReasons:reasons as Ncrv2FormalAuthorityDecision["blockReasons"],tenantId:String(r.tenant_id),evaluationScopeSha256:String(r.evaluation_scope_sha256),evidenceCombinationReceiptId:String(r.evidence_combination_receipt_id),formalAuthorityReceiptId:String(r.formal_authority_receipt_id),humanAal2ReceiptId:String(r.human_aal2_receipt_id),evaluatedAt:iso(r.evaluated_at,"row.evaluatedAt"),expiresAt:iso(r.expires_at,"row.expiresAt"),formalRequirementCount:0,authorityConsumed:false,formalActionPerformed:false,providerCalled:false,externalMutationPerformed:false};
 return{id:String(r.id),packageId:String(r.package_id),gateEvaluationId:String(r.gate_evaluation_id),evidenceCombinationReceiptSha256:String(r.evidence_combination_receipt_sha256),formalAuthorityReceiptSha256:String(r.formal_authority_receipt_sha256),humanAal2ReceiptSha256:String(r.human_aal2_receipt_sha256),decision,decisionSha256:String(r.decision_sha256)};
}
const eq=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export async function persistNcrv2FormalAuthorityDecision(pool:Ncrv2FormalAuthorityDecisionPool,input:PersistNcrv2FormalAuthorityDecisionInput):Promise<Ncrv2FormalAuthorityDecisionRecord>{
 const c=canonical(input),d=c.decision,client=await pool.connect();
 try{await client.query("BEGIN");await client.query("SELECT set_config('app.tenant_id',$1,true)",[d.tenantId]);
 const ins=await client.query<Row>('INSERT INTO "CraysClubNcrv2FormalAuthorityDecisionReceipt" ("id","tenant_id","package_id","gate_evaluation_id","verifier_version","evaluation_scope_sha256","evidence_combination_receipt_id","evidence_combination_receipt_sha256","formal_authority_receipt_id","formal_authority_receipt_sha256","human_aal2_receipt_id","human_aal2_receipt_sha256","decision_status","eligible_for_atomic_consumption","block_reasons","decision_sha256","evaluated_at","expires_at","formal_requirement_count","authority_consumed","formal_action_performed","provider_called","external_mutation_performed") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,0,false,false,false,false) ON CONFLICT DO NOTHING RETURNING *',[c.id,d.tenantId,c.packageId,c.gateEvaluationId,d.verifierVersion,d.evaluationScopeSha256,d.evidenceCombinationReceiptId,c.evidenceCombinationReceiptSha256,d.formalAuthorityReceiptId,c.formalAuthorityReceiptSha256,d.humanAal2ReceiptId,c.humanAal2ReceiptSha256,d.status,d.eligibleForAtomicConsumption,JSON.stringify(d.blockReasons),c.decisionSha256,d.evaluatedAt,d.expiresAt]);
 const sel=await client.query<Row>('SELECT * FROM "CraysClubNcrv2FormalAuthorityDecisionReceipt" WHERE "tenant_id"=$1 AND "evaluation_scope_sha256"=$2 AND "evidence_combination_receipt_id"=$3 AND "formal_authority_receipt_id"=$4',[d.tenantId,d.evaluationScopeSha256,d.evidenceCombinationReceiptId,d.formalAuthorityReceiptId]);req(sel.rows.length===1,"NCRV2_AUTH_DECISION_READBACK_MISSING");const out=row(sel.rows[0]);req(eq(out,c),"NCRV2_AUTH_DECISION_REPLAY_CONFLICT");await client.query("COMMIT");return{...out,replayed:ins.rows.length===0};
 }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
}
