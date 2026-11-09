import { NextResponse } from "next/server";
import { getCaseActivityBackboneReadModel } from "@/db/case-activity-backbone-read-model-repository";
import { resolveCraysRouteContext } from "@/lib/dal/server-trust";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await resolveCraysRouteContext(request, { fallbackRole: "deal-manager" });
  const role = context.role;
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "12", 10);
  const readModel = await getCaseActivityBackboneReadModel({
    role,
    preparedOfferId: url.searchParams.get("preparedOfferId"),
    dealId: url.searchParams.get("dealId"),
    propertyCaseId: url.searchParams.get("propertyCaseId"),
    limit: Number.isFinite(limit) ? limit : 12,
  });

  if (!readModel.access.allowed) {
    return NextResponse.json(
      {
        status: "forbidden",
        readModel,
        note: "Case activity backbone requires an internal role. No documents, events or KPI values are returned for this role.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "ready",
    readModel,
    note: "Case activity backbone returns document metadata, workflow/command events and KPI snapshots only. No binary upload, private preview, public release, external send, finance action, bank action or apply gate is enabled.",
  });
}
