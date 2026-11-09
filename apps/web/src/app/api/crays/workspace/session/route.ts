import { getCraysWorkspaceSessionDto } from "@/lib/workspace/server-session";

export async function GET(request: Request) {
  const session = await getCraysWorkspaceSessionDto(request);

  return Response.json(session, {
    status: session.status === "ready" ? 200 : 403,
  });
}
