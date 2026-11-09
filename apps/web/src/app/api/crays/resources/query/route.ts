import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { createResourceError } from "@/lib/resources/errors";
import { getResourceDescriptor, isResourceKey } from "@/lib/resources/registry";
import { validateResourceQuery } from "@/lib/resources/query";
import type { ResourceQuery } from "@/lib/resources/types";
import { canUseCraysResource } from "@/lib/workspace/server-access";
import type { CraysResourceQueryRequest, CraysResourceQueryResponse } from "@/lib/workspace/provider-contract";

function response(status: number, payload: Omit<CraysResourceQueryResponse, "asOf">) {
  return Response.json({ ...payload, asOf: new Date().toISOString() }, { status });
}

export async function POST(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const body = await request.json().catch(() => null) as CraysResourceQueryRequest | null;
  const resource = body?.resource;

  if (!resource || !isResourceKey(resource)) {
    const error = createResourceError("not_found", "Resource is not registered.");
    return Response.json({ status: "invalid_query", error }, { status: 404 });
  }

  const access = canUseCraysResource(context, resource, body?.id ? "get" : "list");
  const descriptor = getResourceDescriptor(resource);

  if (!descriptor) {
    const error = createResourceError("not_found", "Resource descriptor is unavailable.");
    return Response.json({ status: "invalid_query", error }, { status: 404 });
  }

  if (!access.can) {
    return response(403, {
      status: "forbidden",
      resource,
      data: [],
      total: 0,
      pageInfo: {
        limit: descriptor.pagination.defaultLimit,
        totalReliable: descriptor.pagination.totalReliable,
      },
      message: access.reason,
    });
  }

  const queryResult = validateResourceQuery(descriptor, body?.query as ResourceQuery | undefined);
  if (!queryResult.ok) {
    return Response.json({ status: "invalid_query", error: queryResult.error }, { status: 422 });
  }

  if (body?.id) {
    return response(503, {
      status: "not_configured",
      resource,
      data: [],
      total: 0,
      pageInfo: {
        limit: queryResult.value.page.limit,
        offset: queryResult.value.page.offset,
        totalReliable: descriptor.pagination.totalReliable,
      },
      message: "Block 75 provides the platform resource provider only. Record adapters are enabled by later migration blocks after source metadata proof.",
    });
  }

  return response(503, {
    status: "not_configured",
    resource,
    data: [],
    total: 0,
    pageInfo: {
      limit: queryResult.value.page.limit,
      offset: queryResult.value.page.offset,
      nextCursor: queryResult.value.page.cursor,
      totalReliable: descriptor.pagination.totalReliable,
    },
    message: "Resource query is validated by CRAYS Core, but this collection has not been migrated to a live adapter in Block 75.",
  });
}
