import { readPublicStaticPage } from "@/lib/public-static-page";

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  return readPublicStaticPage("franchise.html");
}
