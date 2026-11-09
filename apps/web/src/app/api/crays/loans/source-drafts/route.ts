import type { NextRequest } from "next/server";
import {
  createLoanApplicationDraft,
  getLendingSourceRuntimeState,
  parseLoanApplicationDraftRequest,
  updateLoanApplicationDraft,
} from "@/lib/loans-operational-source-adapter";
import { OperationalSourceError, safeSourceError, sourceErrorHttpStatus } from "@/lib/operational-source-client";
import { requireLendingSourceRole } from "@/lib/lending-source-route-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32 * 1_024;

function boundaries() {
  return {
    sourceDraftWriteEnabled: true,
    submitEnabled: false,
    disbursementWriteEnabled: false,
    repaymentWriteEnabled: false,
    paymentInitiationEnabled: false,
    cancellationEnabled: false,
    externalSendingEnabled: false,
    secretsReturned: false,
  } as const;
}

async function requestBody(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The draft request is too large.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The draft request must be valid JSON.");
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let receivedBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    receivedBytes += chunk.value.byteLength;
    if (receivedBytes > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The draft request is too large.");
    }
    chunks.push(decoder.decode(chunk.value, { stream: true }));
  }
  chunks.push(decoder.decode());

  try {
    return JSON.parse(chunks.join("")) as unknown;
  } catch {
    throw new OperationalSourceError("SOURCE_REQUEST_REJECTED", 400, "The draft request must be valid JSON.");
  }
}

function errorResponse(error: unknown, role: "finance" | "admin") {
  return Response.json(
    {
      status: "rejected",
      role,
      source: getLendingSourceRuntimeState(),
      error: safeSourceError(error),
      ...boundaries(),
    },
    { status: sourceErrorHttpStatus(error) },
  );
}

export async function POST(request: NextRequest) {
  const initialAccess = await requireLendingSourceRole(request);
  if (!initialAccess.allowed) return initialAccess.response;

  try {
    const body = await requestBody(request);
    const input = parseLoanApplicationDraftRequest(body, "create");
    const access = await requireLendingSourceRole(request, input.actorRole);
    if (!access.allowed) return access.response;

    const result = await createLoanApplicationDraft(input);
    return Response.json(
      {
        status: result.created ? "created" : "idempotent_existing",
        role: access.role,
        entity: "loan-application",
        result,
        ...boundaries(),
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error, initialAccess.role);
  }
}

export async function PATCH(request: NextRequest) {
  const initialAccess = await requireLendingSourceRole(request);
  if (!initialAccess.allowed) return initialAccess.response;

  try {
    const body = await requestBody(request);
    const input = parseLoanApplicationDraftRequest(body, "update");
    const access = await requireLendingSourceRole(request, input.actorRole);
    if (!access.allowed) return access.response;

    const result = await updateLoanApplicationDraft(input);
    return Response.json({
      status: result.idempotent ? "idempotent_existing" : "updated",
      role: access.role,
      entity: "loan-application",
      result,
      ...boundaries(),
    });
  } catch (error) {
    return errorResponse(error, initialAccess.role);
  }
}
