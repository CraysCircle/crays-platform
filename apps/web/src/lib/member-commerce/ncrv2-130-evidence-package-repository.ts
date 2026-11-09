export type Ncrv2RequirementResult = "PASS" | "FAIL" | "PARTIAL" | "MISSING";
export type Ncrv2EvaluationResult = "BLOCKED" | "TECHNICALLY_ELIGIBLE";

export interface Ncrv2EvidencePackageWrite {
  package: {
    id: string; tenantId: string; scopeKey: string; expectedRequirementCount: 14;
    requirementManifestHash: string; evidenceSetHash: string;
    vendureStatusTransportState: "NOT_APPLIED" | "APPLIED"; vendureStatusTransportAt: string | null;
    workerSchedulerState: "NOT_PROVEN" | "LEASE_RECOVERY_PROVEN"; workerSchedulerProvenAt: string | null;
    stripeCustomerState: "NOT_CREATED" | "CREATED_AFTER_PREREQUISITES"; stripeCustomerCreatedAt: string | null;
    externalCellState: "MISSING" | "FAIL" | "PASS"; realMediaCount: number;
    humanAal2State: "MISSING" | "STALE" | "FRESH"; humanAal2ObservedAt: string | null; humanAal2ValidUntil: string | null;
    evaluatedAt: string;
  };
  requirementEvidence: readonly {
    id: string; requirementId: string; result: Ncrv2RequirementResult; evidenceHash: string;
    authorityKind: string; observedAt: string; validUntil: string | null;
  }[];
  evaluation: {
    id: string; evaluationResult: Ncrv2EvaluationResult; passCount: number; failCount: number;
    partialCount: number; missingCount: number; combinedEvidenceHash: string;
    blockerCodes: readonly string[]; formalStatusUnchanged: true; evaluatedAt: string;
  };
}
export interface Ncrv2EvidencePackageReadback extends Ncrv2EvidencePackageWrite { replayed: boolean }

interface QueryResult<R = Record<string, unknown>> { rows: R[] }
interface QueryClient {
  query<R = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<QueryResult<R>>;
  release(): void;
}
export interface Ncrv2RepositoryPool { connect(): Promise<QueryClient> }
type Row = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const req = (ok: unknown, code: string): void => { if (!ok) throw new Error(code); };
const text = (v: string, n: string): string => { req(v.length > 0 && v.trim() === v, "NCRV2_INVALID_TEXT:" + n); return v; };
const uuid = (v: string, n: string): string => { req(UUID.test(v), "NCRV2_INVALID_UUID:" + n); return v; };
const hash = (v: string, n: string): string => { req(SHA256.test(v), "NCRV2_INVALID_SHA256:" + n); return v; };
const iso = (v: unknown, n: string): string => {
  const d = v instanceof Date ? v : new Date(String(v)); req(Number.isFinite(d.getTime()), "NCRV2_INVALID_TIMESTAMP:" + n); return d.toISOString();
};
const nullableIso = (v: unknown, n: string): string | null => v === null || v === undefined ? null : iso(v, n);
const str = (v: unknown, n: string): string => { req(typeof v === "string", "NCRV2_INVALID_DB_VALUE:" + n); return String(v); };
const num = (v: unknown, n: string): number => { const x = Number(v); req(Number.isInteger(x), "NCRV2_INVALID_DB_VALUE:" + n); return x; };
const bool = (v: unknown, n: string): boolean => { req(typeof v === "boolean", "NCRV2_INVALID_DB_VALUE:" + n); return v as boolean; };
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const blockers = (v: unknown): string[] => {
  req(Array.isArray(v) && v.every(x => typeof x === "string"), "NCRV2_INVALID_DB_VALUE:blocker_codes");
  return [...v as string[]].sort();
};

function canonicalize(input: Ncrv2EvidencePackageWrite): Ncrv2EvidencePackageWrite {
  const p = input.package;
  uuid(p.id, "package.id"); uuid(p.tenantId, "package.tenantId"); text(p.scopeKey, "package.scopeKey");
  hash(p.requirementManifestHash, "package.requirementManifestHash"); hash(p.evidenceSetHash, "package.evidenceSetHash");
  req(p.expectedRequirementCount === 14 && input.requirementEvidence.length === 14, "NCRV2_EXACTLY_14_REQUIREMENTS_REQUIRED");
  req(Number.isInteger(p.realMediaCount) && p.realMediaCount >= 0 && p.realMediaCount <= 6, "NCRV2_INVALID_REAL_MEDIA_COUNT");
  const evaluatedAt = iso(p.evaluatedAt, "package.evaluatedAt");
  const vendureAt = nullableIso(p.vendureStatusTransportAt, "package.vendureStatusTransportAt");
  const workerAt = nullableIso(p.workerSchedulerProvenAt, "package.workerSchedulerProvenAt");
  const stripeAt = nullableIso(p.stripeCustomerCreatedAt, "package.stripeCustomerCreatedAt");
  const aal2At = nullableIso(p.humanAal2ObservedAt, "package.humanAal2ObservedAt");
  const aal2Until = nullableIso(p.humanAal2ValidUntil, "package.humanAal2ValidUntil");
  req((p.vendureStatusTransportState === "APPLIED") === (vendureAt !== null), "NCRV2_VENDURE_STATE_TIME_MISMATCH");
  req((p.workerSchedulerState === "LEASE_RECOVERY_PROVEN") === (workerAt !== null), "NCRV2_WORKER_STATE_TIME_MISMATCH");
  req((p.stripeCustomerState === "CREATED_AFTER_PREREQUISITES") === (stripeAt !== null), "NCRV2_STRIPE_STATE_TIME_MISMATCH");
  if (p.humanAal2State === "FRESH") req(Boolean(aal2At && aal2Until && aal2Until > evaluatedAt), "NCRV2_AAL2_FRESHNESS_INVALID");

  const evidence = input.requirementEvidence.map((r, i) => {
    uuid(r.id, "requirement." + i + ".id"); text(r.requirementId, "requirement." + i + ".requirementId");
    hash(r.evidenceHash, "requirement." + i + ".evidenceHash"); text(r.authorityKind, "requirement." + i + ".authorityKind");
    const observedAt = iso(r.observedAt, "requirement." + i + ".observedAt");
    const validUntil = nullableIso(r.validUntil, "requirement." + i + ".validUntil");
    if (validUntil) req(validUntil > observedAt, "NCRV2_REQUIREMENT_VALIDITY_INVALID");
    return { ...r, observedAt, validUntil };
  }).sort((a, b) => a.requirementId.localeCompare(b.requirementId));
  req(new Set(evidence.map(x => x.requirementId)).size === 14, "NCRV2_DUPLICATE_REQUIREMENT_ID");
  req(new Set(evidence.map(x => x.id)).size === 14, "NCRV2_DUPLICATE_REQUIREMENT_ROW_ID");

  const e = input.evaluation;
  uuid(e.id, "evaluation.id"); hash(e.combinedEvidenceHash, "evaluation.combinedEvidenceHash");
  const evaluationAt = iso(e.evaluatedAt, "evaluation.evaluatedAt");
  req(evaluationAt === evaluatedAt, "NCRV2_EVALUATION_TIME_MISMATCH");
  req(e.formalStatusUnchanged === true, "NCRV2_FORMAL_STATUS_MUST_REMAIN_UNCHANGED");
  const count = { PASS: 0, FAIL: 0, PARTIAL: 0, MISSING: 0 };
  evidence.forEach(x => count[x.result]++);
  req(count.PASS === e.passCount && count.FAIL === e.failCount && count.PARTIAL === e.partialCount && count.MISSING === e.missingCount, "NCRV2_EVALUATION_COUNTS_MISMATCH");
  const codes = [...e.blockerCodes]; codes.forEach((x, i) => text(x, "evaluation.blockerCodes." + i)); codes.sort();
  req(new Set(codes).size === codes.length, "NCRV2_DUPLICATE_BLOCKER_CODE");
  if (e.evaluationResult === "TECHNICALLY_ELIGIBLE") req(count.PASS === 14 && codes.length === 0, "NCRV2_TECHNICAL_ELIGIBILITY_INVALID");
  return {
    package: { ...p, vendureStatusTransportAt: vendureAt, workerSchedulerProvenAt: workerAt, stripeCustomerCreatedAt: stripeAt, humanAal2ObservedAt: aal2At, humanAal2ValidUntil: aal2Until, evaluatedAt },
    requirementEvidence: evidence,
    evaluation: { ...e, blockerCodes: codes, evaluatedAt: evaluationAt }
  };
}

function packageRow(r: Row): Ncrv2EvidencePackageWrite["package"] {
  return {
    id:str(r.id,"package.id"),tenantId:str(r.tenant_id,"package.tenant_id"),scopeKey:str(r.scope_key,"package.scope_key"),
    expectedRequirementCount:num(r.expected_requirement_count,"package.expected_requirement_count") as 14,
    requirementManifestHash:str(r.requirement_manifest_hash,"package.requirement_manifest_hash"),
    evidenceSetHash:str(r.evidence_set_hash,"package.evidence_set_hash"),
    vendureStatusTransportState:str(r.vendure_status_transport_state,"package.vendure_status_transport_state") as Ncrv2EvidencePackageWrite["package"]["vendureStatusTransportState"],
    vendureStatusTransportAt:nullableIso(r.vendure_status_transport_at,"package.vendure_status_transport_at"),
    workerSchedulerState:str(r.worker_scheduler_state,"package.worker_scheduler_state") as Ncrv2EvidencePackageWrite["package"]["workerSchedulerState"],
    workerSchedulerProvenAt:nullableIso(r.worker_scheduler_proven_at,"package.worker_scheduler_proven_at"),
    stripeCustomerState:str(r.stripe_customer_state,"package.stripe_customer_state") as Ncrv2EvidencePackageWrite["package"]["stripeCustomerState"],
    stripeCustomerCreatedAt:nullableIso(r.stripe_customer_created_at,"package.stripe_customer_created_at"),
    externalCellState:str(r.external_cell_state,"package.external_cell_state") as Ncrv2EvidencePackageWrite["package"]["externalCellState"],
    realMediaCount:num(r.real_media_count,"package.real_media_count"),
    humanAal2State:str(r.human_aal2_state,"package.human_aal2_state") as Ncrv2EvidencePackageWrite["package"]["humanAal2State"],
    humanAal2ObservedAt:nullableIso(r.human_aal2_observed_at,"package.human_aal2_observed_at"),
    humanAal2ValidUntil:nullableIso(r.human_aal2_valid_until,"package.human_aal2_valid_until"),
    evaluatedAt:iso(r.evaluated_at,"package.evaluated_at")
  };
}
function requirementRow(r: Row): Ncrv2EvidencePackageWrite["requirementEvidence"][number] {
  return {id:str(r.id,"requirement.id"),requirementId:str(r.requirement_id,"requirement.requirement_id"),result:str(r.result,"requirement.result") as Ncrv2RequirementResult,evidenceHash:str(r.evidence_hash,"requirement.evidence_hash"),authorityKind:str(r.authority_kind,"requirement.authority_kind"),observedAt:iso(r.observed_at,"requirement.observed_at"),validUntil:nullableIso(r.valid_until,"requirement.valid_until")};
}
function evaluationRow(r: Row): Ncrv2EvidencePackageWrite["evaluation"] {
  return {id:str(r.id,"evaluation.id"),evaluationResult:str(r.evaluation_result,"evaluation.evaluation_result") as Ncrv2EvaluationResult,passCount:num(r.pass_count,"evaluation.pass_count"),failCount:num(r.fail_count,"evaluation.fail_count"),partialCount:num(r.partial_count,"evaluation.partial_count"),missingCount:num(r.missing_count,"evaluation.missing_count"),combinedEvidenceHash:str(r.combined_evidence_hash,"evaluation.combined_evidence_hash"),blockerCodes:blockers(r.blocker_codes),formalStatusUnchanged:bool(r.formal_status_unchanged,"evaluation.formal_status_unchanged") as true,evaluatedAt:iso(r.evaluated_at,"evaluation.evaluated_at")};
}
async function tenant(client: QueryClient, tenantId: string): Promise<void> { await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]); }

async function exact(client: QueryClient, c: Ncrv2EvidencePackageWrite): Promise<Omit<Ncrv2EvidencePackageReadback,"replayed">> {
  const pr = await client.query<Row>('SELECT * FROM "CraysClubNcrv2EvidencePackage" WHERE "tenant_id"=$1 AND "scope_key"=$2 AND "evidence_set_hash"=$3',[c.package.tenantId,c.package.scopeKey,c.package.evidenceSetHash]);
  req(pr.rows.length === 1, "NCRV2_PACKAGE_EXACT_READBACK_MISSING");
  const p = packageRow(pr.rows[0]);
  const rr = await client.query<Row>('SELECT * FROM "CraysClubNcrv2RequirementEvidence" WHERE "tenant_id"=$1 AND "package_id"=$2 ORDER BY "requirement_id" ASC',[p.tenantId,p.id]);
  const er = await client.query<Row>('SELECT * FROM "CraysClubNcrv2GateEvaluation" WHERE "tenant_id"=$1 AND "package_id"=$2 AND "combined_evidence_hash"=$3',[p.tenantId,p.id,c.evaluation.combinedEvidenceHash]);
  req(er.rows.length === 1, "NCRV2_EVALUATION_EXACT_READBACK_MISSING");
  const out = {package:p,requirementEvidence:rr.rows.map(requirementRow).sort((a,b)=>a.requirementId.localeCompare(b.requirementId)),evaluation:evaluationRow(er.rows[0])};
  req(same(out,c),"NCRV2_EXACT_REPLAY_CONFLICT"); return out;
}

export async function persistNcrv2EvidencePackage(pool:Ncrv2RepositoryPool,input:Ncrv2EvidencePackageWrite):Promise<Ncrv2EvidencePackageReadback> {
  const c=canonicalize(input), client=await pool.connect();
  try {
    await client.query("BEGIN"); await tenant(client,c.package.tenantId); const p=c.package;
    const pi=await client.query<Row>('INSERT INTO "CraysClubNcrv2EvidencePackage" ("id","tenant_id","scope_key","expected_requirement_count","requirement_manifest_hash","evidence_set_hash","vendure_status_transport_state","vendure_status_transport_at","worker_scheduler_state","worker_scheduler_proven_at","stripe_customer_state","stripe_customer_created_at","external_cell_state","real_media_count","human_aal2_state","human_aal2_observed_at","human_aal2_valid_until","evaluated_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT DO NOTHING RETURNING *',[p.id,p.tenantId,p.scopeKey,p.expectedRequirementCount,p.requirementManifestHash,p.evidenceSetHash,p.vendureStatusTransportState,p.vendureStatusTransportAt,p.workerSchedulerState,p.workerSchedulerProvenAt,p.stripeCustomerState,p.stripeCustomerCreatedAt,p.externalCellState,p.realMediaCount,p.humanAal2State,p.humanAal2ObservedAt,p.humanAal2ValidUntil,p.evaluatedAt]);
    let ri=0;
    for(const r of c.requirementEvidence) ri+=(await client.query<Row>('INSERT INTO "CraysClubNcrv2RequirementEvidence" ("id","tenant_id","package_id","requirement_id","result","evidence_hash","authority_kind","observed_at","valid_until") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING *',[r.id,p.tenantId,p.id,r.requirementId,r.result,r.evidenceHash,r.authorityKind,r.observedAt,r.validUntil])).rows.length;
    const e=c.evaluation;
    const ei=await client.query<Row>('INSERT INTO "CraysClubNcrv2GateEvaluation" ("id","tenant_id","package_id","evaluation_result","pass_count","fail_count","partial_count","missing_count","combined_evidence_hash","blocker_codes","formal_status_unchanged","evaluated_at") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12) ON CONFLICT DO NOTHING RETURNING *',[e.id,p.tenantId,p.id,e.evaluationResult,e.passCount,e.failCount,e.partialCount,e.missingCount,e.combinedEvidenceHash,JSON.stringify(e.blockerCodes),true,e.evaluatedAt]);
    const inserted=pi.rows.length===1;
    req(inserted ? ri===14&&ei.rows.length===1 : ri===0&&ei.rows.length===0,"NCRV2_ATOMIC_REPLAY_STATE_CONFLICT");
    const out=await exact(client,c); await client.query("COMMIT"); return {...out,replayed:!inserted};
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function readNcrv2EvidencePackage(pool:Ncrv2RepositoryPool,key:{tenantId:string;scopeKey:string;evidenceSetHash:string;combinedEvidenceHash:string}):Promise<Omit<Ncrv2EvidencePackageReadback,"replayed">|null> {
  uuid(key.tenantId,"tenantId");text(key.scopeKey,"scopeKey");hash(key.evidenceSetHash,"evidenceSetHash");hash(key.combinedEvidenceHash,"combinedEvidenceHash");
  const client=await pool.connect();
  try {
    await client.query("BEGIN");await tenant(client,key.tenantId);
    const pr=await client.query<Row>('SELECT * FROM "CraysClubNcrv2EvidencePackage" WHERE "tenant_id"=$1 AND "scope_key"=$2 AND "evidence_set_hash"=$3',[key.tenantId,key.scopeKey,key.evidenceSetHash]);
    if(pr.rows.length===0){await client.query("COMMIT");return null;}req(pr.rows.length===1,"NCRV2_PACKAGE_READBACK_AMBIGUOUS");
    const p=packageRow(pr.rows[0]);
    const rr=await client.query<Row>('SELECT * FROM "CraysClubNcrv2RequirementEvidence" WHERE "tenant_id"=$1 AND "package_id"=$2 ORDER BY "requirement_id" ASC',[key.tenantId,p.id]);
    const er=await client.query<Row>('SELECT * FROM "CraysClubNcrv2GateEvaluation" WHERE "tenant_id"=$1 AND "package_id"=$2 AND "combined_evidence_hash"=$3',[key.tenantId,p.id,key.combinedEvidenceHash]);
    req(rr.rows.length===14&&er.rows.length===1,"NCRV2_PACKAGE_READBACK_INCOMPLETE");
    const out={package:p,requirementEvidence:rr.rows.map(requirementRow).sort((a,b)=>a.requirementId.localeCompare(b.requirementId)),evaluation:evaluationRow(er.rows[0])};canonicalize(out);
    await client.query("COMMIT");return out;
  } catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
