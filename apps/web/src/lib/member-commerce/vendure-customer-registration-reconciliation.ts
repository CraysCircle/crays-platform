import {createHash} from "node:crypto";
const H=/^[a-f0-9]{64}$/,I=/^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const sha=(parts:readonly(string|number|null)[])=>createHash("sha256").update(parts.map(v=>v===null?"<null>":String(v)).join("|")).digest("hex");
const date=(v:string)=>Number.isFinite(Date.parse(v));
export type ReconciliationOutcome="STILL_UNKNOWN"|"PROVEN_NOT_APPLIED"|"PROVEN_APPLIED";
export type CommandInput=Readonly<{reconciliationCommandId:string;registrationClaimId:string;
 canonicalAccountId:string;canonicalPersonId:string;verticalRoot:"clubs";tenantId:string;
 operatorLegalEntityId:string;providerBindingId:string;providerBindingVersion:number;
 deploymentCellId:string;observedAttempt:number;registrationCommandSha256:string;
 registrationIdempotencyKey:string;reconciliationIdempotencyKey:string;createdAt:string}>;
export type FrozenCommand=CommandInput&Readonly<{authorityCellSha256:string;commandSha256:string}>;
export type Execution=Readonly<{ownerTokenSha256:string;statusAttempt:number}>;
export type StatusProof=Readonly<{statusProvider:string;statusProviderVersion:string;
 statusRequestReceiptId:string;statusResponseSha256:string;queriedIdempotencyKey:string;
 statusAuthorityCellSha256:string}>;
export type Observation=Readonly<{observationId:string;reconciliationCommandId:string;
 registrationClaimId:string;statusAttempt:number;ownerTokenSha256:string;commandSha256:string;
 outcome:ReconciliationOutcome;observedProviderState:"STATUS_INCONCLUSIVE"|"IDEMPOTENCY_KEY_ABSENT"|"CUSTOMER_PRESENT";
 statusProof:StatusProof;vendureCustomerId:string|null;vendureUserId:string|null;
 providerVersion:string|null;providerActionReceiptId:string|null;providerReceiptSha256:string|null;
 observedAt:string;observationSha256:string}>;
export type Resolution=Readonly<{resolutionReceiptId:string;tenantId:string;
 reconciliationCommandId:string;observationId:string;registrationClaimId:string;statusAttempt:number;
 commandSha256:string;observationSha256:string;observationOutcome:ReconciliationOutcome;
 priorClaimState:"UNKNOWN";targetClaimState:"UNKNOWN"|"PROVEN_NOT_APPLIED"|"PROVEN_APPLIED";
 observedProviderState:"STATUS_INCONCLUSIVE"|"IDEMPOTENCY_KEY_ABSENT"|"CUSTOMER_PRESENT";
 statusProof:StatusProof;vendureCustomerId:string|null;vendureUserId:string|null;
 providerVersion:string|null;providerActionReceiptId:string|null;providerReceiptSha256:string|null;
 resolvedAt:string;resolutionSha256:string}>;
export type StatusTransport=(command:FrozenCommand,execution:Execution)=>Promise<Observation>;
const authorityParts=(x:CommandInput)=>["authority-v1",x.canonicalAccountId,x.canonicalPersonId,
 x.verticalRoot,x.tenantId,x.operatorLegalEntityId,x.providerBindingId,x.providerBindingVersion,
 x.deploymentCellId,x.observedAttempt,x.registrationCommandSha256,x.registrationIdempotencyKey] as const;
export const authorityCellSha256=(x:CommandInput)=>sha(authorityParts(x));
const commandParts=(x:CommandInput,a:string)=>["command-v1",x.reconciliationCommandId,
 x.registrationClaimId,x.canonicalAccountId,x.canonicalPersonId,x.verticalRoot,x.tenantId,
 x.operatorLegalEntityId,x.providerBindingId,x.providerBindingVersion,x.deploymentCellId,
 x.observedAttempt,x.registrationCommandSha256,x.registrationIdempotencyKey,
 x.reconciliationIdempotencyKey,a,x.createdAt] as const;
export function freezeCommand(x:CommandInput):FrozenCommand{
 const ids=[x.reconciliationCommandId,x.registrationClaimId,x.canonicalAccountId,x.canonicalPersonId,
  x.tenantId,x.operatorLegalEntityId,x.providerBindingId,x.deploymentCellId,
  x.registrationIdempotencyKey,x.reconciliationIdempotencyKey];
 if(ids.some(v=>!I.test(v))||x.verticalRoot!=="clubs"||!Number.isSafeInteger(x.providerBindingVersion)
  ||x.providerBindingVersion<1||!Number.isSafeInteger(x.observedAttempt)||x.observedAttempt<1
  ||!H.test(x.registrationCommandSha256)||!date(x.createdAt))throw new Error("VCRC_V37_COMMAND_INVALID");
 const fixed:CommandInput={reconciliationCommandId:x.reconciliationCommandId,
  registrationClaimId:x.registrationClaimId,canonicalAccountId:x.canonicalAccountId,
  canonicalPersonId:x.canonicalPersonId,verticalRoot:"clubs",tenantId:x.tenantId,
  operatorLegalEntityId:x.operatorLegalEntityId,providerBindingId:x.providerBindingId,
  providerBindingVersion:x.providerBindingVersion,deploymentCellId:x.deploymentCellId,
  observedAttempt:x.observedAttempt,registrationCommandSha256:x.registrationCommandSha256,
  registrationIdempotencyKey:x.registrationIdempotencyKey,
  reconciliationIdempotencyKey:x.reconciliationIdempotencyKey,createdAt:x.createdAt};
 const authorityCellSha256=sha(authorityParts(fixed));
 return Object.freeze({...fixed,authorityCellSha256,commandSha256:sha(commandParts(fixed,authorityCellSha256))});
}
export function ownerTokenSha256(command:FrozenCommand,ownerId:string,nonce:string){
 if(!I.test(ownerId)||!I.test(nonce))throw new Error("VCRC_V37_OWNER_TOKEN_INVALID");
 return sha(["owner-v1",command.commandSha256,ownerId,nonce]);
}
const expectedState=(o:ReconciliationOutcome):Observation["observedProviderState"]=>o==="STILL_UNKNOWN"?"STATUS_INCONCLUSIVE":
 o==="PROVEN_NOT_APPLIED"?"IDEMPOTENCY_KEY_ABSENT":"CUSTOMER_PRESENT";
const observationParts=(o:Omit<Observation,"observationSha256">)=>["observation-v1",
 o.observationId,o.reconciliationCommandId,o.registrationClaimId,o.statusAttempt,o.ownerTokenSha256,
 o.commandSha256,o.outcome,o.observedProviderState,o.statusProof.statusProvider,
 o.statusProof.statusProviderVersion,o.statusProof.statusRequestReceiptId,
 o.statusProof.statusResponseSha256,o.statusProof.queriedIdempotencyKey,
 o.statusProof.statusAuthorityCellSha256,o.vendureCustomerId,o.vendureUserId,o.providerVersion,
 o.providerActionReceiptId,o.providerReceiptSha256,o.observedAt] as const;
export function verifyObservation(command:FrozenCommand,o:Observation){
 const proof=o.statusProof,auth=[o.vendureCustomerId,o.vendureUserId,o.providerVersion,
  o.providerActionReceiptId,o.providerReceiptSha256];
 if(o.reconciliationCommandId!==command.reconciliationCommandId
  ||o.registrationClaimId!==command.registrationClaimId||o.commandSha256!==command.commandSha256
  ||!I.test(o.observationId)||!Number.isSafeInteger(o.statusAttempt)||o.statusAttempt<1
  ||!H.test(o.ownerTokenSha256)||o.observedProviderState!==expectedState(o.outcome)
  ||[proof.statusProvider,proof.statusProviderVersion,proof.statusRequestReceiptId].some(v=>!I.test(v))
  ||!H.test(proof.statusResponseSha256)||proof.queriedIdempotencyKey!==command.registrationIdempotencyKey
  ||proof.statusAuthorityCellSha256!==command.authorityCellSha256||!date(o.observedAt))
  throw new Error("VCRC_V37_OBSERVATION_SCOPE_OR_PROOF_INVALID");
 if(o.outcome==="PROVEN_APPLIED"){
  if(auth.slice(0,4).some(v=>v===null||!I.test(v))||o.providerReceiptSha256===null||!H.test(o.providerReceiptSha256))
   throw new Error("VCRC_V37_APPLIED_AUTHORITY_INVALID");
 }else if(auth.some(v=>v!==null))throw new Error("VCRC_V37_NON_APPLIED_AUTHORITY_FORBIDDEN");
 const {observationSha256,...body}=o;
 if(sha(observationParts(body))!==observationSha256)throw new Error("VCRC_V37_OBSERVATION_DIGEST_MISMATCH");
 return Object.freeze(o);
}
export function deterministicStatusTransport(config:Readonly<{outcome:ReconciliationOutcome;
 statusProvider:string;statusProviderVersion:string;statusRequestReceiptId:string;
 statusResponseSha256:string;observedAt:string;vendureCustomerId?:string;vendureUserId?:string;
 providerVersion?:string;providerActionReceiptId?:string;providerReceiptSha256?:string;
 onQuery?:()=>void}>):StatusTransport{
 return async(command,execution)=>{
  config.onQuery?.();
  const base={observationId:"vcrco_"+sha(["observation-id-v1",command.commandSha256,
    execution.statusAttempt,config.statusRequestReceiptId]).slice(0,40),
   reconciliationCommandId:command.reconciliationCommandId,registrationClaimId:command.registrationClaimId,
   statusAttempt:execution.statusAttempt,ownerTokenSha256:execution.ownerTokenSha256,
   commandSha256:command.commandSha256,outcome:config.outcome,
   observedProviderState:expectedState(config.outcome),statusProof:{statusProvider:config.statusProvider,
    statusProviderVersion:config.statusProviderVersion,statusRequestReceiptId:config.statusRequestReceiptId,
    statusResponseSha256:config.statusResponseSha256,
    queriedIdempotencyKey:command.registrationIdempotencyKey,
    statusAuthorityCellSha256:command.authorityCellSha256},
   vendureCustomerId:config.vendureCustomerId??null,vendureUserId:config.vendureUserId??null,
   providerVersion:config.providerVersion??null,providerActionReceiptId:config.providerActionReceiptId??null,
   providerReceiptSha256:config.providerReceiptSha256??null,observedAt:config.observedAt};
  return verifyObservation(command,Object.freeze({...base,observationSha256:sha(observationParts(base))}));
 };
}
const resolutionParts=(r:Omit<Resolution,"resolutionSha256">)=>["resolution-v1",
 r.resolutionReceiptId,r.reconciliationCommandId,r.observationId,r.registrationClaimId,
 r.statusAttempt,r.commandSha256,r.observationSha256,r.observationOutcome,r.targetClaimState,
 r.observedProviderState,r.statusProof.statusProvider,r.statusProof.statusProviderVersion,
 r.statusProof.statusRequestReceiptId,r.statusProof.statusResponseSha256,
 r.statusProof.queriedIdempotencyKey,r.statusProof.statusAuthorityCellSha256,
 r.vendureCustomerId,r.vendureUserId,r.providerVersion,r.providerActionReceiptId,
 r.providerReceiptSha256,r.resolvedAt] as const;
export function createResolution(command:FrozenCommand,o:Observation):Resolution{
 verifyObservation(command,o);const targetClaimState:Resolution["targetClaimState"]=o.outcome==="STILL_UNKNOWN"?"UNKNOWN":o.outcome;
 const base={resolutionReceiptId:"vcrrr_"+sha(["resolution-id-v1",o.observationSha256]).slice(0,40),
  tenantId:command.tenantId,reconciliationCommandId:command.reconciliationCommandId,
  observationId:o.observationId,registrationClaimId:command.registrationClaimId,
  statusAttempt:o.statusAttempt,commandSha256:command.commandSha256,
  observationSha256:o.observationSha256,observationOutcome:o.outcome,
  priorClaimState:"UNKNOWN" as const,targetClaimState,observedProviderState:o.observedProviderState,
  statusProof:o.statusProof,vendureCustomerId:o.vendureCustomerId,vendureUserId:o.vendureUserId,
  providerVersion:o.providerVersion,providerActionReceiptId:o.providerActionReceiptId,
  providerReceiptSha256:o.providerReceiptSha256,resolvedAt:o.observedAt};
 return verifyResolution(command,Object.freeze({...base,resolutionSha256:sha(resolutionParts(base))}));
}
export function verifyResolution(command:FrozenCommand,r:Resolution){
 const target=r.observationOutcome==="STILL_UNKNOWN"?"UNKNOWN":r.observationOutcome;
 const auth=[r.vendureCustomerId,r.vendureUserId,r.providerVersion,
  r.providerActionReceiptId,r.providerReceiptSha256];
 if(!I.test(r.resolutionReceiptId)||r.tenantId!==command.tenantId
  ||r.reconciliationCommandId!==command.reconciliationCommandId
  ||r.registrationClaimId!==command.registrationClaimId||!I.test(r.observationId)
  ||!Number.isSafeInteger(r.statusAttempt)||r.statusAttempt<1||r.commandSha256!==command.commandSha256
  ||!H.test(r.observationSha256)||r.priorClaimState!=="UNKNOWN"||r.targetClaimState!==target
  ||[r.statusProof.statusProvider,r.statusProof.statusProviderVersion,
    r.statusProof.statusRequestReceiptId].some(v=>!I.test(v))
  ||!H.test(r.statusProof.statusResponseSha256)
  ||r.statusProof.queriedIdempotencyKey!==command.registrationIdempotencyKey
  ||r.statusProof.statusAuthorityCellSha256!==command.authorityCellSha256
  ||r.observedProviderState!==expectedState(r.observationOutcome)||!date(r.resolvedAt))
  throw new Error("VCRC_V37_RESOLUTION_SCOPE_OR_PROOF_INVALID");
 if(r.observationOutcome==="PROVEN_APPLIED"){
  if(auth.slice(0,4).some(v=>v===null||!I.test(v))
    ||r.providerReceiptSha256===null||!H.test(r.providerReceiptSha256))
   throw new Error("VCRC_V37_RESOLUTION_APPLIED_AUTHORITY_INVALID");
 }else if(auth.some(v=>v!==null)){
  throw new Error("VCRC_V37_RESOLUTION_NON_APPLIED_AUTHORITY_FORBIDDEN");
 }
 const {resolutionSha256,...body}=r;
 if(sha(resolutionParts(body))!==resolutionSha256)throw new Error("VCRC_V37_RESOLUTION_DIGEST_MISMATCH");
 return Object.freeze(r);
}
