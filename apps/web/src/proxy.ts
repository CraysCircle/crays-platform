import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { forwardMember073NativeRequest } from "@/lib/clubs/member073-native-forward";

const clubsDocumentLanguages = new Set(["en", "de", "es", "ca", "fr", "pt", "it"]);

export async function proxy(request: NextRequest) {
  const nativeResponse = await forwardMember073NativeRequest(request);
  if (nativeResponse) return nativeResponse;
  const response = await auth0.middleware(request);

  if (response.headers.get("x-middleware-next") === "1") {
    const requestHeaders = new Headers(request.headers);
    const pathLanguage = request.nextUrl.pathname.split("/")[1] ?? "";
    requestHeaders.set(
      "x-crays-document-language",
      clubsDocumentLanguages.has(pathLanguage) ? pathLanguage : "en",
    );

    const languageOverride = NextResponse.next({
      request: { headers: requestHeaders },
    });
    for (const [key, value] of languageOverride.headers) {
      if (
        key === "x-middleware-override-headers" ||
        key.startsWith("x-middleware-request-")
      ) {
        response.headers.set(key, value);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|__crays-clubs/assets).*)",
  ],
};
