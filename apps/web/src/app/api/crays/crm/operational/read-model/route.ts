import { getCrmOperationalReadModel, normalizeCrmOperationalFamily } from "@/db/crm-operational-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";
import { getResourceDescriptor } from "@/lib/resources";
import type { ResourceFilter, ResourceKey, ResourceSortDirection } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const descriptorByFamily: Record<string, ResourceKey | null> = {
  companies: "crm-companies",
  people: "crm-people",
  leads: "crm-leads",
  opportunities: "crm-opportunities",
  emails: "crm-emails",
  "calendar-events": "crm-calendar-events",
  tasks: "crm-tasks",
  activities: "crm-activities",
  notes: null,
};

function parseFilters(value: string | null): ResourceFilter[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
      .map((entry) => ({
        field: typeof entry.field === "string" ? entry.field : "",
        operator: typeof entry.operator === "string" ? (entry.operator as ResourceFilter["operator"]) : "contains",
        value: entry.value,
      }))
      .filter((entry) => entry.field);
  } catch {
    return [];
  }
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  const context = await resolveCraysRouteContext(request, { fallbackRole: "guest" });
  const url = new URL(request.url);
  const family = normalizeCrmOperationalFamily(url.searchParams.get("family") ?? url.searchParams.get("record") ?? url.searchParams.get("view"));
  const descriptorKey = descriptorByFamily[family];
  const descriptor = descriptorKey ? getResourceDescriptor(descriptorKey) : null;
  const readModel = await getCrmOperationalReadModel({
    role: context.role,
    family,
    search: url.searchParams.get("search") ?? undefined,
    filters: parseFilters(url.searchParams.get("filters")),
    sortField: url.searchParams.get("sortField") ?? undefined,
    sortDirection: (url.searchParams.get("sortDirection") === "asc" ? "asc" : "desc") as ResourceSortDirection,
    offset: numberParam(url.searchParams.get("offset"), 0),
    limit: numberParam(url.searchParams.get("limit"), 25),
  });

  const httpStatus = readModel.status === "ready" ? 200 : readModel.status === "release_blocked" ? 423 : readModel.status === "not_configured" ? 503 : 403;

  return Response.json(
    {
      status: readModel.status,
      serverAuthority: context.authoritySource,
      tenantId: context.tenantId,
      role: context.role,
      reviewPersona: context.reviewPersona,
      resource: descriptor
        ? {
            key: descriptor.key,
            label: descriptor.label,
            description: descriptor.description,
            sourceSystem: descriptor.sourceSystem,
            schemaStatus: descriptor.schemaStatus,
            fields: descriptor.fields,
            operations: descriptor.supportedOperations,
          }
        : {
            key: `crm-${family}`,
            label: family,
            description: "CRAYS CRM operational source-map projection.",
            sourceSystem: "twenty",
            schemaStatus: "requires-discovery",
            fields: [],
            operations: ["list", "get", "review"],
          },
      access: readModel.access,
      summary: readModel.summary,
      family: readModel.family,
      rows: readModel.access.allowed ? readModel.rows : [],
      pageInfo: readModel.pageInfo,
      actions: readModel.actions,
      provenance: readModel.provenance,
      note: "CRM operational views are served by CRAYS Core/BFF only. Twenty native APIs, source credentials, external sending and source writes are not exposed to the browser.",
    },
    { status: httpStatus },
  );
}
