import {createHash} from "node:crypto";

export const TRUSTED_HOTEL_BACKEND_CONTEXT_VERSION =
  "cclub.phase9.trusted-hotel-backend-context.v1" as const;
const SHA256 = /^[a-f0-9]{64}$/;
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const time = (value: string, code: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return parsed;
};

export type TrustedHotelBackendOperation =
  | "availability.read"
  | "room.read"
  | "booking.create"
  | "cancellation.read";

export type PrepareTrustedHotelBackendRequestInput = Readonly<{
  operation: TrustedHotelBackendOperation;
  requestId: string;
  requestedAt: string;
  contextSource: "server-auth-middleware";
  canonicalResolution: Readonly<{
    tenantResolutionReceiptId: string;
    receiptSha256: string;
    signatureVerified: true;
    canonicalTenantId: string;
    projectId: string;
    siteId: string;
    propertyId: string;
    propertyWorld: "forest-city-golf" | "forest-city-marina";
    legalEntityId: string;
    resolvedAt: string;
  }>;
  clientScope?: Readonly<{
    tenantId?: string;
    projectId?: string;
    siteId?: string;
    propertyId?: string;
  }>;
  principal: Readonly<{
    accountReferenceHash: string | null;
    assuranceLevel: "anonymous" | "AAL1" | "AAL2" | "AAL3";
    authenticatedAt: string | null;
    checkedAt: string;
    roles: readonly ("member" | "booking_operations" | "finance")[];
  }>;
  marinaAdmission: Readonly<{
    membershipReceiptId: string | null;
    membershipConfirmed: boolean;
    teamCode: string | null;
    grantReceiptId: string | null;
    grantId: string | null;
    grantStatus: "active" | "inactive" | null;
    accountReferenceHash: string | null;
    tenantId: string | null;
    projectId: string | null;
    siteId: string | null;
    propertyId: string | null;
  }> | null;
  bookingOwnership?: Readonly<{
    finalBookingReceiptId: string;
    accountReferenceHash: string;
    tenantId: string;
    propertyId: string;
    ownershipReceiptSha256: string;
  }>;
}>;

export function prepareTrustedHotelBackendRequest(
  input: PrepareTrustedHotelBackendRequestInput,
) {
  const resolution = input.canonicalResolution;
  if (!input.requestId.trim() || !resolution.tenantResolutionReceiptId.trim() ||
    !resolution.canonicalTenantId.trim() || !resolution.projectId.trim() ||
    !resolution.siteId.trim() || !resolution.propertyId.trim() ||
    !resolution.legalEntityId.trim()) {
    throw new Error("TRUSTED_HOTEL_BACKEND_REFERENCE_REQUIRED");
  }
  if (input.contextSource !== "server-auth-middleware" ||
    resolution.signatureVerified !== true || !SHA256.test(resolution.receiptSha256)) {
    throw new Error("TRUSTED_HOTEL_BACKEND_CONTEXT_UNTRUSTED");
  }
  if (input.clientScope && Object.values(input.clientScope).some((value) => value !== undefined)) {
    throw new Error("TRUSTED_HOTEL_BACKEND_CLIENT_SCOPE_OVERRIDE_DENIED");
  }
  const requestedAt = time(input.requestedAt, "TRUSTED_HOTEL_BACKEND_REQUEST_TIME_INVALID");
  const resolvedAt = time(resolution.resolvedAt, "TRUSTED_HOTEL_BACKEND_RESOLUTION_TIME_INVALID");
  const checkedAt = time(input.principal.checkedAt, "TRUSTED_HOTEL_BACKEND_PRINCIPAL_TIME_INVALID");
  if (resolvedAt > requestedAt || requestedAt - resolvedAt > 300_000 || checkedAt > requestedAt) {
    throw new Error("TRUSTED_HOTEL_BACKEND_CONTEXT_STALE");
  }
  const authenticated = input.principal.assuranceLevel !== "anonymous";
  if (authenticated) {
    if (!input.principal.accountReferenceHash || !SHA256.test(input.principal.accountReferenceHash) ||
      !input.principal.authenticatedAt) throw new Error("TRUSTED_HOTEL_BACKEND_PRINCIPAL_INVALID");
    const authenticatedAt = time(input.principal.authenticatedAt, "TRUSTED_HOTEL_BACKEND_PRINCIPAL_TIME_INVALID");
    if (checkedAt < authenticatedAt || checkedAt - authenticatedAt > 300_000) {
      throw new Error("TRUSTED_HOTEL_BACKEND_PRINCIPAL_STALE");
    }
  } else if (input.principal.accountReferenceHash || input.principal.authenticatedAt || input.principal.roles.length) {
    throw new Error("TRUSTED_HOTEL_BACKEND_ANONYMOUS_PRINCIPAL_INVALID");
  }

  if (input.operation === "booking.create" && resolution.propertyWorld === "forest-city-marina") {
    const admission = input.marinaAdmission;
    if (!authenticated || !["AAL2", "AAL3"].includes(input.principal.assuranceLevel) ||
      !admission || !admission.membershipReceiptId?.trim() || !admission.membershipConfirmed ||
      admission.teamCode !== "CRAYS_TEAM" || !admission.grantReceiptId?.trim() ||
      !admission.grantId?.trim() || admission.grantStatus !== "active" ||
      admission.accountReferenceHash !== input.principal.accountReferenceHash ||
      admission.tenantId !== resolution.canonicalTenantId ||
      admission.projectId !== resolution.projectId || admission.siteId !== resolution.siteId ||
      admission.propertyId !== resolution.propertyId) {
      throw new Error("TRUSTED_HOTEL_BACKEND_MARINA_ADMISSION_REQUIRED");
    }
  }
  if (input.operation === "cancellation.read") {
    const ownsBooking = input.bookingOwnership && authenticated &&
      input.bookingOwnership.accountReferenceHash === input.principal.accountReferenceHash &&
      input.bookingOwnership.tenantId === resolution.canonicalTenantId &&
      input.bookingOwnership.propertyId === resolution.propertyId &&
      SHA256.test(input.bookingOwnership.ownershipReceiptSha256);
    const operator = input.principal.roles.includes("booking_operations") ||
      input.principal.roles.includes("finance");
    if (!ownsBooking && !operator) throw new Error("TRUSTED_HOTEL_BACKEND_CANCELLATION_READ_DENIED");
  }
  const scope = Object.freeze({
    tenantId: resolution.canonicalTenantId,
    projectId: resolution.projectId,
    siteId: resolution.siteId,
    propertyId: resolution.propertyId,
    propertyWorld: resolution.propertyWorld,
    legalEntityId: resolution.legalEntityId,
  });
  const body = Object.freeze({
    contractVersion: TRUSTED_HOTEL_BACKEND_CONTEXT_VERSION,
    requestId: input.requestId,
    operation: input.operation,
    requestedAt: input.requestedAt,
    tenantResolutionReceiptId: resolution.tenantResolutionReceiptId,
    tenantResolutionSha256: resolution.receiptSha256,
    scope,
    principal: Object.freeze({
      accountReferenceHash: input.principal.accountReferenceHash,
      assuranceLevel: input.principal.assuranceLevel,
      roles: Object.freeze([...input.principal.roles]),
    }),
  });
  return Object.freeze({
    ...body,
    envelopeSha256: digest(body),
    contextTrusted: true as const,
    golfPublicBookingAllowed:
      input.operation === "booking.create" && resolution.propertyWorld === "forest-city-golf",
    marinaPublicVisibilityAllowed:
      ["availability.read", "room.read"].includes(input.operation) &&
      resolution.propertyWorld === "forest-city-marina",
    marinaBookingAdmissionSatisfied:
      input.operation === "booking.create" && resolution.propertyWorld === "forest-city-marina",
    externalActionPerformed: false as const,
    formalActionAuthorized: false as const,
  });
}

export type TrustedHotelBackendPorts<TAvailability,TDetail,TBooking,TCancellation> = Readonly<{
  readAvailability(envelope: ReturnType<typeof prepareTrustedHotelBackendRequest>): Promise<TAvailability>;
  readRoom(envelope: ReturnType<typeof prepareTrustedHotelBackendRequest>): Promise<TDetail>;
  createBookingCommand(envelope: ReturnType<typeof prepareTrustedHotelBackendRequest>): Promise<TBooking>;
  readCancellation(envelope: ReturnType<typeof prepareTrustedHotelBackendRequest>): Promise<TCancellation>;
}>;

export async function executeTrustedHotelBackendRequest<A,D,B,C>(
  envelope: ReturnType<typeof prepareTrustedHotelBackendRequest>,
  ports: TrustedHotelBackendPorts<A,D,B,C>,
) {
  if (!envelope.contextTrusted || !SHA256.test(envelope.envelopeSha256)) {
    throw new Error("TRUSTED_HOTEL_BACKEND_ENVELOPE_INVALID");
  }
  if (envelope.operation === "availability.read") return ports.readAvailability(envelope);
  if (envelope.operation === "room.read") return ports.readRoom(envelope);
  if (envelope.operation === "booking.create") return ports.createBookingCommand(envelope);
  return ports.readCancellation(envelope);
}
