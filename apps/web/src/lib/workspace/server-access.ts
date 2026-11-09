import "server-only";

import { evaluatePermission, type PermissionKey } from "@/lib/permissions";
import { getResourceDescriptor, isResourceKey, type ResourceDescriptor, type ResourceOperation, type ResourceKey } from "@/lib/resources";
import type { CraysRouteContext } from "@/lib/dal/server-trust";

export type CraysResourceAccessDecision = {
  can: boolean;
  reason: string;
  resource?: ResourceKey;
  action: string;
};

const readActions = new Set(["list", "get", "show", "read"]);
const operationByAction: Record<string, ResourceOperation> = {
  list: "list",
  get: "get",
  show: "get",
  read: "get",
  create: "create",
  update: "update",
  edit: "update",
  transition: "transition",
  comment: "comment",
  archive: "archive",
  delete: "archive",
  restore: "restore",
  publish: "publish",
  unpublish: "unpublish",
  review: "review",
};

const resourceWritePermissions: Partial<Record<ResourceKey, Partial<Record<ResourceOperation, PermissionKey>>>> = {
  "prepared-offers": {
    update: "prepared-offers:update",
    review: "prepared-offers:update",
  },
  deals: {
    update: "deals:update",
    transition: "deals:update",
    review: "deals:update",
  },
  properties: {
    create: "properties:create",
    update: "properties:update",
    review: "properties:update",
  },
  "bank-packages": {
    create: "bank-packages:create",
    update: "bank-packages:create",
    review: "bank-packages:approve",
  },
  "public-deal-packages": {
    publish: "prepared-offers:update",
    unpublish: "prepared-offers:update",
  },
};

function discoveryBlocksAction(descriptor: ResourceDescriptor, operation: ResourceOperation) {
  if (descriptor.schemaStatus !== "requires-discovery") return false;
  if (descriptor.sourceSystem === "crays-core" || descriptor.sourceSystem === "crays-public") return false;
  return operation !== "list" && operation !== "get";
}

export function canUseCraysResource(
  context: CraysRouteContext,
  resourceInput: string | undefined,
  actionInput: string,
): CraysResourceAccessDecision {
  if (!resourceInput || !isResourceKey(resourceInput)) {
    return {
      can: false,
      action: actionInput,
      reason: "Resource is not registered in the CRAYS resource registry.",
    };
  }

  const descriptor = getResourceDescriptor(resourceInput);
  if (!descriptor) {
    return {
      can: false,
      resource: resourceInput,
      action: actionInput,
      reason: "Resource descriptor is unavailable.",
    };
  }

  const action = actionInput || "read";
  const operation = operationByAction[action] ?? (readActions.has(action) ? "get" : undefined);
  if (!operation) {
    return {
      can: false,
      resource: descriptor.key,
      action,
      reason: "Action is not mapped to a CRAYS resource operation.",
    };
  }

  if (!descriptor.supportedOperations.includes(operation)) {
    return {
      can: false,
      resource: descriptor.key,
      action,
      reason: "The resource does not support this operation.",
    };
  }

  if (discoveryBlocksAction(descriptor, operation)) {
    return {
      can: false,
      resource: descriptor.key,
      action,
      reason: "Source metadata discovery must be completed before this operation is exposed.",
    };
  }

  const requiredPermission = readActions.has(action) || operation === "list" || operation === "get"
    ? descriptor.requiredReadPermission
    : resourceWritePermissions[descriptor.key]?.[operation];

  if (!requiredPermission) {
    return {
      can: false,
      resource: descriptor.key,
      action,
      reason: "No server-side permission contract is registered for this operation yet.",
    };
  }

  const permission = evaluatePermission({
    role: context.role,
    permission: requiredPermission,
    scope: descriptor.tenantScope,
  });

  return {
    can: permission.allowed,
    resource: descriptor.key,
    action,
    reason: permission.reason,
  };
}
