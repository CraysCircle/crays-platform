import "server-only";

import { createHash } from "node:crypto";

import type { KdsDatabase } from "@/store-operations/kds";
import {
  loadCanonicalVendureCustomerProjection,
} from "./canonical-vendure-customer-projection-repository";
import {
  registerCanonicalVendureCustomerProjection,
  type CustomerProjectionRegistrationProvider,
} from "./canonical-vendure-customer-registration";
import {
  reconcileCanonicalVendureCustomerLogin,
} from "./canonical-vendure-customer-reconciliation";
import {
  disableCanonicalVendureCustomerProjection,
  type CustomerProjectionDisableProvider,
} from "./canonical-vendure-customer-disable";
import {
  reenableCanonicalVendureCustomerProjection,
  type CustomerProjectionReenableProvider,
} from "./canonical-vendure-customer-reenable";
import {
  changeCanonicalVendureCustomerEmail,
  type CustomerProjectionEmailChangeProvider,
} from "./canonical-vendure-customer-email-change";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const PROVIDER_SUBJECT = /^[A-Za-z0-9][A-Za-z0-9_.:@|\/-]{2,255}$/;
const VERTICALS = ["coffee", "retail", "gym", "clubs"] as const;
const responseHeaders = { "cache-control": "private, no-store" };

function hasExactErrorName(error: unknown, names: readonly string[]) {
  return error instanceof Error && names.includes(error.name);
}

function isRejectedProviderError(error: unknown) {
  if (!hasExactErrorName(error, ["CustomerProjectionProviderError"])) return false;
  return (error as Error & { outcome?: unknown }).outcome === "rejected";
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function exactNames(user: Readonly<Record<string, unknown>>) {
  const given = typeof user.given_name === "string" ? user.given_name.trim() : "";
  const family = typeof user.family_name === "string" ? user.family_name.trim() : "";
  if (given && family) return { firstName: given, lastName: family };
  const name = typeof user.name === "string" ? user.name.trim().split(/\s+/) : [];
  if (name.length < 2) return null;
  return { firstName: name.slice(0, -1).join(" "), lastName: name.at(-1)! };
}

export async function handleCustomerProjectionReadRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string;
      accountId: string | null;
    }>>;
    load?: typeof loadCanonicalVendureCustomerProjection;
  }>,
) {
  const authority = await dependencies.resolveAuthority(request);
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId) {
    return Response.json({ status: "forbidden", reason: "A mapped CRAYS session is required." },
      { status: 403, headers: responseHeaders });
  }
  const url = new URL(request.url);
  const admitted = ["expectedAssignmentVersion", "expectedProjectionVersion", "storeId", "verticalRoot"];
  if ([...url.searchParams.keys()].some((key) => !admitted.includes(key))) {
    return Response.json({ status: "invalid", reason: "Check the Store projection request." },
      { status: 400, headers: responseHeaders });
  }
  const verticalRoot = url.searchParams.get("verticalRoot");
  const storeId = url.searchParams.get("storeId");
  const parseVersion = (name: string) => {
    const value = url.searchParams.get(name);
    if (value === null) return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  };
  const expectedAssignmentVersion = parseVersion("expectedAssignmentVersion");
  const expectedProjectionVersion = parseVersion("expectedProjectionVersion");
  if (!verticalRoot || !VERTICALS.includes(verticalRoot as (typeof VERTICALS)[number]) ||
      !storeId || !ID.test(storeId) || expectedAssignmentVersion === null ||
      expectedProjectionVersion === null) {
    return Response.json({ status: "invalid", reason: "Check the Store projection request." },
      { status: 400, headers: responseHeaders });
  }
  try {
    const projection = await (dependencies.load ?? loadCanonicalVendureCustomerProjection)(
      dependencies.database, {
        canonicalAccountId: authority.accountId,
        verticalRoot: verticalRoot as (typeof VERTICALS)[number], storeId,
        purpose: "account", use: "active_session",
        expectedAssignmentVersion: expectedAssignmentVersion ?? undefined,
        expectedProjectionVersion: expectedProjectionVersion ?? undefined,
      },
    );
    return Response.json({
      status: "ready",
      projection: {
        relationshipId: projection.commerceCustomerRelationshipId,
        relationshipVersion: projection.relationshipVersion,
        projectionId: projection.vendureCustomerProjectionId,
        projectionVersion: projection.projectionVersion,
        providerVersion: projection.providerVersion,
        lifecycleState: projection.projectionLifecycleState,
        lastReconciledAt: projection.lastReconciledAt,
        verticalRoot: projection.context.verticalRoot,
        storeId: projection.context.storeId,
        assignmentVersion: projection.context.storeOperatorAssignmentVersion,
      },
      boundaries: {
        accountResolvedServerSide: true,
        providerIdentifiersExposed: false,
        identityHashesExposed: false,
      },
    }, { status: 200, headers: responseHeaders });
  } catch (error) {
    if (hasExactErrorName(error, ["CustomerProjectionAuthorityError"])) {
      return Response.json({ status: "not_found", reason: "No active Store customer projection was found." },
        { status: 404, headers: responseHeaders });
    }
    return Response.json({ status: "unavailable", reason: "Customer projection is temporarily unavailable." },
      { status: 503, headers: responseHeaders });
  }
}

export async function handleCustomerProjectionLoginReconciliationRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    provider: CustomerProjectionRegistrationProvider;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string;
      accountId: string | null;
      providerUser: Readonly<Record<string, unknown>> | null;
    }>>;
    reconcile?: typeof reconcileCanonicalVendureCustomerLogin;
  }>,
) {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid", reason: "Reconciliation request is too large." },
      { status: 413, headers: responseHeaders });
  }
  const authority = await dependencies.resolveAuthority(request);
  const user = authority.providerUser;
  const names = user ? exactNames(user) : null;
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId ||
      !user || typeof user.sub !== "string" || !PROVIDER_SUBJECT.test(user.sub) ||
      user.email_verified !== true || typeof user.email !== "string" || !names) {
    return Response.json({ status: "forbidden", reason: "A mapped verified CRAYS session is required." },
      { status: 403, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admitted = ["expectedAssignmentVersion", "expectedProjectionVersion",
    "idempotencyKey", "storeId", "verticalRoot"];
  if (!body || Object.keys(body).some((key) => !admitted.includes(key)) ||
      typeof body.verticalRoot !== "string" ||
      !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
      typeof body.storeId !== "string" || !ID.test(body.storeId) ||
      !Number.isSafeInteger(body.expectedProjectionVersion) ||
      Number(body.expectedProjectionVersion) < 1 ||
      (body.expectedAssignmentVersion !== undefined &&
        (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
          Number(body.expectedAssignmentVersion) < 1)) ||
      typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 ||
      !ID.test(body.idempotencyKey)) {
    return Response.json({ status: "invalid", reason: "Check the login reconciliation request." },
      { status: 400, headers: responseHeaders });
  }
  const email = user.email.trim().toLowerCase();
  try {
    const result = await (dependencies.reconcile ?? reconcileCanonicalVendureCustomerLogin)(
      dependencies.database, dependencies.provider, {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        expectedProjectionVersion: Number(body.expectedProjectionVersion),
        externalAuthStrategy: "auth0-crays", externalIdentifier: user.sub,
        emailAddress: email, firstName: names.firstName, lastName: names.lastName,
        profileSha256: sha256(JSON.stringify({ version: 1, sub: user.sub, email,
          firstName: names.firstName, lastName: names.lastName, emailVerified: true })),
        sourceVersion: "auth0-profile-v1",
        authIdentityReferenceSha256: sha256(`auth0:${user.sub}`),
        idempotencyKey: body.idempotencyKey,
      },
    );
    return Response.json({
      status: result.coreReceipt.status,
      receipt: {
        eventId: result.coreReceipt.eventId,
        projectionId: result.coreReceipt.projectionId,
        projectionVersion: result.coreReceipt.projectionVersion,
        lifecycleState: result.coreReceipt.lifecycleState,
        actionReceiptId: result.coreReceipt.actionReceiptId,
      },
      boundaries: {
        accountAndProviderProfileResolvedServerSide: true,
        providerIdentityMatchedExistingProjection: true,
        identityHashesExposed: false,
      },
    }, { status: 200, headers: responseHeaders });
  } catch (error) {
    if (hasExactErrorName(error, [
          "CustomerProjectionAuthorityError",
          "CustomerProjectionReconciliationError",
          "CustomerProjectionCommandError",
        ]) || isRejectedProviderError(error)) {
      return Response.json({ status: "conflict", reason: "Login reconciliation could not be applied safely." },
        { status: 409, headers: responseHeaders });
    }
    return Response.json({ status: "unavailable", reason: "Login reconciliation requires recovery." },
      { status: 503, headers: responseHeaders });
  }
}

export async function handleCustomerProjectionDisableRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase; provider: CustomerProjectionDisableProvider;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string; accountId: string | null;
      providerUser: Readonly<Record<string, unknown>> | null;
    }>>;
    disable?: typeof disableCanonicalVendureCustomerProjection;
  }>,
) {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid" }, { status: 413, headers: responseHeaders });
  }
  const authority = await dependencies.resolveAuthority(request);
  const subject = authority.providerUser?.sub;
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId ||
      typeof subject !== "string" || !PROVIDER_SUBJECT.test(subject)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admitted = ["expectedAssignmentVersion", "expectedProjectionVersion",
    "idempotencyKey", "storeId", "verticalRoot"];
  if (!body || Object.keys(body).some((key) => !admitted.includes(key)) ||
      typeof body.verticalRoot !== "string" ||
      !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
      typeof body.storeId !== "string" || !ID.test(body.storeId) ||
      !Number.isSafeInteger(body.expectedProjectionVersion) ||
      Number(body.expectedProjectionVersion) < 1 ||
      (body.expectedAssignmentVersion !== undefined &&
        (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
          Number(body.expectedAssignmentVersion) < 1)) ||
      typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 ||
      !ID.test(body.idempotencyKey)) {
    return Response.json({ status: "invalid" }, { status: 400, headers: responseHeaders });
  }
  try {
    const result = await (dependencies.disable ?? disableCanonicalVendureCustomerProjection)(
      dependencies.database, dependencies.provider, {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        expectedProjectionVersion: Number(body.expectedProjectionVersion),
        externalAuthStrategy: "auth0-crays", externalIdentifier: subject,
        authIdentityReferenceSha256: sha256(`auth0:${subject}`),
        idempotencyKey: body.idempotencyKey,
      },
    );
    return Response.json({ status: result.coreReceipt.status, receipt: {
      eventId: result.coreReceipt.eventId, projectionId: result.coreReceipt.projectionId,
      projectionVersion: result.coreReceipt.projectionVersion,
      lifecycleState: result.coreReceipt.lifecycleState,
      actionReceiptId: result.coreReceipt.actionReceiptId,
    }, boundaries: { canonicalPersonDeleted: false,
      otherStoreRelationshipsChanged: false, providerIdentifiersExposed: false } },
    { status: 200, headers: responseHeaders });
  } catch (error) {
    if (hasExactErrorName(error, [
          "CustomerProjectionAuthorityError",
          "CustomerProjectionDisableError",
          "CustomerProjectionCommandError",
        ]) || isRejectedProviderError(error)) {
      return Response.json({ status: "conflict" }, { status: 409, headers: responseHeaders });
    }
    return Response.json({ status: "unavailable" }, { status: 503, headers: responseHeaders });
  }
}

export async function handleCustomerProjectionReenableRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase; provider: CustomerProjectionReenableProvider;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string; accountId: string | null;
      providerUser: Readonly<Record<string, unknown>> | null;
    }>>;
    reenable?: typeof reenableCanonicalVendureCustomerProjection;
  }>,
) {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid" }, { status: 413, headers: responseHeaders });
  }
  const authority = await dependencies.resolveAuthority(request);
  const subject = authority.providerUser?.sub;
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId ||
      typeof subject !== "string" || !PROVIDER_SUBJECT.test(subject)) {
    return Response.json({ status: "forbidden" }, { status: 403, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admitted = ["expectedAssignmentVersion", "expectedProjectionVersion",
    "idempotencyKey", "storeId", "verticalRoot"];
  if (!body || Object.keys(body).some((key) => !admitted.includes(key)) ||
      typeof body.verticalRoot !== "string" ||
      !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
      typeof body.storeId !== "string" || !ID.test(body.storeId) ||
      !Number.isSafeInteger(body.expectedProjectionVersion) ||
      Number(body.expectedProjectionVersion) < 1 ||
      (body.expectedAssignmentVersion !== undefined &&
        (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
          Number(body.expectedAssignmentVersion) < 1)) ||
      typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 ||
      !ID.test(body.idempotencyKey)) {
    return Response.json({ status: "invalid" }, { status: 400, headers: responseHeaders });
  }
  try {
    const result = await (dependencies.reenable ?? reenableCanonicalVendureCustomerProjection)(
      dependencies.database, dependencies.provider, {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        expectedProjectionVersion: Number(body.expectedProjectionVersion),
        authIdentityReferenceSha256: sha256(`auth0:${subject}`),
        idempotencyKey: body.idempotencyKey,
      });
    return Response.json({ status: result.coreReceipt.status, receipt: {
      eventId: result.coreReceipt.eventId, projectionId: result.coreReceipt.projectionId,
      projectionVersion: result.coreReceipt.projectionVersion,
      lifecycleState: result.coreReceipt.lifecycleState,
      actionReceiptId: result.coreReceipt.actionReceiptId,
    }, boundaries: { canonicalPersonRecreated: false,
      providerCustomerRecreated: false, otherStoreRelationshipsChanged: false } },
    { status: 200, headers: responseHeaders });
  } catch (error) {
    if (hasExactErrorName(error, [
          "CustomerProjectionAuthorityError",
          "CustomerProjectionReenableError",
          "CustomerProjectionCommandError",
        ]) || isRejectedProviderError(error)) {
      return Response.json({ status: "conflict" }, { status: 409, headers: responseHeaders });
    }
    return Response.json({ status: "unavailable" }, { status: 503, headers: responseHeaders });
  }
}

export async function handleCustomerProjectionRegistrationRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase;
    provider: CustomerProjectionRegistrationProvider;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string;
      accountId: string | null;
      providerUser: Readonly<Record<string, unknown>> | null;
    }>>;
    register?: typeof registerCanonicalVendureCustomerProjection;
  }>,
) {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid", reason: "Registration request is too large." },
      { status: 413, headers: responseHeaders });
  }
  const authority = await dependencies.resolveAuthority(request);
  const user = authority.providerUser;
  const names = user ? exactNames(user) : null;
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId ||
      !user || typeof user.sub !== "string" || !PROVIDER_SUBJECT.test(user.sub) ||
      user.email_verified !== true || typeof user.email !== "string" || !names) {
    return Response.json({ status: "forbidden", reason: "A mapped verified CRAYS session is required." },
      { status: 403, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admittedKeys = ["expectedAssignmentVersion", "idempotencyKey", "storeId", "verticalRoot"];
  const keys = body ? Object.keys(body) : [];
  if (!body || keys.some((key) => !admittedKeys.includes(key)) ||
      typeof body.verticalRoot !== "string" ||
      !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
      typeof body.storeId !== "string" || !ID.test(body.storeId) ||
      typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 ||
      !ID.test(body.idempotencyKey) ||
      (body.expectedAssignmentVersion !== undefined &&
        (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
          Number(body.expectedAssignmentVersion) < 1))) {
    return Response.json({ status: "invalid", reason: "Check the Store registration request." },
      { status: 400, headers: responseHeaders });
  }
  const email = user.email.trim().toLowerCase();
  const profileSha256 = sha256(JSON.stringify({
    version: 1, sub: user.sub, email, firstName: names.firstName,
    lastName: names.lastName, emailVerified: true,
  }));
  try {
    const result = await (dependencies.register ?? registerCanonicalVendureCustomerProjection)(
      dependencies.database, dependencies.provider, {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        purposes: ["account", "order", "support"],
        externalAuthStrategy: "auth0-crays", externalIdentifier: user.sub,
        emailAddress: email, firstName: names.firstName, lastName: names.lastName,
        profileSha256, sourceVersion: "auth0-profile-v1",
        authIdentityReferenceSha256: sha256(`auth0:${user.sub}`),
        idempotencyKey: body.idempotencyKey,
      },
    );
    return Response.json({
      status: result.coreReceipt.status,
      receipt: {
        actionReceiptId: result.coreReceipt.actionReceiptId,
        relationshipId: result.coreReceipt.relationshipId,
        projectionId: result.coreReceipt.projectionId,
        projectionVersion: result.coreReceipt.projectionVersion,
        lifecycleState: result.coreReceipt.lifecycleState,
      },
      boundaries: {
        accountAndProviderProfileResolvedServerSide: true,
        providerScopeResolvedServerSide: true,
        marketingConsentGranted: false,
        identityHashesExposed: false,
      },
    }, { status: result.coreReceipt.status === "applied" ? 201 : 200,
      headers: responseHeaders });
  } catch (error) {
    if (hasExactErrorName(error, [
          "CustomerProjectionRegistrationError",
          "CustomerProjectionCommandError",
        ]) || isRejectedProviderError(error)) {
      return Response.json({ status: "conflict", reason: "Customer registration could not be applied safely." },
        { status: 409, headers: responseHeaders });
    }
    return Response.json({ status: "unavailable", reason: "Customer registration outcome requires recovery." },
      { status: 503, headers: responseHeaders });
  }
}

export async function handleCustomerProjectionEmailChangeRequest(
  request: Request,
  dependencies: Readonly<{
    database: KdsDatabase; provider: CustomerProjectionEmailChangeProvider;
    resolveAuthority: (request: Request) => Promise<Readonly<{
      authoritySource: string; accountId: string | null;
      providerUser: Readonly<Record<string, unknown>> | null;
    }>>;
    changeEmail?: typeof changeCanonicalVendureCustomerEmail;
  }>,
) {
  if (Number(request.headers.get("content-length") ?? "0") > 4_096) {
    return Response.json({ status: "invalid" }, { status: 413, headers: responseHeaders });
  }
  const authority = await dependencies.resolveAuthority(request);
  const user = authority.providerUser;
  if (authority.authoritySource !== "auth0-crays-session" || !authority.accountId ||
      !user || typeof user.sub !== "string" || !PROVIDER_SUBJECT.test(user.sub) ||
      user.email_verified !== true || typeof user.email !== "string") {
    return Response.json({ status: "forbidden" }, { status: 403, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const admitted = ["expectedAssignmentVersion", "expectedProjectionVersion",
    "idempotencyKey", "storeId", "verticalRoot"];
  if (!body || Object.keys(body).some((key) => !admitted.includes(key)) ||
      typeof body.verticalRoot !== "string" ||
      !VERTICALS.includes(body.verticalRoot as (typeof VERTICALS)[number]) ||
      typeof body.storeId !== "string" || !ID.test(body.storeId) ||
      !Number.isSafeInteger(body.expectedProjectionVersion) ||
      Number(body.expectedProjectionVersion) < 1 ||
      (body.expectedAssignmentVersion !== undefined &&
        (!Number.isSafeInteger(body.expectedAssignmentVersion) ||
          Number(body.expectedAssignmentVersion) < 1)) ||
      typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 ||
      !ID.test(body.idempotencyKey)) {
    return Response.json({ status: "invalid" }, { status: 400, headers: responseHeaders });
  }
  const emailAddress = user.email.trim().toLowerCase();
  try {
    const result = await (dependencies.changeEmail ?? changeCanonicalVendureCustomerEmail)(
      dependencies.database, dependencies.provider, {
        canonicalAccountId: authority.accountId,
        verticalRoot: body.verticalRoot as (typeof VERTICALS)[number],
        storeId: body.storeId,
        expectedAssignmentVersion: body.expectedAssignmentVersion as number | undefined,
        expectedProjectionVersion: Number(body.expectedProjectionVersion),
        externalAuthStrategy: "auth0-crays", externalIdentifier: user.sub,
        emailAddress, sourceVersion: "auth0-profile-v1",
        authIdentityReferenceSha256: sha256(`auth0:${user.sub}`),
        idempotencyKey: body.idempotencyKey,
      });
    return Response.json({ status: result.coreReceipt.status, receipt: {
      eventId: result.coreReceipt.eventId, projectionId: result.coreReceipt.projectionId,
      projectionVersion: result.coreReceipt.projectionVersion,
      lifecycleState: result.coreReceipt.lifecycleState,
      actionReceiptId: result.coreReceipt.actionReceiptId,
    }, boundaries: { emailResolvedFromVerifiedSession: true,
      providerIdentityMatchedExistingProjection: true,
      plaintextEmailPersistedInCoreEvent: false, providerIdentifiersExposed: false } },
    { status: 200, headers: responseHeaders });
  } catch (error) {
    if (hasExactErrorName(error, [
          "CustomerProjectionAuthorityError",
          "CustomerProjectionEmailChangeError",
          "CustomerProjectionCommandError",
        ]) || isRejectedProviderError(error)) {
      return Response.json({ status: "conflict" }, { status: 409, headers: responseHeaders });
    }
    return Response.json({ status: "unavailable" }, { status: 503, headers: responseHeaders });
  }
}
