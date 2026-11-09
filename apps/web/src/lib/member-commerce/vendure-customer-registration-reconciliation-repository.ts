import {createHash} from "node:crypto";
import {reconcileUnknownRegistration,type RegistrationClaim} from "./vendure-customer-registration-claim";
import type {RegistrationClaimDatabase} from "./vendure-customer-registration-claim-repository";
import {
 freezeCommand,verifyObservation,verifyResolution,type CommandInput,type FrozenCommand,
 type Observation,type Resolution,
} from "./vendure-customer-registration-reconciliation";
type Q=<R=Record<string,unknown>>(s:string,v?:readonly unknown[])=>Promise<{rows:R[]}>;
type ClaimRow=Readonly<{registration_claim_id:string;canonical_account_id:string;canonical_person_id:string;
 vertical_root:"clubs";partner_tenant_id:string;operator_legal_entity_id:string;
 vendure_deployment_cell_id:string;provider_binding_id:string;provider_binding_version:string|number;
 external_identifier_sha256:string;email_snapshot_sha256:string|null;idempotency_key:string;
 registration_command_sha256:string;claim_token_sha256:string;attempt:string|number;
 claim_state:RegistrationClaim["state"];vendure_customer_id:string|null;vendure_user_id:string|null;
 provider_version:string|null;provider_action_receipt_id:string|null;provider_receipt_sha256:string|null}>;
type CmdRow=Readonly<{reconciliation_command_id:string;tenant_id:string;registration_claim_id:string;
 canonical_account_id:string;canonical_person_id:string;vertical_root:"clubs";operator_legal_entity_id:string;
 provider_binding_id:string;provider_binding_version:string|number;vendure_deployment_cell_id:string;
 observed_attempt:string|number;registration_command_sha256:string;registration_idempotency_key:string;
 reconciliation_idempotency_key:string;authority_cell_sha256:string;command_sha256:string;
 execution_state:"PENDING"|"CLAIMED"|"OBSERVED"|"RESOLVED";status_attempt:string|number;
 owner_token_sha256:string|null;lease_expires_at:string|null;observation_id:string|null;created_at:string}>;
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
const iso=(v:Date|string)=>typeof v==="string"?v:v.toISOString();
const execSha=(id:string,cmd:string,attempt:number,prior:string,result:string,owner:string,
 lease:string|null,at:string)=>hash(["execution-v1",id,cmd,attempt,prior,result,owner,lease??"<null>",at].join("|"));
const claimFrom=(r:ClaimRow):RegistrationClaim=>Object.freeze({claimId:r.registration_claim_id,
 command:Object.freeze({canonicalAccountId:r.canonical_account_id,canonicalPersonId:r.canonical_person_id,
 verticalRoot:r.vertical_root,partnerTenantId:r.partner_tenant_id,operatorLegalEntityId:r.operator_legal_entity_id,
 deploymentCellId:r.vendure_deployment_cell_id,providerBindingId:r.provider_binding_id,
 providerBindingVersion:Number(r.provider_binding_version),externalIdentifierSha256:r.external_identifier_sha256,
 emailSnapshotSha256:r.email_snapshot_sha256,idempotencyKey:r.idempotency_key}),
 commandSha256:r.registration_command_sha256,claimTokenSha256:r.claim_token_sha256,
 attempt:Number(r.attempt),state:r.claim_state,
 ...(r.vendure_customer_id?{vendureCustomerId:r.vendure_customer_id}:{}),
 ...(r.vendure_user_id?{vendureUserId:r.vendure_user_id}:{}),
 ...(r.provider_version?{providerVersion:r.provider_version}:{}),
 ...(r.provider_action_receipt_id?{providerActionReceiptId:r.provider_action_receipt_id}:{}),
 ...(r.provider_receipt_sha256?{providerReceiptSha256:r.provider_receipt_sha256}:{})});
const commandFrom=(r:CmdRow):FrozenCommand=>Object.freeze({reconciliationCommandId:r.reconciliation_command_id,
 registrationClaimId:r.registration_claim_id,canonicalAccountId:r.canonical_account_id,
 canonicalPersonId:r.canonical_person_id,verticalRoot:r.vertical_root,tenantId:r.tenant_id,
 operatorLegalEntityId:r.operator_legal_entity_id,providerBindingId:r.provider_binding_id,
 providerBindingVersion:Number(r.provider_binding_version),deploymentCellId:r.vendure_deployment_cell_id,
 observedAttempt:Number(r.observed_attempt),registrationCommandSha256:r.registration_command_sha256,
 registrationIdempotencyKey:r.registration_idempotency_key,
 reconciliationIdempotencyKey:r.reconciliation_idempotency_key,createdAt:iso(r.created_at),
 authorityCellSha256:r.authority_cell_sha256,commandSha256:r.command_sha256});
async function scoped<T>(db:RegistrationClaimDatabase,tenant:string,fn:(q:Q)=>Promise<T>){
 return db.transaction(async({query})=>{await query("set transaction isolation level serializable");
  await query("select set_config('crays.app_role','core_service',true)");
  await query("select set_config('crays.tenant_id',$1,true)",[tenant]);return fn(query);});
}
async function loadClaim(q:Q,id:string){const r=(await q<ClaimRow>(
 "select * from crays_core.vendure_customer_registration_claims where registration_claim_id=$1 for update",[id])).rows[0];
 if(!r)throw new Error("VCRC_V37_CLAIM_NOT_FOUND");return r;}
async function executionReceipt(q:Q,tenant:string,cmd:string,attempt:number,prior:string,
 result:"CLAIMED"|"OBSERVED"|"RESOLVED",owner:string,lease:string|null,at:string){
 const id="vcrxe_"+hash(["execution-id-v1",cmd,attempt,result].join("|")).slice(0,40);
 await q("insert into crays_core.vendure_customer_registration_reconciliation_execution_receipts(execution_receipt_id,tenant_id,reconciliation_command_id,status_attempt,prior_state,resulting_state,owner_token_sha256,lease_expires_at,receipt_sha256,observed_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
 [id,tenant,cmd,attempt,prior,result,owner,lease,execSha(id,cmd,attempt,prior,result,owner,lease,at),at]);
}
export async function persistVendureCustomerRegistrationReconciliationCommand(
 db:RegistrationClaimDatabase,input:CommandInput){
 const cmd=freezeCommand(input);return scoped(db,cmd.tenantId,async q=>{
  const prior=(await q<CmdRow>("select * from crays_core.vendure_customer_registration_reconciliation_commands where tenant_id=$1 and reconciliation_idempotency_key=$2 for update",
   [cmd.tenantId,cmd.reconciliationIdempotencyKey])).rows[0];
  if(prior){if(commandFrom(prior).commandSha256!==cmd.commandSha256)
    throw new Error("VCRC_V37_COMMAND_REPLAY_MISMATCH");
   return Object.freeze({command:cmd,state:prior.execution_state,replayed:true as const});}
  const c=await loadClaim(q,cmd.registrationClaimId);
  if(c.claim_state!=="UNKNOWN"||Number(c.attempt)!==cmd.observedAttempt
   ||c.registration_command_sha256!==cmd.registrationCommandSha256
   ||c.canonical_account_id!==cmd.canonicalAccountId||c.canonical_person_id!==cmd.canonicalPersonId
   ||c.partner_tenant_id!==cmd.tenantId||c.operator_legal_entity_id!==cmd.operatorLegalEntityId
   ||c.provider_binding_id!==cmd.providerBindingId||Number(c.provider_binding_version)!==cmd.providerBindingVersion
   ||c.vendure_deployment_cell_id!==cmd.deploymentCellId||c.idempotency_key!==cmd.registrationIdempotencyKey)
   throw new Error("VCRC_V37_COMMAND_SCOPE_MISMATCH");
  await q("insert into crays_core.vendure_customer_registration_reconciliation_commands(reconciliation_command_id,tenant_id,registration_claim_id,canonical_account_id,canonical_person_id,vertical_root,operator_legal_entity_id,provider_binding_id,provider_binding_version,vendure_deployment_cell_id,observed_attempt,registration_command_sha256,registration_idempotency_key,reconciliation_idempotency_key,authority_cell_sha256,command_sha256,created_at) values($1,$2,$3,$4,$5,'clubs',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
   [cmd.reconciliationCommandId,cmd.tenantId,cmd.registrationClaimId,cmd.canonicalAccountId,
    cmd.canonicalPersonId,cmd.operatorLegalEntityId,cmd.providerBindingId,cmd.providerBindingVersion,
    cmd.deploymentCellId,cmd.observedAttempt,cmd.registrationCommandSha256,
    cmd.registrationIdempotencyKey,cmd.reconciliationIdempotencyKey,cmd.authorityCellSha256,
    cmd.commandSha256,cmd.createdAt]);
  return Object.freeze({command:cmd,state:"PENDING" as const,replayed:false as const});});
}
export async function claimVendureCustomerRegistrationReconciliationExecution(
 db:RegistrationClaimDatabase,input:Readonly<{tenantId:string;reconciliationCommandId:string;
 ownerTokenSha256:string;now:Date;leaseExpiresAt:Date}>){
 if(!/^[a-f0-9]{64}$/.test(input.ownerTokenSha256)||input.leaseExpiresAt<=input.now)
  throw new Error("VCRC_V37_EXECUTION_CLAIM_INVALID");
 return scoped(db,input.tenantId,async q=>{
  const r=(await q<CmdRow>("select * from crays_core.vendure_customer_registration_reconciliation_commands where tenant_id=$1 and reconciliation_command_id=$2 for update",
   [input.tenantId,input.reconciliationCommandId])).rows[0];
  if(!r)throw new Error("VCRC_V37_COMMAND_NOT_FOUND");
  if(r.execution_state==="RESOLVED"||r.execution_state==="OBSERVED")
   return Object.freeze({command:commandFrom(r),state:r.execution_state,statusAttempt:Number(r.status_attempt),
    statusTransportRequired:false as const,replayed:true as const});
  const now=input.now.toISOString();
  if(r.execution_state==="CLAIMED"&&Date.parse(String(r.lease_expires_at))>input.now.getTime())
   return Object.freeze({command:commandFrom(r),state:"CLAIMED" as const,statusAttempt:Number(r.status_attempt),
    statusTransportRequired:false as const,replayed:true as const});
  const attempt=Number(r.status_attempt)+1,prior=r.execution_state;
  await q("update crays_core.vendure_customer_registration_reconciliation_commands set execution_state='CLAIMED',status_attempt=$1,owner_token_sha256=$2,lease_expires_at=$3 where tenant_id=$4 and reconciliation_command_id=$5",
   [attempt,input.ownerTokenSha256,input.leaseExpiresAt.toISOString(),input.tenantId,input.reconciliationCommandId]);
  await executionReceipt(q,input.tenantId,input.reconciliationCommandId,attempt,prior,"CLAIMED",
   input.ownerTokenSha256,input.leaseExpiresAt.toISOString(),now);
  return Object.freeze({command:commandFrom({...r,status_attempt:attempt,
   owner_token_sha256:input.ownerTokenSha256,lease_expires_at:input.leaseExpiresAt.toISOString(),
   execution_state:"CLAIMED"}),state:"CLAIMED" as const,statusAttempt:attempt,
   statusTransportRequired:true as const,replayed:false as const});});
}
export async function persistVendureCustomerRegistrationReconciliationObservation(
 db:RegistrationClaimDatabase,input:Readonly<{tenantId:string;command:FrozenCommand;observation:Observation}>){
 const o=verifyObservation(input.command,input.observation);return scoped(db,input.tenantId,async q=>{
  const prior=(await q<{observation_sha256:string}>(
   "select observation_sha256 from crays_core.vendure_customer_registration_reconciliation_observations where tenant_id=$1 and reconciliation_command_id=$2 and status_attempt=$3",
   [input.tenantId,input.command.reconciliationCommandId,o.statusAttempt])).rows[0];
  if(prior){if(prior.observation_sha256!==o.observationSha256)throw new Error("VCRC_V37_OBSERVATION_REPLAY_MISMATCH");
   return Object.freeze({observation:o,replayed:true as const});}
  const r=(await q<CmdRow>("select * from crays_core.vendure_customer_registration_reconciliation_commands where tenant_id=$1 and reconciliation_command_id=$2 for update",
   [input.tenantId,input.command.reconciliationCommandId])).rows[0];
  const c=await loadClaim(q,input.command.registrationClaimId);
  if(!r||r.execution_state!=="CLAIMED"||Number(r.status_attempt)!==o.statusAttempt
   ||r.owner_token_sha256!==o.ownerTokenSha256||r.command_sha256!==o.commandSha256
   ||c.claim_state!=="UNKNOWN"||Number(c.attempt)!==input.command.observedAttempt
   ||c.registration_command_sha256!==input.command.registrationCommandSha256)
   throw new Error("VCRC_V37_OBSERVATION_SCOPE_MISMATCH");
  const p=o.statusProof;
  await q("insert into crays_core.vendure_customer_registration_reconciliation_observations(observation_id,tenant_id,reconciliation_command_id,registration_claim_id,status_attempt,owner_token_sha256,command_sha256,observation_outcome,observed_provider_state,status_provider,status_provider_version,status_request_receipt_id,status_response_sha256,queried_idempotency_key,status_authority_cell_sha256,vendure_customer_id,vendure_user_id,provider_version,provider_action_receipt_id,provider_receipt_sha256,observation_sha256,observed_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$22)",
   [o.observationId,input.tenantId,o.reconciliationCommandId,o.registrationClaimId,o.statusAttempt,
    o.ownerTokenSha256,o.commandSha256,o.outcome,o.observedProviderState,p.statusProvider,
    p.statusProviderVersion,p.statusRequestReceiptId,p.statusResponseSha256,p.queriedIdempotencyKey,
    p.statusAuthorityCellSha256,o.vendureCustomerId,o.vendureUserId,o.providerVersion,
    o.providerActionReceiptId,o.providerReceiptSha256,o.observationSha256,o.observedAt]);
  await q("update crays_core.vendure_customer_registration_reconciliation_commands set execution_state='OBSERVED',lease_expires_at=null,observation_id=$1,observed_at=$2 where tenant_id=$3 and reconciliation_command_id=$4",
   [o.observationId,o.observedAt,input.tenantId,o.reconciliationCommandId]);
  await executionReceipt(q,input.tenantId,o.reconciliationCommandId,o.statusAttempt,"CLAIMED","OBSERVED",
   o.ownerTokenSha256,null,o.observedAt);
  return Object.freeze({observation:o,replayed:false as const});});
}
export async function persistVendureCustomerRegistrationReconciliationResolution(
 db:RegistrationClaimDatabase,input:Readonly<{command:FrozenCommand;resolution:Resolution}>){
 const r=verifyResolution(input.command,input.resolution);return scoped(db,r.tenantId,async q=>{
  const prior=(await q<{resolution_sha256:string}>(
   "select resolution_sha256 from crays_core.vendure_customer_registration_reconciliation_resolutions where tenant_id=$1 and reconciliation_command_id=$2",
   [r.tenantId,r.reconciliationCommandId])).rows[0];
  if(prior){if(prior.resolution_sha256!==r.resolutionSha256)throw new Error("VCRC_V37_RESOLUTION_REPLAY_MISMATCH");
   return Object.freeze({resolution:r,replayed:true as const});}
  const cmd=(await q<CmdRow>("select * from crays_core.vendure_customer_registration_reconciliation_commands where tenant_id=$1 and reconciliation_command_id=$2 for update",
   [r.tenantId,r.reconciliationCommandId])).rows[0];
  const row=await loadClaim(q,r.registrationClaimId),claim=claimFrom(row);
  if(!cmd||cmd.execution_state!=="OBSERVED"||cmd.observation_id!==r.observationId
   ||row.claim_state!=="UNKNOWN"||Number(row.attempt)!==input.command.observedAttempt
   ||row.registration_command_sha256!==input.command.registrationCommandSha256
   ||row.canonical_account_id!==input.command.canonicalAccountId
   ||row.canonical_person_id!==input.command.canonicalPersonId
   ||row.partner_tenant_id!==input.command.tenantId
   ||row.operator_legal_entity_id!==input.command.operatorLegalEntityId
   ||row.provider_binding_id!==input.command.providerBindingId
   ||Number(row.provider_binding_version)!==input.command.providerBindingVersion
   ||row.vendure_deployment_cell_id!==input.command.deploymentCellId)
   throw new Error("VCRC_V37_RESOLUTION_SCOPE_MISMATCH");
  const p=r.statusProof;
  await q("insert into crays_core.vendure_customer_registration_reconciliation_resolutions(resolution_receipt_id,tenant_id,reconciliation_command_id,observation_id,registration_claim_id,status_attempt,command_sha256,observation_sha256,observation_outcome,prior_claim_state,target_claim_state,status_provider,status_provider_version,status_request_receipt_id,status_response_sha256,queried_idempotency_key,status_authority_cell_sha256,observed_provider_state,vendure_customer_id,vendure_user_id,provider_version,provider_action_receipt_id,provider_receipt_sha256,resolution_sha256,resolved_at,created_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'UNKNOWN',$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$24)",
   [r.resolutionReceiptId,r.tenantId,r.reconciliationCommandId,r.observationId,r.registrationClaimId,
    r.statusAttempt,r.commandSha256,r.observationSha256,r.observationOutcome,r.targetClaimState,
    p.statusProvider,p.statusProviderVersion,p.statusRequestReceiptId,p.statusResponseSha256,
    p.queriedIdempotencyKey,p.statusAuthorityCellSha256,r.observedProviderState,
    r.vendureCustomerId,r.vendureUserId,r.providerVersion,r.providerActionReceiptId,
    r.providerReceiptSha256,r.resolutionSha256,r.resolvedAt]);
  let target:RegistrationClaim=claim;
  if(r.observationOutcome==="PROVEN_NOT_APPLIED")
   target=reconcileUnknownRegistration(claim,{result:"PROVEN_NOT_APPLIED"});
  else if(r.observationOutcome==="PROVEN_APPLIED")
   target=reconcileUnknownRegistration(claim,{result:"PROVEN_APPLIED",
    vendureCustomerId:r.vendureCustomerId??undefined,vendureUserId:r.vendureUserId??undefined,
    providerVersion:r.providerVersion??undefined,providerActionReceiptId:r.providerActionReceiptId??undefined,
    providerReceiptSha256:r.providerReceiptSha256??undefined});
  if(target.state!==r.targetClaimState)throw new Error("VCRC_V37_TRANSITION_MISMATCH");
  if(r.targetClaimState!=="UNKNOWN")await q("update crays_core.vendure_customer_registration_claims set claim_state=$1,vendure_customer_id=$2,vendure_user_id=$3,provider_version=$4,provider_action_receipt_id=$5,provider_receipt_sha256=$6,reconciliation_receipt_sha256=$7,resolved_at=$8,updated_at=$8 where registration_claim_id=$9",
   [target.state,target.vendureCustomerId??null,target.vendureUserId??null,target.providerVersion??null,
    target.providerActionReceiptId??null,target.providerReceiptSha256??null,r.resolutionSha256,
    r.resolvedAt,r.registrationClaimId]);
  const body={claimId:r.registrationClaimId,attempt:input.command.observedAttempt,prior:"UNKNOWN",
   result:r.targetClaimState,commandSha256:input.command.registrationCommandSha256,observedAt:r.resolvedAt};
  const receiptSha=hash(JSON.stringify(body));
  await q("insert into crays_core.vendure_customer_registration_claim_receipts(registration_claim_receipt_id,registration_claim_id,attempt,prior_state,resulting_state,registration_command_sha256,receipt_sha256,observed_at) values($1,$2,$3,'UNKNOWN',$4,$5,$6,$7)",
   ["vcrcr_"+receiptSha.slice(0,40),r.registrationClaimId,input.command.observedAttempt,
    r.targetClaimState,input.command.registrationCommandSha256,receiptSha,r.resolvedAt]);
  await q("update crays_core.vendure_customer_registration_reconciliation_commands set execution_state='RESOLVED',resolved_at=$1 where tenant_id=$2 and reconciliation_command_id=$3",
   [r.resolvedAt,r.tenantId,r.reconciliationCommandId]);
  await executionReceipt(q,r.tenantId,r.reconciliationCommandId,r.statusAttempt,"OBSERVED","RESOLVED",
   cmd.owner_token_sha256??"",null,r.resolvedAt);
  return Object.freeze({resolution:r,replayed:false as const});});
}
