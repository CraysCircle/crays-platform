import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  applyCommerceCustomerConsentDecision,
  CommerceCustomerConsentCommandError,
  loadCommerceCustomerConsentState,
} from "./canonical-commerce-customer-consent-command";
import { isCustomerProjectionAuthorityError } from
  "./canonical-vendure-customer-projection-repository";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const PURPOSES = ["account", "order", "support", "loyalty", "marketing"] as const;
const DECISIONS = ["granted", "denied", "withdrawn"] as const;
const headers = { "cache-control": "private, no-store" };

const CONSENT_CONFLICT_CODES = new Set([
  "CUSTOMER_CONSENT_INPUT_INVALID",
  "CUSTOMER_CONSENT_STALE",
  "CUSTOMER_CONSENT_TRANSITION_DENIED",
  "CUSTOMER_CONSENT_REPLAY_MISMATCH",
]);

function isConsentCommandConflict(error: unknown) {
  if (error instanceof CommerceCustomerConsentCommandError) return true;
  if (!(error instanceof Error) ||
      error.name !== "CommerceCustomerConsentCommandError") return false;
  const code = (error as Error & { code?: unknown }).code;
  return typeof code === "string" && CONSENT_CONFLICT_CODES.has(code);
}

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

export function createEnvironmentConsentPolicyRegistry(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  return (purpose: (typeof PURPOSES)[number]) => {
    let parsed: unknown;
    try { parsed = JSON.parse(environment.CRAYS_COMMERCE_CONSENT_POLICY_VERSION_JSON ?? ""); }
    catch { throw new Error("CUSTOMER_CONSENT_POLICY_REGISTRY_UNCONFIGURED"); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("CUSTOMER_CONSENT_POLICY_REGISTRY_INVALID");
    }
    const value = (parsed as Record<string, unknown>)[purpose];
    if (typeof value !== "string" || !ID.test(value)) {
      throw new Error("CUSTOMER_CONSENT_POLICY_VERSION_UNRESOLVED");
    }
    return value;
  };
}

type Authority = { authoritySource: string; accountId: string | null };

export async function handleCustomerConsentCommandRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    resolveAuthority: (request: Request) => Promise<Readonly<Authority>>;
    policyVersionForPurpose: (purpose: (typeof PURPOSES)[number]) => string;
    apply?: typeof applyCommerceCustomerConsentDecision;
  }>,
) {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid", reason: "Consent request is too large." },
      { status: 413, headers });
  }
  const authority = await dependencies.resolveAuthority(request);
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId) {
    return Response.json({ status: "forbidden", reason: "A mapped CRAYS session is required." },
      { status: 403, headers });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admitted = ["decision", "expectedAssignmentVersion", "expectedProjectionVersion",
    "expectedSupersedesConsentId", "idempotencyKey", "purpose", "storeId", "verticalRoot"];
  if (!body || Object.keys(body).some((key) => !admitted.includes(key)) ||
      typeof body.verticalRoot !== "string" ||
      !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
      typeof body.storeId !== "string" || !ID.test(body.storeId) ||
      typeof body.purpose !== "string" ||
      !PURPOSES.includes(body.purpose as (typeof PURPOSES)[number]) ||
      typeof body.decision !== "string" ||
      !DECISIONS.includes(body.decision as (typeof DECISIONS)[number]) ||
      !Number.isSafeInteger(body.expectedProjectionVersion) ||
      Number(body.expectedProjectionVersion) < 1 ||
      (body.expectedAssignmentVersion !== undefined &&
        (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
          Number(body.expectedAssignmentVersion) < 1)) ||
      (body.expectedSupersedesConsentId !== undefined &&
        (typeof body.expectedSupersedesConsentId !== "string" ||
          !ID.test(body.expectedSupersedesConsentId))) ||
      typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 ||
      !ID.test(body.idempotencyKey)) {
    return Response.json({ status: "invalid", reason: "Check the consent decision request." },
      { status: 400, headers });
  }
  try {
    const purpose = body.purpose as (typeof PURPOSES)[number];
    const decision = body.decision as (typeof DECISIONS)[number];
    const policyVersion = dependencies.policyVersionForPurpose(purpose);
    const evidenceSha256 = sha256(JSON.stringify({
      version: 1, accountId: authority.accountId,
      verticalRoot: body.verticalRoot, storeId: body.storeId,
      purpose, decision, policyVersion,
      expectedSupersedesConsentId: body.expectedSupersedesConsentId ?? null,
      idempotencyKey: body.idempotencyKey,
    }));
    const receipt = await (dependencies.apply ?? applyCommerceCustomerConsentDecision)(
      dependencies.database, {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        expectedProjectionVersion: Number(body.expectedProjectionVersion),
        purpose, decision, policyVersion, evidenceSha256,
        expectedSupersedesConsentId: body.expectedSupersedesConsentId as string | undefined,
        idempotencyKey: body.idempotencyKey,
      },
    );
    return Response.json({ status: receipt.status, receipt: {
      consentId: receipt.consentId, receiptId: receipt.receiptId,
      purpose: receipt.purpose, decision: receipt.decision,
    }, boundaries: {
      accountResolvedServerSide: true, policyVersionResolvedServerSide: true,
      evidenceHashExposed: false, relationshipPurposeExpanded: false,
    } }, { status: receipt.status === "applied" ? 201 : 200, headers });
  } catch (error) {
    if (isConsentCommandConflict(error) ||
        isCustomerProjectionAuthorityError(error)) {
      return Response.json({ status: "conflict", reason: "Consent decision could not be applied safely." },
        { status: 409, headers });
    }
    return Response.json({ status: "unavailable", reason: "Consent authority is temporarily unavailable." },
      { status: 503, headers });
  }
}

export async function handleCustomerConsentReadRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    resolveAuthority: (request: Request) => Promise<Readonly<Authority>>;
    load?: typeof loadCommerceCustomerConsentState;
  }>,
) {
  const authority = await dependencies.resolveAuthority(request);
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId) {
    return Response.json({ status: "forbidden" }, { status: 403, headers });
  }
  const url = new URL(request.url);
  const admitted = ["expectedAssignmentVersion", "expectedProjectionVersion",
    "purpose", "storeId", "verticalRoot"];
  if ([...url.searchParams.keys()].some((key) => !admitted.includes(key))) {
    return Response.json({ status: "invalid" }, { status: 400, headers });
  }
  const verticalRoot = url.searchParams.get("verticalRoot");
  const storeId = url.searchParams.get("storeId");
  const purpose = url.searchParams.get("purpose");
  const version = (name: string) => {
    const raw = url.searchParams.get(name);
    if (raw === null) return undefined;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  };
  const expectedAssignmentVersion = version("expectedAssignmentVersion");
  const expectedProjectionVersion = version("expectedProjectionVersion");
  if (!verticalRoot || !VERTICALS.includes(verticalRoot as (typeof VERTICALS)[number]) ||
      !storeId || !ID.test(storeId) || !purpose ||
      !PURPOSES.includes(purpose as (typeof PURPOSES)[number]) ||
      expectedAssignmentVersion === null || expectedProjectionVersion === null) {
    return Response.json({ status: "invalid" }, { status: 400, headers });
  }
  try {
    const state = await (dependencies.load ?? loadCommerceCustomerConsentState)(
      dependencies.database, { canonicalAccountId: authority.accountId,
        verticalRoot: verticalRoot as (typeof VERTICALS)[number], storeId,
        purpose: purpose as (typeof PURPOSES)[number],
        expectedAssignmentVersion: expectedAssignmentVersion ?? undefined,
        expectedProjectionVersion: expectedProjectionVersion ?? undefined },
    );
    return Response.json({ status: "ready", consent: state }, { status: 200, headers });
  } catch (error) {
    if (isConsentCommandConflict(error) ||
        isCustomerProjectionAuthorityError(error)) {
      return Response.json({ status: "not_found" }, { status: 404, headers });
    }
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
