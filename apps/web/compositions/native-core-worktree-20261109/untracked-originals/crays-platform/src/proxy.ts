import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  // Native GraphQL has its own fixed-operation Bearer/JWT/Core authority gate.
  // Do not route it through browser cookie sessions or adopt their identity.
  // Header presence also keeps empty/invalid credentials on that rejecting gate.
  if (new URL(request.url).pathname === "/api/graphql" && request.headers.has("authorization")) {
    return NextResponse.next();
  }
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * The broad matcher is required by Auth0 for rolling sessions.
     * Static and metadata assets do not need the authentication boundary.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
