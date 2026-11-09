import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";
import { isCommerceRoleVerticalAuthorized } from
  "./commerce-role-vertical-authority";
import {
  authorizePartnerVendureAdmin,
  type PartnerVendureAdminAction,
} from "./partner-vendure-admin-authorization";
import {
  isCommerceGrantLoadingError,
  loadPartnerVendureAdminGrantSnapshot,
  type PartnerVendureAdminGrantSnapshot,
} from "./partner-vendure-admin-grant-repository";
import {
  CommerceContextResolutionError,
  type CommerceVerticalRoot,
} from "./server-commerce-context-resolver";

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const POLICY_VERSION = "vendure-admin-v1";
const COMMAND_ACTIONS = [
  "catalog.write_projection",
  "fulfillment.transition",
  "refund.request",
] as const satisfies readonly PartnerVendureAdminAction[];
const VERTICALS: readonly CommerceVerticalRoot[] = [
  "coffee", "retail", "gym", "clubs",
];
const ROLES: readonly RoleKey[] = [
  "franchise-partner", "studio-manager", "finance",
];

export type PartnerVendureAdminCommandAction =
  (typeof COMMAND_ACTIONS)[number];

export type PartnerVendureAdminCommandPreflight = Readonly<{
  accountId: string;
  organizationId: string;
  effectiveRole: RoleKey;
  action: PartnerVendureAdminCommandAction;
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  grantId: string;
  grantContextVersion: number;
  roleAssignmentId: string;
  relationshipId: string;
  policyVersion: string;
  storeOperatorAssignmentId: string;
  storeOperatorAssignmentVersion: number;
  providerBindingId: string;
  providerBindingVersion: number;
  contextFingerprint: string;
}>;

export type PartnerVendureAdminCommandAuthority = Readonly<{
  authorityNow: string;
  accountId: string;
  organizationId: string;
  effectiveRole: RoleKey;
  action: PartnerVendureAdminCommandAction;
  grantId: string;
  grantContextVersion: number;
  roleAssignmentId: string;
  relationshipId: string;
  policyVersion: string;
  verticalRoot: CommerceVerticalRoot;
  partnerTenantId: string;
  operatorLegalEntityId: string;
  storeId: string;
  storeOperatorAssignmentId: string;
  storeOperatorAssignmentVersion: number;
  providerBindingId: string;
  providerBindingVersion: number;
  vendureDeploymentCellId: string;
  vendureSellerId: string;
  vendureChannelId: string;
  contextFingerprint: string;
}>;

export class PartnerVendureAdminCommandAuthorityError extends Error {
  constructor(readonly code:
    | "VENDURE_ADMIN_COMMAND_AUTHORITY_INPUT_INVALID"
    | "VENDURE_ADMIN_COMMAND_AUTHORITY_CONFLICT"
    | "VENDURE_ADMIN_COMMAND_AUTHORITY_DENIED"
    | "VENDURE_ADMIN_COMMAND_AUTHORITY_INCOMPLETE") {
    super(code);
    this.name = "PartnerVendureAdminCommandAuthorityError";
  }
}

function exactId(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && ID.test(value);
}

function exactVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function validatePreflight(input: PartnerVendureAdminCommandPreflight) {
  if (
    !exactId(input.accountId) || !exactId(input.organizationId) ||
    !exactId(input.storeId) || !exactId(input.grantId) ||
    !exactId(input.roleAssignmentId) || !exactId(input.relationshipId) ||
    !exactId(input.storeOperatorAssignmentId) ||
    !exactId(input.providerBindingId) ||
    !COMMAND_ACTIONS.includes(input.action) ||
    !VERTICALS.includes(input.verticalRoot) ||
    !ROLES.includes(input.effectiveRole) ||
    !isCommerceRoleVerticalAuthorized(
      input.effectiveRole, input.verticalRoot) ||
    !exactVersion(input.grantContextVersion) ||
    !exactVersion(input.storeOperatorAssignmentVersion) ||
    !exactVersion(input.providerBindingVersion) ||
    input.policyVersion !== POLICY_VERSION ||
    !SHA256.test(input.contextFingerprint)
  ) {
    throw new PartnerVendureAdminCommandAuthorityError(
      "VENDURE_ADMIN_COMMAND_AUTHORITY_INPUT_INVALID",
    );
  }
}

function conflict(): never {
  throw new PartnerVendureAdminCommandAuthorityError(
    "VENDURE_ADMIN_COMMAND_AUTHORITY_CONFLICT",
  );
}

/**
 * Re-authorize a previously issued preflight and run the owning command's
 * persistence callback inside the same SERIALIZABLE transaction. This module
 * deliberately owns no business command, receipt or outbox table.
 */
export async function withPartnerVendureAdminCommandAuthority<T>(
  database: KdsDatabase,
  input: PartnerVendureAdminCommandPreflight,
  persist: (
    query: KdsQuery,
    authority: PartnerVendureAdminCommandAuthority,
  ) => Promise<T>,
): Promise<Readonly<{
  authority: PartnerVendureAdminCommandAuthority;
  value: T;
}>> {
  validatePreflight(input);
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level serializable");
    await query("select set_config('crays.app_role','core_service',true)");
    const clock = await query<{ authority_now: string | Date }>(
      "select transaction_timestamp() authority_now",
    );
    const authorityNow = new Date(clock.rows[0]?.authority_now);
    if (Number.isNaN(authorityNow.getTime())) {
      throw new PartnerVendureAdminCommandAuthorityError(
        "VENDURE_ADMIN_COMMAND_AUTHORITY_INCOMPLETE",
      );
    }

    let snapshot: PartnerVendureAdminGrantSnapshot;
    try {
      snapshot = await loadPartnerVendureAdminGrantSnapshot(query, {
        accountId: input.accountId,
        organizationId: input.organizationId,
        effectiveRole: input.effectiveRole,
        verticalRoot: input.verticalRoot,
        storeId: input.storeId,
        expectedAssignmentVersion: input.storeOperatorAssignmentVersion,
      }, authorityNow);
    } catch (error) {
      if (
        isCommerceGrantLoadingError(error) ||
        error instanceof CommerceContextResolutionError
      ) conflict();
      throw error;
    }

    const grant = snapshot.grants[0];
    const context = snapshot.context;
    if (
      snapshot.grants.length !== 1 ||
      grant.grantId !== input.grantId ||
      grant.contextVersion !== input.grantContextVersion ||
      grant.roleAssignmentId !== input.roleAssignmentId ||
      grant.relationshipId !== input.relationshipId ||
      grant.policyVersion !== input.policyVersion ||
      context.verticalRoot !== input.verticalRoot ||
      context.storeId !== input.storeId ||
      context.storeOperatorAssignmentId !== input.storeOperatorAssignmentId ||
      context.storeOperatorAssignmentVersion !==
        input.storeOperatorAssignmentVersion ||
      context.providerBindingId !== input.providerBindingId ||
      context.providerBindingVersion !== input.providerBindingVersion ||
      context.contextFingerprint !== input.contextFingerprint
    ) conflict();

    const decision = authorizePartnerVendureAdmin({
      action: input.action,
      grants: snapshot.grants,
      context,
      now: authorityNow,
    });
    if (
      decision.decision !== "ALLOW" ||
      decision.grantId !== grant.grantId ||
      decision.policyVersion !== grant.policyVersion ||
      decision.scope.kind !== "partner_store" ||
      decision.scope.partnerTenantId !== context.partnerTenantId ||
      decision.scope.operatorLegalEntityId !== context.operatorLegalEntityId ||
      decision.scope.storeId !== context.storeId ||
      decision.scope.vendureDeploymentCellId !==
        context.vendure.deploymentCellId ||
      decision.scope.vendureSellerId !== context.vendure.sellerId ||
      decision.scope.vendureChannelId !== context.vendure.channelId
    ) {
      throw new PartnerVendureAdminCommandAuthorityError(
        "VENDURE_ADMIN_COMMAND_AUTHORITY_DENIED",
      );
    }

    const authority = Object.freeze({
      authorityNow: authorityNow.toISOString(),
      accountId: input.accountId,
      organizationId: input.organizationId,
      effectiveRole: input.effectiveRole,
      action: input.action,
      grantId: grant.grantId,
      grantContextVersion: grant.contextVersion,
      roleAssignmentId: grant.roleAssignmentId,
      relationshipId: grant.relationshipId,
      policyVersion: grant.policyVersion,
      verticalRoot: context.verticalRoot,
      partnerTenantId: context.partnerTenantId,
      operatorLegalEntityId: context.operatorLegalEntityId,
      storeId: context.storeId,
      storeOperatorAssignmentId: context.storeOperatorAssignmentId,
      storeOperatorAssignmentVersion: context.storeOperatorAssignmentVersion,
      providerBindingId: context.providerBindingId,
      providerBindingVersion: context.providerBindingVersion,
      vendureDeploymentCellId: context.vendure.deploymentCellId,
      vendureSellerId: context.vendure.sellerId,
      vendureChannelId: context.vendure.channelId,
      contextFingerprint: context.contextFingerprint,
    } satisfies PartnerVendureAdminCommandAuthority);
    const value = await persist(query, authority);
    return Object.freeze({ authority, value });
  });
}
