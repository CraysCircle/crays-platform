import type { PoolClient } from "pg";
import{type ClubsPropertyAccessMode,type ClubsPropertyAdmissionDecision,type PropertyAdmissionDecisionMaterial,
 normalizePropertyAdmissionAuthorityAt,propertyAdmissionDecisionReceiptId,propertyAdmissionDecisionSha256
}from "@/lib/clubs/property-admission";
export type ResolveClubsPropertyAdmissionInput={propertyId:string;accountId:string|null;authorityAt?:string|Date;
 decisionKeySha256?:string;commandIdempotencySha256?:string};
export class ClubsPropertyAdmissionAuthorityError extends Error{
 constructor(){super("Clubs property admission authority is unavailable");this.name="ClubsPropertyAdmissionAuthorityError";}
}
type Client=Pick<PoolClient,"query">;
type Scope={property_id:string;access_mode:ClubsPropertyAccessMode;admission_policy_version:string;store_id:string;
 tenant_id:string;operator_legal_entity_id:string;assignment_id:string;assignment_version:number|string};
type Receipt={tenant_id:string;property_id:string;store_id:string;operator_legal_entity_id:string;assignment_id:string;
 assignment_version:number|string;access_mode:ClubsPropertyAccessMode;admitted:boolean;account_id:string|null;
 grant_id:string|null;grant_version:number|string|null;policy_version:string;authority_at:string|Date;
 decision_reason:PropertyAdmissionDecisionMaterial["decisionReason"];decision_key_sha256:string|null;
 command_idempotency_sha256:string|null;decision_receipt_id:string;decision_sha256:string};
type ReplayBase=Omit<PropertyAdmissionDecisionMaterial,"admitted"|"grantId"|"grantVersion"|"decisionReason">;
const fields="tenant_id,property_id,store_id,operator_legal_entity_id,assignment_id,assignment_version,"+
 "access_mode::text access_mode,admitted,account_id,grant_id,grant_version,policy_version,authority_at,"+
 "decision_reason,decision_key_sha256,command_idempotency_sha256,decision_receipt_id,decision_sha256";
function material(r:Receipt):PropertyAdmissionDecisionMaterial{return{tenantId:r.tenant_id,propertyId:r.property_id,
 storeId:r.store_id,operatorLegalEntityId:r.operator_legal_entity_id,assignmentId:r.assignment_id,
 assignmentVersion:Number(r.assignment_version),accessMode:r.access_mode,admitted:r.admitted,accountId:r.account_id,
 grantId:r.grant_id,grantVersion:r.grant_version===null?null:Number(r.grant_version),policyVersion:r.policy_version,
 authorityAt:normalizePropertyAdmissionAuthorityAt(r.authority_at),decisionReason:r.decision_reason,
 decisionKeySha256:r.decision_key_sha256,commandIdempotencySha256:r.command_idempotency_sha256};}
function exact(r:Receipt,m:PropertyAdmissionDecisionMaterial){const sha=propertyAdmissionDecisionSha256(m);
 return r.decision_sha256===sha&&r.decision_receipt_id===propertyAdmissionDecisionReceiptId(sha)&&
  propertyAdmissionDecisionSha256(material(r))===sha;}
function result(r:Receipt):ClubsPropertyAdmissionDecision{const m=material(r);return{propertyId:m.propertyId,
 accessMode:m.accessMode,admitted:m.admitted,accountId:m.accountId,grantId:m.grantId,grantVersion:m.grantVersion,
 policyVersion:m.policyVersion,authorityAt:normalizePropertyAdmissionAuthorityAt(m.authorityAt),
 assignmentId:m.assignmentId,assignmentVersion:m.assignmentVersion,decisionKeySha256:m.decisionKeySha256,
 commandIdempotencySha256:m.commandIdempotencySha256,decisionReceiptId:r.decision_receipt_id,
 decisionSha256:r.decision_sha256};}
function replay(r:Receipt,b:ReplayBase,authorityExplicit:boolean){
 const p=material(r),at=authorityExplicit?b.authorityAt:p.authorityAt;
 if(p.tenantId!==b.tenantId||p.propertyId!==b.propertyId||p.storeId!==b.storeId||
  p.operatorLegalEntityId!==b.operatorLegalEntityId||p.assignmentId!==b.assignmentId||
  p.assignmentVersion!==b.assignmentVersion||p.accessMode!==b.accessMode||p.accountId!==b.accountId||
  p.policyVersion!==b.policyVersion||p.decisionKeySha256!==b.decisionKeySha256||
  p.commandIdempotencySha256!==b.commandIdempotencySha256||
  normalizePropertyAdmissionAuthorityAt(p.authorityAt)!==normalizePropertyAdmissionAuthorityAt(at)||!exact(r,p))
  throw new ClubsPropertyAdmissionAuthorityError();
 return result(r);
}
async function byDecision(c:Client,tenant:string,key:string){const q=await c.query<Receipt>("select "+fields+
 " from crays_core.clubs_property_admission_decision_receipts where tenant_id=$1 and decision_key_sha256=$2 limit 2",[tenant,key]);
 if(q.rows.length>1)throw new ClubsPropertyAdmissionAuthorityError();return q.rows[0]??null;}
async function byCommand(c:Client,b:ReplayBase){const q=await c.query<Receipt>("select "+fields+
 " from crays_core.clubs_property_admission_decision_receipts where tenant_id=$1 and property_id=$2 "+
 "and account_id is not distinct from $3 and command_idempotency_sha256=$4 limit 2",
 [b.tenantId,b.propertyId,b.accountId,b.commandIdempotencySha256]);
 if(q.rows.length>1)throw new ClubsPropertyAdmissionAuthorityError();return q.rows[0]??null;}
async function save(c:Client,m:PropertyAdmissionDecisionMaterial){
 const sha=propertyAdmissionDecisionSha256(m),id=propertyAdmissionDecisionReceiptId(sha),at=normalizePropertyAdmissionAuthorityAt(m.authorityAt);
 await c.query("insert into crays_core.clubs_property_admission_decision_receipts(decision_receipt_id,tenant_id,"+
  "property_id,store_id,operator_legal_entity_id,assignment_id,assignment_version,access_mode,admitted,account_id,"+
  "grant_id,grant_version,policy_version,authority_at,decision_reason,decision_key_sha256,command_idempotency_sha256,"+
  "decision_sha256)values($1,$2,$3,$4,$5,$6,$7,$8::crays_core.clubs_property_access_mode,$9,$10,$11,$12,$13,"+
  "$14::timestamptz,$15,$16,$17,$18)on conflict do nothing",
  [id,m.tenantId,m.propertyId,m.storeId,m.operatorLegalEntityId,m.assignmentId,m.assignmentVersion,m.accessMode,
   m.admitted,m.accountId,m.grantId,m.grantVersion,m.policyVersion,at,m.decisionReason,m.decisionKeySha256,
   m.commandIdempotencySha256,sha]);
 let row:Receipt|null=null;
 if(m.commandIdempotencySha256!==null)row=await byCommand(c,m);
 else if(m.decisionKeySha256!==null)row=await byDecision(c,m.tenantId,m.decisionKeySha256);
 else{const q=await c.query<Receipt>("select "+fields+
  " from crays_core.clubs_property_admission_decision_receipts where decision_receipt_id=$1",[id]);row=q.rows[0]??null;}
 if(!row||!exact(row,m))throw new ClubsPropertyAdmissionAuthorityError();return result(row);
}
export async function resolveClubsPropertyAdmission(c:Client,i:ResolveClubsPropertyAdmissionInput){
 if(!/^[A-Za-z0-9:_.-]{3,180}$/.test(i.propertyId)||i.accountId!==null&&!/^[A-Za-z0-9:_.-]{3,180}$/.test(i.accountId)||
  i.decisionKeySha256!==undefined&&!/^[a-f0-9]{64}$/.test(i.decisionKeySha256)||
  i.commandIdempotencySha256!==undefined&&!/^[a-f0-9]{64}$/.test(i.commandIdempotencySha256))
  throw new ClubsPropertyAdmissionAuthorityError();
 let at=i.authorityAt===undefined?null:normalizePropertyAdmissionAuthorityAt(i.authorityAt);
 if(at===null){const now=await c.query<{at:string}>("select crays_core.cpa38_time(transaction_timestamp()) at");
  if(!now.rows[0]?.at)throw new ClubsPropertyAdmissionAuthorityError();at=normalizePropertyAdmissionAuthorityAt(now.rows[0].at);}
 const q=await c.query<Scope>("select p.property_id,p.access_mode::text access_mode,p.admission_policy_version,p.store_id,"+
  "x.partner_tenant_id tenant_id,x.operator_legal_entity_id,x.assignment_id,x.version assignment_version "+
  "from crays_core.clubs_properties p join crays_core.stores s on s.store_id=p.store_id and s.vertical_root='clubs' and s.status='active' "+
  "join crays_core.store_operator_assignments x on x.store_id=p.store_id and x.vertical_root='clubs' and x.status='active' "+
  "and x.valid_from<=$2::timestamptz and(x.valid_until is null or x.valid_until>$2::timestamptz) "+
  "join crays_core.franchise_operator_tenants t on t.partner_tenant_id=x.partner_tenant_id and t.status='active' "+
  "join crays_core.operator_legal_entities l on l.legal_entity_id=x.operator_legal_entity_id and l.partner_tenant_id=x.partner_tenant_id and l.status='active' "+
  "where p.property_id=$1 and current_setting('crays.app_role',true)='core_service' "+
  "and x.partner_tenant_id=current_setting('crays.tenant_id',true) order by x.version desc limit 2",[i.propertyId,at]);
 if(q.rows.length!==1)throw new ClubsPropertyAdmissionAuthorityError();const x=q.rows[0]!;
 const base:ReplayBase={tenantId:x.tenant_id,propertyId:x.property_id,storeId:x.store_id,
  operatorLegalEntityId:x.operator_legal_entity_id,assignmentId:x.assignment_id,
  assignmentVersion:Number(x.assignment_version),accessMode:x.access_mode,accountId:i.accountId,
  policyVersion:x.admission_policy_version,authorityAt:at,decisionKeySha256:i.decisionKeySha256??null,
  commandIdempotencySha256:i.commandIdempotencySha256??null};
 if(base.commandIdempotencySha256!==null){const prior=await byCommand(c,base);
  if(prior)return replay(prior,base,i.authorityAt!==undefined);}
 if(base.decisionKeySha256!==null){const prior=await byDecision(c,x.tenant_id,base.decisionKeySha256);
  if(prior)return replay(prior,base,i.authorityAt!==undefined);}
 if(x.access_mode==="open")return save(c,{...base,admitted:true,grantId:null,grantVersion:null,decisionReason:"OPEN_ACCESS"});
 if(i.accountId===null)return save(c,{...base,admitted:false,grantId:null,grantVersion:null,decisionReason:"ACCOUNT_REQUIRED"});
 const g=await c.query<{grant_id:string;grant_version:number|string}>("with latest as(select distinct on(g.grant_id)g.* "+
  "from crays_core.clubs_property_admission_grants g join crays_core.crays_accounts a on a.account_id=g.account_id and a.status='active' "+
  "where g.tenant_id=$1 and g.property_id=$2 and g.account_id=$3 and g.store_id=$4 and g.operator_legal_entity_id=$5 "+
  "and g.assignment_id=$6 and g.assignment_version=$7 and g.policy_version=$8 and g.valid_from<=$9::timestamptz "+
  "order by g.grant_id,g.grant_version desc)select g.grant_id,g.grant_version from latest g "+
  "where(g.valid_until is null or g.valid_until>$9::timestamptz)and exists(select 1 from crays_core.clubs_property_admission_grant_events e "+
  "where e.grant_id=g.grant_id and e.grant_version=g.grant_version and e.event_type='GRANTED' and e.effective_at<=$9::timestamptz)"+
  "and not exists(select 1 from crays_core.clubs_property_admission_grant_events e where e.grant_id=g.grant_id "+
  "and e.grant_version=g.grant_version and e.event_type='REVOKED' and e.effective_at<=$9::timestamptz)order by g.grant_id limit 2",
  [x.tenant_id,x.property_id,i.accountId,x.store_id,x.operator_legal_entity_id,x.assignment_id,
   Number(x.assignment_version),x.admission_policy_version,at]);
 const one=g.rows.length===1?g.rows[0]!:null;
 return save(c,{...base,admitted:one!==null,grantId:one?.grant_id??null,grantVersion:one?Number(one.grant_version):null,
  decisionReason:one?"ACTIVE_GRANT":"GRANT_NOT_FOUND_OR_AMBIGUOUS"});
}
