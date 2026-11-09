import { createPreparedOffer, parsePreparedOfferInput } from "@/db/core-domain-write-repository";
import { assertDomainDevWriteAllowed } from "@/lib/domain-write-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = assertDomainDevWriteAllowed(request);
  if (!guard.allowed) return guard.response;

  try {
    const input = parsePreparedOfferInput(await request.json());
    const result = await createPreparedOffer(input);

    return Response.json({
      status: "created",
      writeEnabled: true,
      result,
      liveBusinessRecordReturned: false,
      secretsReturned: false,
      privateKeysReturned: false,
      note: "Prepared offer intake created draft CRAYS Core DB records. No files, provider calls or external messages were sent.",
    });
  } catch (error) {
    return Response.json(
      {
        status: "invalid",
        error: error instanceof Error ? error.message : "Invalid request.",
        liveBusinessRecordReturned: false,
        secretsReturned: false,
        privateKeysReturned: false,
      },
      { status: 400 },
    );
  }
}
