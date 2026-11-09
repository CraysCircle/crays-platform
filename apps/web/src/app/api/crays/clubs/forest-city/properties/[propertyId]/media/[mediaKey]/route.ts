import "server-only";

import { readForestCityQloProviderImage } from "@/lib/clubs/qlo-provider-read-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ propertyId: string; mediaKey: string }>;
  },
) {
  const { propertyId, mediaKey } = await context.params;
  try {
    const upstream = await readForestCityQloProviderImage(
      propertyId,
      mediaKey,
    );
    if (!upstream || upstream.status === 404) {
      return json({ status: "not_found" }, 404);
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !/^image\/(?:avif|jpeg|png|webp)$/i.test(contentType)) {
      return json({ status: "qlo_media_unavailable" }, 503);
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": "inline",
        "Content-Type": contentType,
        ETag: upstream.headers.get("etag") ?? "",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ status: "qlo_media_unavailable" }, 503);
  }
}
