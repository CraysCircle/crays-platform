import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { getCorePgPool } from "@/db/client";
import type { CraysRouteContext } from "@/lib/dal/server-trust";
const roles = {
    admin: "programme_governance",
    "crays-management": "architecture",
    reviewer: "dpo_legal",
  } as const,
  hex = z.string().regex(/^[0-9a-f]{64}$/),
  sid = z.string().min(3).max(200),
  arr = z.array(z.string().min(1).max(200)).min(1).max(100),
  idem = z.string().min(16).max(200);
const recordSchema = z.object({
  idempotencyKey: idem,
  consentId: sid,
  subjectRefSha256: hex,
  subjectAuthorityRef: sid,
  purposeGrantId: sid,
  purposeGrantVersion: z.number().int().positive(),
  purposeGrantSha256: hex,
  consentScopeCodes: arr,
  recipientClasses: arr,
  channels: arr,
  fieldPaths: arr,
  evidenceRef: sid,
  noticeVersion: sid,
  language: z.string().min(2).max(20),
  collectionMethod: sid,
  validUntil: z.string().datetime(),
  expectedConsentVersion: z.number().int().positive().nullable().optional(),
  expectedConsentSha256: hex.nullable().optional(),
});
const revokeSchema = z.object({
  idempotencyKey: idem,
  consentId: sid,
  expectedConsentVersion: z.number().int().positive(),
  expectedConsentSha256: hex,
  revocationKind: z.enum([
    "consent_withdrawal",
    "objection",
    "suppression",
    "safety_block",
    "policy_revocation",
    "subject_erasure_hold",
  ]),
  reason: z.string().min(3).max(500),
});
const projectionSchema = z.object({
  purposeGrantId: sid,
  purposeGrantVersion: z.number().int().positive(),
  purposeGrantSha256: hex,
  consentId: sid,
  consentVersion: z.number().int().positive(),
  consentSha256: hex,
  ageSafetyDecisionId: sid,
  ageSafetyDecisionVersion: z.number().int().positive(),
  ageSafetyDecisionSha256: hex,
  disclosurePolicyId: sid,
  disclosurePolicyVersion: z.number().int().positive(),
  disclosurePolicySha256: hex,
  workloadIdentityId: sid,
  workloadVersion: z.number().int().positive(),
  actorContextId: sid,
  actorContextVersion: z.number().int().positive(),
  persistedOperationSha256: hex,
  requestedFieldPaths: arr,
  recipientClass: sid,
  channel: sid,
  modelRouteClass: sid,
});
type Access = {
  allowed: boolean;
  code: string;
  tenantId: string | null;
  actorId: string | null;
  actorRole: string | null;
};
type Pf = {
  allowed: boolean;
  code: string;
  currentConsentVersion: number | null;
  currentConsentSha256: string | null;
  nextSafeAction: string;
};
const canon = (v: unknown): string =>
    Array.isArray(v)
      ? "[" + v.map(canon).join(",") + "]"
      : v && typeof v === "object"
        ? "{" +
          Object.entries(v as Record<string, unknown>)
            .filter(([, x]) => x !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => JSON.stringify(k) + ":" + canon(x))
            .join(",") +
          "}"
        : JSON.stringify(v),
  sha = (v: string) => createHash("sha256").update(v).digest("hex"),
  camel = (s: string) => s.replace(/_([a-z])/g, (_, x) => x.toUpperCase()),
  map = (r: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [
        camel(k),
        v instanceof Date ? v.toISOString() : v,
      ]),
    );
function access(c: CraysRouteContext): Access {
  const actorId = c.session.account?.id ?? null;
  if (c.authoritySource !== "auth0-crays-session" || !actorId)
    return {
      allowed: false,
      code: "AUTHENTICATION_REQUIRED",
      tenantId: null,
      actorId: null,
      actorRole: null,
    };
  if (
    !c.tenantId ||
    ["anonymous", "crays-local-review", "crays-portal-bridge"].includes(
      c.tenantId,
    )
  )
    return {
      allowed: false,
      code: "TENANT_REQUIRED",
      tenantId: null,
      actorId,
      actorRole: null,
    };
  const actorRole = roles[c.role as keyof typeof roles] ?? null;
  return actorRole
    ? {
        allowed: true,
        code: "ALLOWED",
        tenantId: c.tenantId,
        actorId,
        actorRole,
      }
    : {
        allowed: false,
        code: "ROLE_NOT_ADMITTED",
        tenantId: c.tenantId,
        actorId,
        actorRole: null,
      };
}
async function scope(c: PoolClient, a: Access) {
  if (!a.allowed || !a.tenantId || !a.actorId || !a.actorRole)
    throw Error("OCA_PRIVACY_AUTHORITY_REQUIRED");
  await c.query(
    "select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true),set_config('crays.actor_id',$2,true),set_config('crays.actor_role',$3,true)",
    [a.tenantId, a.actorId, a.actorRole],
  );
}
const denied = (
  code: string,
  v: number | null = null,
  h: string | null = null,
  next = "Reload canonical privacy authority and review the exact current version.",
): Pf => ({
  allowed: false,
  code,
  currentConsentVersion: v,
  currentConsentSha256: h,
  nextSafeAction: next,
});
async function persistDenial(
  c: PoolClient,
  a: Access,
  commandName:
    "RecordOcaConsent" | "RevokeOcaConsent" | "EvaluateOcaFieldProjection",
  reasonCode: string,
  targetId: string,
  expectedConsentVersion: number | null,
  expectedConsentSha256: string | null,
  correlationId: string,
  nextSafeAction: string,
) {
  if (!a.tenantId || !a.actorId || !a.actorRole)
    throw Error("OCA_PRIVACY_DENIAL_AUTHORITY_REQUIRED");
  const denialReceiptId = randomUUID(),
    targetIdSha256 = sha(targetId),
    receiptSha256 = sha(
      canon({
        denialReceiptId,
        commandName,
        reasonCode,
        targetIdSha256,
        expectedConsentVersion,
        expectedConsentSha256,
        correlationId,
      }),
    );
  await c.query(
    "insert into crays_core.oca_privacy_command_denial_receipts values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())",
    [
      a.tenantId,
      denialReceiptId,
      a.actorId,
      a.actorRole,
      commandName,
      reasonCode,
      targetIdSha256,
      expectedConsentVersion,
      expectedConsentSha256,
      correlationId,
      nextSafeAction,
      receiptSha256,
    ],
  );
  return denialReceiptId;
}
const empty = (a: Access, status: string, correlationId: string) => ({
  status,
  access: a,
  purposeGrants: [],
  consents: [],
  ageSafetyDecisions: [],
  disclosurePolicies: [],
  projectionDecisions: [],
  revocations: [],
  explainabilityReceipts: [],
  commandReceipts: [],
  commandDenials: [],
  nextSafeAction:
    status === "unavailable"
      ? "Retry CRAYS Core; never infer consent or disclosure authority."
      : "Return to an authorized CRAYS Role Home.",
  correlationId,
});
export async function getOcaPurposeDisclosureWorkbench(
  context: CraysRouteContext,
  correlationId: string,
) {
  const a = access(context);
  if (!a.allowed) return empty(a, "denied", correlationId);
  let c: PoolClient;
  try {
    c = await getCorePgPool().connect();
  } catch {
    return empty(a, "unavailable", correlationId);
  }
  try {
    await c.query("begin read only");
    await scope(c, a);
    const names = [
        "oca_purpose_grant_read_model",
        "oca_consent_read_model",
        "oca_age_safety_read_model",
        "oca_disclosure_policy_read_model",
        "oca_field_projection_decisions",
        "oca_revocation_receipt_read_model",
        "oca_explainability_receipts",
        "oca_privacy_command_receipt_read_model",
        "oca_privacy_command_denial_read_model",
      ],
      rows: Record<string, unknown>[][] = [];
    for (const n of names) {
      const own = n.includes("command_");
      rows.push(
        (
          await c.query(
            "select * from crays_core." +
              n +
              " where tenant_id=$1" +
              (own ? " and actor_id=$2 and actor_role_key=$3" : "") +
              " order by created_at desc limit 100",
            own ? [a.tenantId, a.actorId, a.actorRole] : [a.tenantId],
          )
        ).rows.map(map),
      );
    }
    await c.query("commit");
    return {
      status: rows.some((x) => x.length) ? "ready" : "empty",
      access: a,
      purposeGrants: rows[0],
      consents: rows[1],
      ageSafetyDecisions: rows[2],
      disclosurePolicies: rows[3],
      projectionDecisions: rows[4],
      revocations: rows[5],
      explainabilityReceipts: rows[6],
      commandReceipts: rows[7],
      commandDenials: rows[8],
      nextSafeAction:
        "Review exact purpose, consent, age/safety and field-level disclosure before any command.",
      correlationId,
    };
  } catch {
    await c.query("rollback").catch(() => {});
    return empty(a, "unavailable", correlationId);
  } finally {
    c.release();
  }
}
async function preflightRecord(
  c: PoolClient,
  context: CraysRouteContext,
  i: z.infer<typeof recordSchema>,
): Promise<Pf> {
  const a = access(context);
  if (!a.allowed)
    return denied(
      a.code,
      null,
      null,
      "Return to an authorized CRAYS Role Home.",
    );
  await scope(c, a);
  const g = (
    await c.query<Record<string, unknown>>(
      "select * from crays_core.oca_purpose_grant_read_model where tenant_id=$1 and purpose_grant_id=$2",
      [a.tenantId, i.purposeGrantId],
    )
  ).rows[0];
  if (!g) return denied("PURPOSE_GRANT_REQUIRED");
  if (Number(g.grant_version) !== i.purposeGrantVersion)
    return denied("EXPECTED_VERSION_CONFLICT");
  if (g.grant_sha256 !== i.purposeGrantSha256)
    return denied("EXPECTED_DIGEST_CONFLICT");
  if (new Date(String(g.valid_until)) <= new Date())
    return denied("PURPOSE_GRANT_EXPIRED");
  if (g.grant_state !== "active") return denied("PURPOSE_NOT_ALLOWED");
  const has = (o: unknown, x: string[]) =>
    x.every((v) => (o as string[]).includes(v));
  if (!has(g.allowed_recipient_classes, i.recipientClasses))
    return denied("RECIPIENT_NOT_ALLOWED");
  if (!has(g.allowed_channels, i.channels))
    return denied("CHANNEL_NOT_ALLOWED");
  if (!has(g.allowed_field_paths, i.fieldPaths))
    return denied("FIELD_NOT_ALLOWED");
  if (!i.consentScopeCodes.includes(String(g.purpose_code)))
    return denied("CONSENT_SCOPE_MISMATCH");
  const x = (
    await c.query<Record<string, unknown>>(
      "select * from crays_core.oca_consent_read_model where tenant_id=$1 and consent_id=$2",
      [a.tenantId, i.consentId],
    )
  ).rows[0];
  if (x && Number(x.consent_version) !== i.expectedConsentVersion)
    return denied(
      "EXPECTED_VERSION_CONFLICT",
      Number(x.consent_version),
      String(x.consent_sha256),
    );
  if (x && x.consent_sha256 !== i.expectedConsentSha256)
    return denied(
      "EXPECTED_DIGEST_CONFLICT",
      Number(x.consent_version),
      String(x.consent_sha256),
    );
  if (
    !x &&
    (i.expectedConsentVersion != null || i.expectedConsentSha256 != null)
  )
    return denied("CONSENT_REQUIRED");
  return {
    allowed: true,
    code: "ALLOWED",
    currentConsentVersion: x ? Number(x.consent_version) : null,
    currentConsentSha256: x ? String(x.consent_sha256) : null,
    nextSafeAction:
      "Confirm append-only consent recording against the reviewed notice and scope.",
  };
}
async function preflightRevoke(
  c: PoolClient,
  context: CraysRouteContext,
  i: z.infer<typeof revokeSchema>,
): Promise<Pf> {
  const a = access(context);
  if (!a.allowed)
    return denied(
      a.code,
      null,
      null,
      "Return to an authorized CRAYS Role Home.",
    );
  await scope(c, a);
  const x = (
    await c.query<Record<string, unknown>>(
      "select * from crays_core.oca_consent_read_model where tenant_id=$1 and consent_id=$2",
      [a.tenantId, i.consentId],
    )
  ).rows[0];
  if (!x) return denied("CONSENT_REQUIRED");
  if (Number(x.consent_version) !== i.expectedConsentVersion)
    return denied(
      "EXPECTED_VERSION_CONFLICT",
      Number(x.consent_version),
      String(x.consent_sha256),
    );
  if (x.consent_sha256 !== i.expectedConsentSha256)
    return denied(
      "EXPECTED_DIGEST_CONFLICT",
      Number(x.consent_version),
      String(x.consent_sha256),
    );
  if (x.consent_state === "withdrawn")
    return denied(
      "CONSENT_WITHDRAWN",
      Number(x.consent_version),
      String(x.consent_sha256),
      "No revocation command is needed for non-active consent.",
    );
  if (new Date(String(x.valid_until)) <= new Date())
    return denied(
      "CONSENT_EXPIRED",
      Number(x.consent_version),
      String(x.consent_sha256),
      "No revocation command is needed for expired consent.",
    );
  return {
    allowed: true,
    code: "ALLOWED",
    currentConsentVersion: Number(x.consent_version),
    currentConsentSha256: String(x.consent_sha256),
    nextSafeAction: "Confirm append-only withdrawal and revocation receipt.",
  };
}
async function publicPreflight(
  context: CraysRouteContext,
  raw: unknown,
  kind: "record" | "revoke",
) {
  const p = (kind === "record" ? recordSchema : revokeSchema).safeParse(raw);
  if (!p.success)
    return denied("VALIDATION_FAILED", null, null, p.error.issues[0]?.message);
  let c: PoolClient;
  try {
    c = await getCorePgPool().connect();
  } catch {
    return denied("PREFLIGHT_UNAVAILABLE");
  }
  try {
    await c.query("begin read only");
    const out =
      kind === "record"
        ? await preflightRecord(
            c,
            context,
            p.data as z.infer<typeof recordSchema>,
          )
        : await preflightRevoke(
            c,
            context,
            p.data as z.infer<typeof revokeSchema>,
          );
    await c.query("commit");
    return out;
  } catch {
    await c.query("rollback").catch(() => {});
    return denied("PREFLIGHT_UNAVAILABLE");
  } finally {
    c.release();
  }
}
export const preflightRecordOcaConsent = (c: CraysRouteContext, r: unknown) =>
  publicPreflight(c, r, "record");
export const preflightRevokeOcaConsent = (c: CraysRouteContext, r: unknown) =>
  publicPreflight(c, r, "revoke");
async function command(
  context: CraysRouteContext,
  raw: unknown,
  kind: "record" | "revoke",
  correlationId: string,
) {
  const p = (kind === "record" ? recordSchema : revokeSchema).safeParse(raw),
    name = kind === "record" ? "RecordOcaConsent" : "RevokeOcaConsent";
  if (!p.success)
    return {
      status: "preflight_denied",
      replayed: false,
      receiptId: null,
      consentId: null,
      consentVersion: null,
      consentSha256: null,
      revocationReceiptId: null,
      preflight: denied(
        "VALIDATION_FAILED",
        null,
        null,
        p.error.issues[0]?.message,
      ),
      nextSafeAction: "Correct the command.",
      correlationId,
    };
  const i = p.data as z.infer<typeof recordSchema> &
      z.infer<typeof revokeSchema>,
    a = access(context);
  if (!a.allowed || !a.tenantId || !a.actorId || !a.actorRole)
    return {
      status: "denied",
      replayed: false,
      receiptId: null,
      consentId: null,
      consentVersion: null,
      consentSha256: null,
      revocationReceiptId: null,
      preflight: denied(a.code),
      nextSafeAction: "Return to an authorized CRAYS Role Home.",
      correlationId,
    };
  const kh = sha(i.idempotencyKey),
    ph = sha(canon({ ...i, idempotencyKey: undefined }));
  let c: PoolClient;
  try {
    c = await getCorePgPool().connect();
  } catch {
    return {
      status: "unknown_outcome",
      replayed: false,
      receiptId: null,
      consentId: null,
      consentVersion: null,
      consentSha256: null,
      revocationReceiptId: null,
      preflight: null,
      nextSafeAction: "Preserve the exact key and reconcile.",
      correlationId,
    };
  }
  try {
    await c.query("begin");
    await scope(c, a);
    const old = (
      await c.query<Record<string, unknown>>(
        "select r.canonical_payload_sha256,x.* from crays_core.oca_privacy_command_roots r join lateral(select * from crays_core.oca_privacy_command_receipt_versions y where y.tenant_id=r.tenant_id and y.idempotency_root_id=r.idempotency_root_id order by receipt_version desc limit 1)x on true where r.tenant_id=$1 and r.actor_id=$2 and r.actor_role_key=$3 and r.command_name=$4 and r.idempotency_key_sha256=$5",
        [a.tenantId, a.actorId, a.actorRole, name, kh],
      )
    ).rows[0];
    if (old) {
      if (old.canonical_payload_sha256 !== ph) {
        const nextSafeAction = "Reuse the original payload or a new key.",
          denialReceiptId = await persistDenial(
            c,
            a,
            name,
            "EXPECTED_DIGEST_CONFLICT",
            i.consentId,
            i.expectedConsentVersion ?? null,
            i.expectedConsentSha256 ?? null,
            correlationId,
            nextSafeAction,
          );
        await c.query("commit");
        return {
          status: "idempotency_conflict",
          replayed: false,
          receiptId: denialReceiptId,
          consentId: null,
          consentVersion: null,
          consentSha256: null,
          revocationReceiptId: null,
          preflight: denied("EXPECTED_DIGEST_CONFLICT"),
          nextSafeAction,
          correlationId,
        };
      }
      await c.query("commit");
      return {
        status: "replayed",
        replayed: true,
        receiptId: old.command_receipt_id,
        consentId: old.consequence_consent_id,
        consentVersion: old.consequence_consent_version,
        consentSha256: old.consequence_consent_sha256,
        revocationReceiptId: old.revocation_receipt_id,
        preflight: null,
        nextSafeAction: old.next_safe_action,
        correlationId,
      };
    }
    const pf =
      kind === "record"
        ? await preflightRecord(c, context, i)
        : await preflightRevoke(c, context, i);
    if (!pf.allowed) {
      const denialReceiptId = await persistDenial(
        c,
        a,
        name,
        pf.code,
        i.consentId,
        pf.currentConsentVersion,
        pf.currentConsentSha256,
        correlationId,
        pf.nextSafeAction,
      );
      await c.query("commit");
      return {
        status: "preflight_denied",
        replayed: false,
        receiptId: denialReceiptId,
        consentId: null,
        consentVersion: null,
        consentSha256: null,
        revocationReceiptId: null,
        preflight: pf,
        nextSafeAction: pf.nextSafeAction,
        correlationId,
      };
    }
    const cur = (
        await c.query<Record<string, unknown>>(
          "select * from crays_core.oca_consent_read_model where tenant_id=$1 and consent_id=$2",
          [a.tenantId, i.consentId],
        )
      ).rows[0],
      ver = (cur ? Number(cur.consent_version) : 0) + 1,
      ch = sha(
        canon({
          tenant: a.tenantId,
          id: i.consentId,
          ver,
          state: kind === "record" ? "granted" : "withdrawn",
          ph,
          actor: a.actorId,
        }),
      ),
      root = randomUUID(),
      receipt = randomUUID();
    await c.query(
      "insert into crays_core.oca_privacy_command_roots values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed',now())",
      [
        a.tenantId,
        root,
        a.actorId,
        a.actorRole,
        name,
        kh,
        ph,
        i.consentId,
        cur ? Number(cur.consent_version) : null,
        cur ? String(cur.consent_sha256) : null,
      ],
    );
    let rev: null | string = null;
    if (kind === "record") {
      await c.query(
        "insert into crays_core.oca_consent_versions values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now(),$18,null,'granted',$19,$20,$21,now())",
        [
          a.tenantId,
          i.consentId,
          ver,
          i.subjectRefSha256,
          i.subjectAuthorityRef,
          i.purposeGrantId,
          i.purposeGrantVersion,
          i.purposeGrantSha256,
          i.consentScopeCodes,
          i.recipientClasses,
          i.channels,
          i.fieldPaths,
          i.evidenceRef,
          i.noticeVersion,
          i.language,
          i.collectionMethod,
          a.actorId,
          i.validUntil,
          cur ? Number(cur.consent_version) : null,
          ch,
          correlationId,
        ],
      );
    } else {
      await c.query(
        "insert into crays_core.oca_consent_versions select tenant_id,consent_id,$3,subject_ref_sha256,subject_authority_ref,purpose_grant_id,purpose_grant_version,purpose_grant_sha256,consent_scope_codes,recipient_classes,channels,field_paths,$4,notice_version,language,collection_method,$5,given_at,valid_until,now(),'withdrawn',$6,$7,$8,now() from crays_core.oca_consent_versions where tenant_id=$1 and consent_id=$2 and consent_version=$6",
        [
          a.tenantId,
          i.consentId,
          ver,
          "revocation:" + i.reason,
          a.actorId,
          i.expectedConsentVersion,
          ch,
          correlationId,
        ],
      );
      rev = randomUUID();
      const rh = sha(
        canon({ rev, ch, kind: i.revocationKind, actor: a.actorId }),
      );
      await c.query(
        "insert into crays_core.oca_revocation_receipt_versions values($1,$2,1,$3,'ConsentVersion',$4,$5,$6,$7,$8,now(),$9,$10,$11,$12,'revoked','reconciled',$13,null,$14,$15,now())",
        [
          a.tenantId,
          rev,
          cur.subject_ref_sha256,
          i.consentId,
          ver,
          ch,
          i.revocationKind,
          a.actorId,
          cur.consent_scope_codes,
          cur.recipient_classes,
          cur.channels,
          cur.field_paths,
          "Consent withdrawn; re-authorize before any use.",
          rh,
          correlationId,
        ],
      );
    }
    const result = kind === "record" ? "CONSENT_RECORDED" : "CONSENT_REVOKED",
      next =
        kind === "record"
          ? "Consent recorded. Evaluate every disclosure against current authority."
          : "Consent withdrawn. Deny further use and reconcile caches.",
      rsh = sha(canon({ receipt, root, ch, result, correlationId }));
    await c.query(
      "insert into crays_core.oca_privacy_command_receipt_versions values($1,$2,1,$3,$4,$5,$6,'completed',$7,$8,$9,$10,$11,$12,$13,$14,now())",
      [
        a.tenantId,
        receipt,
        root,
        a.actorId,
        a.actorRole,
        name,
        result,
        i.consentId,
        ver,
        ch,
        rev,
        correlationId,
        next,
        rsh,
      ],
    );
    await c.query("commit");
    return {
      status: "applied",
      replayed: false,
      receiptId: receipt,
      consentId: i.consentId,
      consentVersion: ver,
      consentSha256: ch,
      revocationReceiptId: rev,
      preflight: pf,
      nextSafeAction: next,
      correlationId,
    };
  } catch {
    await c.query("rollback").catch(() => {});
    return {
      status: "unknown_outcome",
      replayed: false,
      receiptId: null,
      consentId: null,
      consentVersion: null,
      consentSha256: null,
      revocationReceiptId: null,
      preflight: null,
      nextSafeAction: "Preserve the exact key and reconcile before retry.",
      correlationId,
    };
  } finally {
    c.release();
  }
}
export const recordOcaConsent = (c: CraysRouteContext, r: unknown, x: string) =>
  command(c, r, "record", x);
export const revokeOcaConsent = (c: CraysRouteContext, r: unknown, x: string) =>
  command(c, r, "revoke", x);
export async function evaluateOcaFieldProjection(
  context: CraysRouteContext,
  raw: unknown,
  correlationId: string,
) {
  const p = projectionSchema.safeParse(raw),
    a = access(context),
    base = {
      decisionId: null,
      disclosedFieldPaths: [] as string[],
      reasonCodes: [] as string[],
      explainabilityReceiptId: null,
      correlationId,
    };
  if (!p.success)
    return {
      ...base,
      status: "denied",
      outcome: "denied",
      deniedFieldPaths: [],
      reasonCodes: ["VALIDATION_FAILED"],
      nextSafeAction: p.error.issues[0]?.message,
    };
  if (!a.allowed || !a.tenantId || !a.actorId)
    return {
      ...base,
      status: "denied",
      outcome: "denied",
      deniedFieldPaths: p.data.requestedFieldPaths,
      reasonCodes: [a.code],
      nextSafeAction: "Return to an authorized CRAYS Role Home.",
    };
  let c: PoolClient;
  try {
    c = await getCorePgPool().connect();
  } catch {
    return {
      ...base,
      status: "unavailable",
      outcome: "unknown",
      deniedFieldPaths: p.data.requestedFieldPaths,
      reasonCodes: ["AUTHORITY_UNAVAILABLE"],
      nextSafeAction: "Retry; never infer disclosure.",
    };
  }
  try {
    await c.query("begin");
    await scope(c, a);
    const d = p.data,
      specs = [
        [
          "oca_purpose_grant_versions",
          "purpose_grant_id",
          d.purposeGrantId,
          "grant_version",
          d.purposeGrantVersion,
          "grant_sha256",
          d.purposeGrantSha256,
        ],
        [
          "oca_consent_versions",
          "consent_id",
          d.consentId,
          "consent_version",
          d.consentVersion,
          "consent_sha256",
          d.consentSha256,
        ],
        [
          "oca_age_safety_decision_versions",
          "age_safety_decision_id",
          d.ageSafetyDecisionId,
          "decision_version",
          d.ageSafetyDecisionVersion,
          "decision_sha256",
          d.ageSafetyDecisionSha256,
        ],
        [
          "oca_disclosure_policy_versions",
          "disclosure_policy_id",
          d.disclosurePolicyId,
          "policy_version",
          d.disclosurePolicyVersion,
          "policy_sha256",
          d.disclosurePolicySha256,
        ],
      ] as const,
      found: Record<string, unknown>[] = [];
    const requiredCodes = [
      "PURPOSE_GRANT_REQUIRED",
      "CONSENT_REQUIRED",
      "AGE_ASSURANCE_REQUIRED",
      "DISCLOSURE_POLICY_REQUIRED",
    ];
    for (const [index, s] of specs.entries()) {
      const x = (
        await c.query<Record<string, unknown>>(
          "select * from crays_core." +
            s[0] +
            " where tenant_id=$1 and " +
            s[1] +
            "=$2 and " +
            s[3] +
            "=$3 and " +
            s[5] +
            "=$4",
          [a.tenantId, s[2], s[4], s[6]],
        )
      ).rows[0];
      if (!x) {
        const latest = (
            await c.query<Record<string, unknown>>(
              "select * from crays_core." +
                s[0] +
                " where tenant_id=$1 and " +
                s[1] +
                "=$2 order by " +
                s[3] +
                " desc limit 1",
              [a.tenantId, s[2]],
            )
          ).rows[0],
          reason = !latest
            ? requiredCodes[index]
            : Number(latest[s[3]]) !== s[4]
              ? "EXPECTED_VERSION_CONFLICT"
              : "EXPECTED_DIGEST_CONFLICT",
          nextSafeAction = "Reload canonical authority records.";
        await persistDenial(
          c,
          a,
          "EvaluateOcaFieldProjection",
          reason,
          d.consentId,
          d.consentVersion,
          d.consentSha256,
          correlationId,
          nextSafeAction,
        );
        await c.query("commit");
        return {
          ...base,
          status: "denied",
          outcome: "denied",
          deniedFieldPaths: d.requestedFieldPaths,
          reasonCodes: [reason],
          nextSafeAction,
        };
      }
      found.push(x);
    }
    const [g, co, age, pol] = found,
      now = new Date(),
      currentConsent = (
        await c.query<Record<string, unknown>>(
          "select * from crays_core.oca_consent_read_model where tenant_id=$1 and consent_id=$2",
          [a.tenantId, d.consentId],
        )
      ).rows[0],
      authorityReasons: string[] = [];
    if (new Date(String(g.valid_until)) <= now)
      authorityReasons.push("PURPOSE_GRANT_EXPIRED");
    else if (g.grant_state !== "active")
      authorityReasons.push("PURPOSE_NOT_ALLOWED");
    else if (!currentConsent) authorityReasons.push("CONSENT_REQUIRED");
    else if (currentConsent.consent_state === "withdrawn")
      authorityReasons.push("CONSENT_WITHDRAWN");
    else if (new Date(String(currentConsent.valid_until)) <= now)
      authorityReasons.push("CONSENT_EXPIRED");
    else if (Number(currentConsent.consent_version) !== d.consentVersion)
      authorityReasons.push("EXPECTED_VERSION_CONFLICT");
    else if (currentConsent.consent_sha256 !== d.consentSha256)
      authorityReasons.push("EXPECTED_DIGEST_CONFLICT");
    else if (
      !(co.consent_scope_codes as string[]).includes(String(g.purpose_code))
    )
      authorityReasons.push("CONSENT_SCOPE_MISMATCH");
    else if (age.age_band === "unknown")
      authorityReasons.push("AGE_ASSURANCE_REQUIRED");
    else if (age.age_band === "minor" && !age.guardian_authority_ref)
      authorityReasons.push("GUARDIAN_AUTHORITY_REQUIRED");
    else if (age.decision_outcome === "human_review")
      authorityReasons.push("HUMAN_REVIEW_REQUIRED");
    else if (age.decision_outcome !== "allowed")
      authorityReasons.push("SAFETY_POLICY_DENIED");
    else if (
      pol.policy_state !== "active" ||
      new Date(String(pol.valid_until)) <= now
    )
      authorityReasons.push("DISCLOSURE_POLICY_REQUIRED");
    else if (d.recipientClass !== pol.recipient_class)
      authorityReasons.push("RECIPIENT_NOT_ALLOWED");
    else if (d.channel !== pol.channel)
      authorityReasons.push("CHANNEL_NOT_ALLOWED");
    else if (d.modelRouteClass !== pol.model_route_class)
      authorityReasons.push("MODEL_ROUTE_NOT_ALLOWED");
    const active = authorityReasons.length === 0,
      sets = [
        g.allowed_field_paths,
        co.field_paths,
        age.allowed_field_paths,
        pol.allowed_field_paths,
      ].map((x) => new Set(x as string[])),
      blocked = new Set(pol.denied_field_paths as string[]),
      shown = active
        ? d.requestedFieldPaths.filter(
            (x) => sets.every((s) => s.has(x)) && !blocked.has(x),
          )
        : [],
      hidden = d.requestedFieldPaths.filter((x) => !shown.includes(x)),
      outcome =
        !active || !shown.length
          ? "denied"
          : hidden.length
            ? "partial"
            : "allowed",
      reasons = authorityReasons.length
        ? authorityReasons
        : hidden.length
          ? ["FIELD_NOT_ALLOWED"]
          : ["ALLOWED"],
      decision = randomUUID(),
      explain = randomUUID(),
      expires = new Date(
        Math.min(
          ...[
            g.valid_until,
            co.valid_until,
            age.valid_until,
            pol.valid_until,
          ].map((x) => new Date(String(x)).getTime()),
        ),
      ),
      safe = sha(canon({ shown, hidden, outcome })),
      dh = sha(canon({ decision, safe, correlationId }));
    await c.query(
      "insert into crays_core.oca_field_projection_decisions values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,now())",
      [
        a.tenantId,
        decision,
        d.purposeGrantId,
        d.purposeGrantVersion,
        d.purposeGrantSha256,
        d.consentId,
        d.consentVersion,
        d.consentSha256,
        d.ageSafetyDecisionId,
        d.ageSafetyDecisionVersion,
        d.ageSafetyDecisionSha256,
        d.disclosurePolicyId,
        d.disclosurePolicyVersion,
        d.disclosurePolicySha256,
        d.workloadIdentityId,
        d.workloadVersion,
        d.actorContextId,
        d.actorContextVersion,
        d.persistedOperationSha256,
        d.requestedFieldPaths,
        shown,
        hidden,
        pol.transformations,
        d.recipientClass,
        d.channel,
        d.modelRouteClass,
        outcome,
        reasons,
        expires.toISOString(),
        safe,
        dh,
        correlationId,
        a.actorId,
      ],
    );
    const eh = sha(canon({ explain, decision, outcome, reasons }));
    await c.query(
      "insert into crays_core.oca_explainability_receipts values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())",
      [
        a.tenantId,
        explain,
        decision,
        a.actorId,
        outcome,
        reasons,
        JSON.stringify({
          grant: d.purposeGrantVersion,
          consent: d.consentVersion,
          age: d.ageSafetyDecisionVersion,
          policy: d.disclosurePolicyVersion,
        }),
        shown.length,
        hidden.length,
        expires.toISOString(),
        outcome === "denied"
          ? "Do not disclose."
          : "Disclose only returned fields.",
        eh,
        correlationId,
      ],
    );
    if (reasons[0] !== "ALLOWED")
      await persistDenial(
        c,
        a,
        "EvaluateOcaFieldProjection",
        reasons[0],
        d.consentId,
        d.consentVersion,
        d.consentSha256,
        correlationId,
        outcome === "denied"
          ? "Do not disclose."
          : "Disclose only returned fields.",
      );
    await c.query("commit");
    return {
      status: "evaluated",
      decisionId: decision,
      outcome,
      disclosedFieldPaths: shown,
      deniedFieldPaths: hidden,
      reasonCodes: reasons,
      explainabilityReceiptId: explain,
      nextSafeAction:
        outcome === "denied"
          ? "Do not disclose."
          : "Disclose only returned fields.",
      correlationId,
    };
  } catch {
    await c.query("rollback").catch(() => {});
    return {
      ...base,
      status: "unavailable",
      outcome: "unknown",
      deniedFieldPaths: p.data.requestedFieldPaths,
      reasonCodes: ["AUTHORITY_UNAVAILABLE"],
      nextSafeAction: "Retry; never infer disclosure.",
    };
  } finally {
    c.release();
  }
}
export async function reconcileOcaPrivacyCommand(
  context: CraysRouteContext,
  k: string,
  correlationId: string,
) {
  const a = access(context),
    none = (status: string, next: string) => ({
      status,
      found: false,
      receiptId: null,
      commandName: null,
      resultCode: null,
      consentId: null,
      consentVersion: null,
      revocationReceiptId: null,
      nextSafeAction: next,
      correlationId,
    });
  if (!a.allowed || !a.tenantId || !a.actorId)
    return none("denied", "Return to an authorized CRAYS Role Home.");
  if (k.length < 16 || k.length > 200)
    return none("validation_failed", "Provide the exact original key.");
  let c: PoolClient;
  try {
    c = await getCorePgPool().connect();
  } catch {
    return none("unavailable", "Preserve the key and retry reconciliation.");
  }
  try {
    await c.query("begin read only");
    await scope(c, a);
    const x = (
      await c.query<Record<string, unknown>>(
        "select x.* from crays_core.oca_privacy_command_roots r join lateral(select * from crays_core.oca_privacy_command_receipt_versions y where y.tenant_id=r.tenant_id and y.idempotency_root_id=r.idempotency_root_id order by receipt_version desc limit 1)x on true where r.tenant_id=$1 and r.actor_id=$2 and r.actor_role_key=$3 and r.idempotency_key_sha256=$4",
        [a.tenantId, a.actorId, a.actorRole, sha(k)],
      )
    ).rows[0];
    await c.query("commit");
    return x
      ? {
          status: "reconciled",
          found: true,
          receiptId: x.command_receipt_id,
          commandName: x.command_name,
          resultCode: x.result_code,
          consentId: x.consequence_consent_id,
          consentVersion: x.consequence_consent_version,
          revocationReceiptId: x.revocation_receipt_id,
          nextSafeAction: x.next_safe_action,
          correlationId,
        }
      : none("not_found", "Preserve the key and investigate before retry.");
  } catch {
    await c.query("rollback").catch(() => {});
    return none("unavailable", "Preserve the key and retry reconciliation.");
  } finally {
    c.release();
  }
}
