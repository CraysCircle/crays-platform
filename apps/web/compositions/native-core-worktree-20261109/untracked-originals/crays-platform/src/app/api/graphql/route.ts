import { admitNativeCoreGraphQLRequest, NativeCoreRequestError } from "@/lib/native-core-auth";
import type { CraysGraphQLNextContext } from "@/graphql/context";
import { createCraysGraphQLServer } from "@/graphql/server";
import { getCraysGraphQLRuntimeConfig } from "@/graphql/runtime-config";
import { setInternalGraphQLRateDimensions } from "@/graphql/performance/request-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yoga = createCraysGraphQLServer();

async function handleRequest(request: Request, context: CraysGraphQLNextContext) {
  if (!getCraysGraphQLRuntimeConfig().enabled) {
    return Response.json({ error: "GraphQL endpoint is not released in this environment." }, { status: 404 });
  }
  try { await admitNativeCoreGraphQLRequest(request); }
  catch (error) {
    if (!(error instanceof NativeCoreRequestError)) throw error;
    return Response.json({ errors: [{ message: error.code, extensions: { code: error.code } }] }, { status: error.status, headers: { "Cache-Control": "no-store, private" } });
  }
  if (request.method === "POST") {
    const body = await request.clone().json().catch(() => null);
    if (Array.isArray(body)) return Response.json({ errors: [{ message: "GraphQL batching is disabled.", extensions: { code: "BATCHING_DISABLED" } }] }, { status: 400 });
    if (body && typeof body === "object") {
      const typed = body as { extensions?: { persistedQuery?: { sha256Hash?: string } }; variables?: { input?: { recordId?: string }; id?: string } };
      setInternalGraphQLRateDimensions(request, { operation: (typed.extensions?.persistedQuery?.sha256Hash ?? "arbitrary").slice(0,128), target: (typed.variables?.input?.recordId ?? typed.variables?.id ?? "collection").slice(0,256) });
    }
  }

  const response = await yoga.handleRequest(request, context);
  if (!request.headers.has("authorization")) return response;
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Cache-Control", "no-store, private");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
}

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS };
