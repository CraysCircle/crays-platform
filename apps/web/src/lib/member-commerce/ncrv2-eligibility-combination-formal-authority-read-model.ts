import "server-only";

interface QueryResult<R = Record<string, unknown>> { rows: R[]; }
interface Client { query<R = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<R>>; release(): void; }
export interface Ncrv2EligibilityAuthorityReadPool { connect(): Promise<Client>; }
type Row = Record<string, unknown>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,SHA256=/^[a-f0-9]{64}$/;
function required(condition:unknown,code:string):asserts condition{if(!condition)throw new Error(code);}
const iso=(value:unknown,field:string)=>{const parsed=value instanceof Date?value:new Date(String(value));required(Number.isFinite(parsed.getTime()),`NCRV2_AUTHORITY_READ_INVALID_TIME:${field}`);return parsed.toISOString();};

export type Ncrv2EligibilityAuthorityBlocker=
  | "ELIGIBILITY_COMBINATION_BINDING_MISSING"
  | "ELIGIBILITY_COMBINATION_BINDING_INVALID"
  | "ELIGIBILITY_COMBINATION_BINDING_EXPIRED"
  | "ELIGIBILITY_COMBINATION_LINEAGE_MISMATCH"
  | "FORMAL_AUTHORITY_DECISION_MISSING"
  | "FORMAL_AUTHORITY_NOT_ELIGIBLE"
  | "FORMAL_ACTION_NOT_EXECUTED";

export interface Ncrv2EligibilityAuthorityReadModel {
  status:
    | "BLOCKED"
    | "REAL_EVIDENCE_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY"
    | "FORMAL_AUTHORITY_ELIGIBLE_AWAITING_SEPARATE_ATOMIC_CONSUMPTION";
  blockers: readonly Ncrv2EligibilityAuthorityBlocker[];
  tenantId:string;
  packageId:string;
  gateEvaluationId:string;
  evaluationScopeSha256:string;
  binding:{present:boolean;bindingReceiptId:string|null;eligibilityReceiptId:string|null;evidenceCombinationReceiptId:string|null;current:boolean;validatedEvidenceSlots:0|14};
  formalAuthority:{decisionPresent:boolean;decisionReceiptId:string|null;eligibleForSeparateAtomicConsumption:boolean;authorityConsumed:false};
  formalTruth:{clubsCompleted:60;clubsTotal:120;clubsPercent:50;ncrv2Satisfied:0;ncrv2Total:14;cclub061:"ACTIVE_BLOCKED";cclub063:"NOT_FORMALLY_ACTIVATED";formalActionPerformed:false;formalStatusUnchanged:true};
}

export async function readNcrv2EligibilityCombinationFormalAuthorityStatus(
  pool:Ncrv2EligibilityAuthorityReadPool,
  key:{tenantId:string;packageId:string;gateEvaluationId:string;evaluationScopeSha256:string;observedAt:string},
):Promise<Ncrv2EligibilityAuthorityReadModel>{
  required(UUID.test(key.tenantId),"NCRV2_AUTHORITY_READ_INVALID_TENANT");
  required(UUID.test(key.packageId),"NCRV2_AUTHORITY_READ_INVALID_PACKAGE");
  required(UUID.test(key.gateEvaluationId),"NCRV2_AUTHORITY_READ_INVALID_GATE");
  required(SHA256.test(key.evaluationScopeSha256),"NCRV2_AUTHORITY_READ_INVALID_SCOPE_HASH");
  const observedAt=iso(key.observedAt,"observedAt"),client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id',$1,true)",[key.tenantId]);
    const binding=(await client.query<Row>('SELECT * FROM "CraysClubNcrv2EligibilityRealEvidenceCombinationBindingReceipt" WHERE "tenant_id"=$1 AND "package_id"=$2 AND "evaluation_scope_sha256"=$3 ORDER BY "created_at" DESC LIMIT 1',[key.tenantId,key.packageId,key.evaluationScopeSha256])).rows[0]??null;
    const eligibility=binding?(await client.query<Row>('SELECT * FROM "CraysClubNcrv2PrerequisiteCombinationEligibilityReceipt" WHERE "tenant_id"=$1 AND "id"=$2',[key.tenantId,String(binding.eligibility_receipt_id)])).rows[0]??null:null;
    const combination=binding?(await client.query<Row>('SELECT * FROM "CraysClubNcrv2RealEvidenceCombinationReceipt" WHERE "tenant_id"=$1 AND "id"=$2',[key.tenantId,String(binding.evidence_combination_receipt_id)])).rows[0]??null:null;
    const authority=(await client.query<Row>('SELECT * FROM "CraysClubNcrv2FormalAuthorityDecisionReceipt" WHERE "tenant_id"=$1 AND "evaluation_scope_sha256"=$2 ORDER BY "created_at" DESC LIMIT 1',[key.tenantId,key.evaluationScopeSha256])).rows[0]??null;
    const blockers=new Set<Ncrv2EligibilityAuthorityBlocker>();
    if(!binding)blockers.add("ELIGIBILITY_COMBINATION_BINDING_MISSING");
    if(binding&&(
      String(binding.tenant_id)!==key.tenantId||String(binding.package_id)!==key.packageId||String(binding.gate_evaluation_id)!==key.gateEvaluationId||String(binding.evaluation_scope_sha256)!==key.evaluationScopeSha256||
      binding.binding_status!=="REAL_EVIDENCE_COMBINATION_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY"||Number(binding.binding_version)!==1||Number(binding.evaluated_evidence_slots)!==14||
      Number(binding.formal_requirement_count)!==0||binding.formal_action_authorized!==false||binding.provider_called!==false||binding.external_mutation_performed!==false||!SHA256.test(String(binding.binding_sha256))
    ))blockers.add("ELIGIBILITY_COMBINATION_BINDING_INVALID");
    const current=Boolean(binding)&&iso(binding!.expires_at,"binding.expiresAt")>observedAt;
    if(binding&&!current)blockers.add("ELIGIBILITY_COMBINATION_BINDING_EXPIRED");
    if(binding&&(!eligibility||!combination))blockers.add("ELIGIBILITY_COMBINATION_LINEAGE_MISMATCH");
    if(binding&&eligibility&&combination&&(
      String(eligibility.id)!==String(binding.eligibility_receipt_id)||String(combination.id)!==String(binding.evidence_combination_receipt_id)||
      String(eligibility.tenant_id)!==key.tenantId||String(combination.tenant_id)!==key.tenantId||
      String(eligibility.package_id)!==key.packageId||String(combination.package_id)!==key.packageId||
      String(eligibility.gate_evaluation_id)!==key.gateEvaluationId||String(combination.gate_evaluation_id)!==key.gateEvaluationId||
      String(eligibility.evaluation_scope_sha256)!==key.evaluationScopeSha256||String(combination.evaluation_scope_sha256)!==key.evaluationScopeSha256||
      String(eligibility.eligibility_sha256)!==String(binding.eligibility_sha256)||String(combination.decision_sha256)!==String(binding.evidence_combination_sha256)||
      eligibility.eligibility_status!=="PREREQUISITES_COMPLETE_AWAITING_REAL_EVIDENCE_COMBINATION"||eligibility.eligible_for_real_evidence_combination!==true||
      combination.decision_status!=="REAL_EVIDENCE_COMPLETE_AWAITING_SEPARATE_FORMAL_AUTHORITY"||combination.real_evidence_complete!==true||Number(combination.evaluated_evidence_slots)!==14||
      String(eligibility.registry_receipt_sha256)!==String(combination.registry_receipt_sha256)
    ))blockers.add("ELIGIBILITY_COMBINATION_LINEAGE_MISMATCH");
    if(!authority)blockers.add("FORMAL_AUTHORITY_DECISION_MISSING");
    else if(authority.decision_status!=="ELIGIBLE_FOR_SEPARATE_ATOMIC_CONSUMPTION"||authority.eligible_for_atomic_consumption!==true||authority.authority_consumed!==false||authority.formal_action_performed!==false)blockers.add("FORMAL_AUTHORITY_NOT_ELIGIBLE");
    if(binding&&authority&&(
      String(authority.tenant_id)!==key.tenantId||String(authority.package_id)!==key.packageId||String(authority.gate_evaluation_id)!==key.gateEvaluationId||String(authority.evaluation_scope_sha256)!==key.evaluationScopeSha256||String(authority.evidence_combination_receipt_id)!==String(binding.evidence_combination_receipt_id)
    ))blockers.add("ELIGIBILITY_COMBINATION_LINEAGE_MISMATCH");
    blockers.add("FORMAL_ACTION_NOT_EXECUTED");
    const onlyFormalAction=blockers.size===1&&blockers.has("FORMAL_ACTION_NOT_EXECUTED");
    const awaitingAuthority=blockers.size===2&&blockers.has("FORMAL_AUTHORITY_DECISION_MISSING")&&blockers.has("FORMAL_ACTION_NOT_EXECUTED");
    await client.query("COMMIT");
    return{
      status:onlyFormalAction?"FORMAL_AUTHORITY_ELIGIBLE_AWAITING_SEPARATE_ATOMIC_CONSUMPTION":awaitingAuthority?"REAL_EVIDENCE_BOUND_AWAITING_SEPARATE_FORMAL_AUTHORITY":"BLOCKED",
      blockers:Object.freeze([...blockers].sort()),tenantId:key.tenantId,packageId:key.packageId,gateEvaluationId:key.gateEvaluationId,evaluationScopeSha256:key.evaluationScopeSha256,
      binding:{present:Boolean(binding),bindingReceiptId:binding?String(binding.id):null,eligibilityReceiptId:binding?String(binding.eligibility_receipt_id):null,evidenceCombinationReceiptId:binding?String(binding.evidence_combination_receipt_id):null,current,validatedEvidenceSlots:binding&&Number(binding.evaluated_evidence_slots)===14?14:0},
      formalAuthority:{decisionPresent:Boolean(authority),decisionReceiptId:authority?String(authority.id):null,eligibleForSeparateAtomicConsumption:Boolean(authority?.eligible_for_atomic_consumption),authorityConsumed:false},
      formalTruth:{clubsCompleted:60,clubsTotal:120,clubsPercent:50,ncrv2Satisfied:0,ncrv2Total:14,cclub061:"ACTIVE_BLOCKED",cclub063:"NOT_FORMALLY_ACTIVATED",formalActionPerformed:false,formalStatusUnchanged:true},
    };
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
