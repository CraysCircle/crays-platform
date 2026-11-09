import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { VendureOrderCommand } from "./vendure-order-command";

export const VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT = Object.freeze({
  schema: "crays.clubs.vendure-sandbox-adapter.v1",
  version: "1.0.0",
  readinessEndpoint:
    "/api/crays/clubs/team/integration-delivery-status/vendure",
  method: "GET",
  cache: "no-store",
  environment: "TEST",
  sandboxOnly: true,
  livemode: false,
  production: false,
  readinessStates: Object.freeze([
    "provider_not_bound",
    "configuration_incomplete",
    "sandbox_ready",
  ]),
  allowedRoles: Object.freeze(["crays-management", "reviewer", "admin"]),
  assurance: Object.freeze({ allowed: ["aal2", "aal3"] }),
  deliveryClaimed: false,
  containsPersonalData: false,
  exposesIdentifiers: false,
  exposesSecrets: false,
  exposesCounts: false,
  callsProviderOnReadiness: false,
  writesDatabase: false,
} as const);

export type VendureClubsSandboxReadinessStatus =
  (typeof VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.readinessStates)[number];

export type VendureClubsSandboxReadinessProjection = Readonly<{
  schema: typeof VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.schema;
  version: typeof VENDURE_CLUBS_SANDBOX_ADAPTER_CONTRACT.version;
  status: VendureClubsSandboxReadinessStatus;
  environment: "TEST";
  sandboxOnly: true;
  livemode: false;
  production: false;
  deliveryClaimed: false;
  containsPersonalData: false;
  exposesIdentifiers: false;
  exposesSecrets: false;
  exposesCounts: false;
}>;

export type VendureClubsSandboxReadinessRole = Extract<
  RoleKey,
  "crays-management" | "reviewer" | "admin"
>;

export type VendureClubsSandboxReadinessActor = Readonly<{
  accountId: string;
  tenantSessionId: string;
  organizationId: string;
  role: VendureClubsSandboxReadinessRole;
  assuranceLevel: "aal2" | "aal3";
}>;

export type VendureClubsSandboxDispatchEnvelope = Readonly<{
  command: VendureOrderCommand;
  attemptNumber: number;
  claimToken: string;
  leaseVersion: string;
}>;

type VendureClubsSandboxProviderObservationBase = Readonly<{
  environment: "TEST";
  sandbox: true;
  livemode: false;
  production: false;
  dispatchBindingSha256: string;
  observedAt: string;
}>;

export type VendureClubsSandboxProviderObservation =
  | (VendureClubsSandboxProviderObservationBase &
      Readonly<{
        outcome: "delivered";
        providerOrderId: string;
        providerObjectSha256: string;
        providerAckSha256: string;
        providerReadbackSha256: string;
      }>)
  | (VendureClubsSandboxProviderObservationBase &
      Readonly<{
        outcome: "confirmed_not_applied";
        retryEvidenceKind: "CONFIRMED_NOT_APPLIED" | "RETRYABLE_ERROR";
        retryEvidenceSha256: string;
      }>)
  | (VendureClubsSandboxProviderObservationBase &
      Readonly<{
        outcome: "unknown_outcome";
        unknownOutcomeEvidenceSha256: string;
      }>);

export type VendureClubsSandboxProviderClient = Readonly<{
  send(
    input: Readonly<{
      command: VendureOrderCommand;
      attemptNumber: number;
      claimToken: string;
      leaseVersion: string;
      dispatchBindingSha256: string;
    }>,
  ): Promise<VendureClubsSandboxProviderObservation>;
}>;

export type VendureClubsSandboxAdapterConfiguration = Readonly<{
  environment: "TEST";
  sandbox: true;
  livemode: false;
  production: false;
  endpointConfigured: boolean;
  credentialsConfigured: boolean;
  client?: VendureClubsSandboxProviderClient;
}>;
