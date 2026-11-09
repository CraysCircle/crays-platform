import "server-only";

import type { RoleKey } from "@/lib/roles";
import type { KdsDatabase, KdsQuery } from "@/store-operations/kds";
import {
  CommerceContextResolutionError,
  resolveServerCommerceContextSnapshot,
  type CommerceVerticalRoot,
} from "./server-commerce-context-resolver";

const CONTRACT_VERSION = "ncrv2-115.context.v1" as const;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const VERTICALS = new Set<CommerceVerticalRoot>([
  "coffee",
  "retail",
  "gym",
  "clubs",
]);
const ROUTE_ROLES = new Set<RoleKey>([
  "franchise-partner",
  "finance",
  "admin",
  "crays-management",
]);

export type CommerceContextRouteAuthority = Readonly<{
  authoritySource: string;
  accountId: string | null;
  tenantId: string;
  role: RoleKey;
  roleAssignmentId: string | null;
  strongAuthAllowed: boolean;
}>;

export function isCommerceContextRouteAuthorityAllowed(
  authority: CommerceContextRouteAuthority,
) {
  return authority.authoritySource === "auth0-crays-session" &&
    Boolean(authority.accountId) &&
    Boolean(authority.roleAssignmentId) &&
    ID.test(authority.accountId ?? "") &&
    ID.test(authority.roleAssignmentId ?? "") &&
    ROUTE_ROLES.has(authority.role) &&
    authority.strongAuthAllowed;
}

export type CommerceRouteRoleAssignment = Readonly<{
  id: string;
  role: RoleKey;
  organizationId?: string;
  status: string;
}>;

export function resolveExactCommerceRoleAssignmentId(
  assignments: readonly CommerceRouteRoleAssignment[],
  role: RoleKey,
  tenantId: string,
) {
  const matches = assignments.filter((assignment) =>
    assignment.status === "active" &&
    assignment.role === role &&
    assignment.organizationId === tenantId &&
    ID.test(assignment.id)
  );
  return matches.length === 1 ? matches[0].id : null;
}

export type CommerceContextReadPathDependencies = Readonly<{
  database: KdsDatabase;
  resolveAuthority: (
    request: Request,
  ) => Promise<CommerceContextRouteAuthority>;
  now?: () => Date;
}>;

export type CommerceContextBrowserRequest = Readonly<{
  verticalRoot: CommerceVerticalRoot;
  storeId: string;
  expectedAssignmentVersion?: number;
}>;

function parseBrowserRequest(value: unknown): CommerceContextBrowserRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("COMMERCE_CONTEXT_REQUEST_INVALID");
  }
  const raw = value as Record<string, unknown>;
  const allowed = new Set([
    "verticalRoot",
    "storeId",
    "expectedAssignmentVersion",
  ]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    throw new Error("COMMERCE_CONTEXT_BROWSER_AUTHORITY_DENIED");
  }
  if (
    typeof raw.verticalRoot !== "string" ||
    !VERTICALS.has(raw.verticalRoot as CommerceVerticalRoot) ||
    typeof raw.storeId !== "string" ||
    !ID.test(raw.storeId.trim()) ||
    (raw.expectedAssignmentVersion !== undefined &&
      (!Number.isSafeInteger(raw.expectedAssignmentVersion) ||
        Number(raw.expectedAssignmentVersion) < 1))
  ) {
    throw new Error("COMMERCE_CONTEXT_REQUEST_INVALID");
  }
  return {
    verticalRoot: raw.verticalRoot as CommerceVerticalRoot,
    storeId: raw.storeId.trim(),
    ...(raw.expectedAssignmentVersion === undefined
      ? {}
      : { expectedAssignmentVersion: Number(raw.expectedAssignmentVersion) }),
  };
}

function response(body: object, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function resolveAuthorizedCommerceContextSnapshot(
  query: KdsQuery,
  authority: CommerceContextRouteAuthority,
  input: CommerceContextBrowserRequest,
) {
  const clock = await query<{ authority_now: string | Date }>(
    "select transaction_timestamp() authority_now",
  );
  const authorityNow = new Date(clock.rows[0]?.authority_now ?? "");
  if (Number.isNaN(authorityNow.getTime())) {
    throw new Error("COMMERCE_CONTEXT_SELECTION_DENIED");
  }
  const result = await query<{ assignment_version: string | number }>(
    `select distinct a.version assignment_version
       from crays_core.role_assignments r
       join crays_core.crays_accounts c
         on c.account_id=r.account_id
       join crays_core.organizations o
         on o.organization_id=r.organization_id
       join crays_core.organization_memberships m
         on m.account_id=r.account_id
        and m.organization_id=r.organization_id
        and m.role_key=r.role_key
       join crays_core.franchise_operator_tenants p
         on p.organization_id=r.organization_id
       join crays_core.store_operator_assignments a
         on a.partner_tenant_id=p.partner_tenant_id
       join crays_core.stores s
         on s.store_id=a.store_id and s.vertical_root=a.vertical_root
      where r.assignment_id=$1 and r.account_id=$2
        and r.role_key=$3 and r.organization_id=$4
        and r.status='active' and r.revoked_at is null
        and r.nostr_binding_status in ('verified','system_attested')
        and c.status='active' and o.status='active' and m.status='active'
        and p.status='active'
        and s.store_id=$5 and s.vertical_root=$6 and s.status='active'
        and a.status='active' and a.valid_from <= $7
        and (a.valid_until is null or a.valid_until > $7)`,
    [
      authority.roleAssignmentId,
      authority.accountId,
      authority.role,
      authority.tenantId,
      input.storeId,
      input.verticalRoot,
      authorityNow.toISOString(),
    ],
  );
  const version = Number(result.rows[0]?.assignment_version);
  if (result.rows.length !== 1 || !Number.isSafeInteger(version) || version < 1) {
    throw new Error("COMMERCE_CONTEXT_SELECTION_DENIED");
  }
  if (
    input.expectedAssignmentVersion !== undefined &&
    input.expectedAssignmentVersion !== version
  ) {
    throw new CommerceContextResolutionError("COMMERCE_CONTEXT_STALE");
  }
  return resolveServerCommerceContextSnapshot(
    query,
    {
      verticalRoot: input.verticalRoot,
      storeId: input.storeId,
      expectedAssignmentVersion: version,
    },
    authorityNow,
  );
}

export async function resolveAuthorizedCommerceContext(
  database: KdsDatabase,
  authority: CommerceContextRouteAuthority,
  input: CommerceContextBrowserRequest,
) {
  return database.transaction(async ({ query }) => {
    await query("set transaction isolation level repeatable read read only");
    await query("select set_config('crays.app_role','core_service',true)");
    return resolveAuthorizedCommerceContextSnapshot(query, authority, input);
  });
}

function safeFailure(error: unknown) {
  if (error instanceof CommerceContextResolutionError) {
    if (error.code === "COMMERCE_CONTEXT_STALE") {
      return response(
        {
          state: "conflict",
          code: "COMMERCE_CONTEXT_CHANGED",
          recovery: "reload_store_selection",
        },
        409,
      );
    }
    if (
      error.code === "COMMERCE_CONTEXT_UNRESOLVED" ||
      error.code === "COMMERCE_CONTEXT_INPUT_INVALID"
    ) {
      return response(
        {
          state: "not_found",
          code: "COMMERCE_CONTEXT_NOT_AVAILABLE",
          recovery: "select_an_available_store",
        },
        404,
      );
    }
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "COMMERCE_CONTEXT_SELECTION_DENIED") {
    return response(
      {
        state: "not_found",
        code: "COMMERCE_CONTEXT_NOT_AVAILABLE",
        recovery: "select_an_available_store",
      },
      404,
    );
  }
  if (
    message === "COMMERCE_CONTEXT_REQUEST_INVALID" ||
    message === "COMMERCE_CONTEXT_BROWSER_AUTHORITY_DENIED"
  ) {
    return response(
      {
        state: "invalid",
        code: "COMMERCE_CONTEXT_REQUEST_INVALID",
        recovery: "correct_store_selection",
      },
      400,
    );
  }
  return response(
    {
      state: "unavailable",
      code: "COMMERCE_CONTEXT_TEMPORARILY_UNAVAILABLE",
      recovery: "retry_after_backoff",
    },
    503,
  );
}

export async function handleCommerceContextReadRequest(
  request: Request,
  dependencies: CommerceContextReadPathDependencies,
): Promise<Response> {
  try {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length > 4_096) {
      throw new Error("COMMERCE_CONTEXT_REQUEST_INVALID");
    }
    const authority = await dependencies.resolveAuthority(request);
    if (!isCommerceContextRouteAuthorityAllowed(authority)) {
      return response(
        {
          state: "denied",
          code: "COMMERCE_CONTEXT_AUTHORIZATION_REQUIRED",
          recovery: "authenticate_and_select_active_role",
        },
        403,
      );
    }
    const mediaType = request.headers.get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (mediaType !== "application/json") {
      throw new Error("COMMERCE_CONTEXT_REQUEST_INVALID");
    }
    const serialized = await request.text();
    if (
      serialized.length < 2 ||
      Buffer.byteLength(serialized, "utf8") > 4_096
    ) {
      throw new Error("COMMERCE_CONTEXT_REQUEST_INVALID");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      throw new Error("COMMERCE_CONTEXT_REQUEST_INVALID");
    }
    const input = parseBrowserRequest(parsed);
    const context = await resolveAuthorizedCommerceContext(
      dependencies.database,
      authority,
      input,
    );
    return response(
      {
        state: "ready",
        contractVersion: CONTRACT_VERSION,
        store: {
          verticalRoot: context.verticalRoot,
          storeId: context.storeId,
          sellerLegalName: context.operatorLegalName,
          storeOperatorAssignmentVersion:
            context.storeOperatorAssignmentVersion,
          contextFingerprint: context.contextFingerprint,
          verifiedAt: context.verifiedAt,
        },
      },
      200,
    );
  } catch (error) {
    return safeFailure(error);
  }
}
