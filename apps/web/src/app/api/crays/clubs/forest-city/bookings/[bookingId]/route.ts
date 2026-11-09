import { readForestCityBookingStatus } from "@/db/forest-city-booking-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "cache-control": "no-store" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await context.params;
  if (!/^clubs-booking-[a-f0-9-]{36}$/.test(bookingId)) {
    return Response.json({status:"not_found"},{status:404,headers:noStore});
  }
  try {
    const booking = await readForestCityBookingStatus(bookingId);
    return booking
      ? Response.json({status:"ready",booking},{headers:noStore})
      : Response.json({status:"not_found"},{status:404,headers:noStore});
  } catch {
    return Response.json({status:"temporarily_unavailable"},{status:503,headers:noStore});
  }
}
