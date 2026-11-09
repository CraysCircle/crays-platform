import { getPublicPublicationPipelineV2ReadModel } from "@/db/public-publication-pipeline-v2-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const model = await getPublicPublicationPipelineV2ReadModel();
  return Response.json({ block: 104, ...model }, { status: model.status === "ready" ? 200 : 503 });
}
