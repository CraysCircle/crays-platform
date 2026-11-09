import { getCorePgPool } from "@/db/client";
import {
  createCoreCommerceConsequenceDeliveryRepository,
  type CoreCommerceConsequencePool,
} from "@/db/core-commerce-consequence-repository";
import {
  CoreCommerceConsequenceDeliveryCycle,
  CoreCommerceVendureDeliveryAdapter,
} from "@/lib/member-commerce/core-commerce-consequence-delivery";
import {
  hasCoreCommerceRequestBody,
  resolveCoreCommerceWorkerBinding,
} from "@/lib/member-commerce/core-commerce-consequence-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const binding = resolveCoreCommerceWorkerBinding(request);
  if (!binding) {
    return json(403, { status: "DENIED", code: "CORE_COMMERCE_WORKER_AUTHORITY_DENIED" });
  }
  if (hasCoreCommerceRequestBody(request)) {
    return json(400, { status: "DENIED", code: "CORE_COMMERCE_WORKER_BODY_FORBIDDEN" });
  }

  try {
    const repository = createCoreCommerceConsequenceDeliveryRepository(
      getCorePgPool() as CoreCommerceConsequencePool,
    );
    const cycle = new CoreCommerceConsequenceDeliveryCycle(
      repository,
      new CoreCommerceVendureDeliveryAdapter(),
      binding,
    );
    const result = await cycle.runOnce({
      tenantId: binding.tenantId,
      workerId: binding.workerId,
    });
    return json(200, result
      ? { status: "PROCESSED", ...result }
      : { status: "IDLE" });
  } catch {
    return json(503, {
      status: "UNAVAILABLE",
      code: "CORE_COMMERCE_DELIVERY_CYCLE_FAILED",
    });
  }
}
