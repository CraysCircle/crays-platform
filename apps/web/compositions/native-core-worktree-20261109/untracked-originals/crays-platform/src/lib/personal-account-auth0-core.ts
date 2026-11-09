import "server-only";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getCorePgPool } from "@/db/client";

/** Proposed target: crays-platform/src/lib/personal-account-auth0-core.ts.
 * No generic route-context/review-persona/portal DTO accepted. No provider tokens returned.
 * Used only by an existing server Request handler, never a model tool or client component.
 */
export function createPersonalAccountAuth0CoreBindings() {
  const issued = new WeakMap<object, { request: NextRequest; binding: string }>();
  return Object.freeze({
    getClient: () => getCorePgPool().connect(),
    async getAuth0Session(request: NextRequest) {
      if (!(request instanceof NextRequest)) throw new Error("SERVER_REQUEST_REQUIRED");
      let session;
      try { session = await auth0.getSession(request); }
      catch { throw new Error("AUTHENTICATED_SESSION_REQUIRED"); }
      const sub = session?.user?.sub;
      const sid = session?.internal?.sid;
      const createdAt = session?.internal?.createdAt;
      if (typeof sub !== "string" || !sub.length || sub.length > 2048 ||
          typeof sid !== "string" || !sid.length || sid.length > 2048 ||
          typeof createdAt !== "number" || !Number.isSafeInteger(createdAt) || createdAt <= 0) {
        throw new Error("VERIFIED_SESSION_BINDING_REQUIRED");
      }
      // Only authenticated SDK claims are projected; tokenSet/connectionTokenSets never escape.
      const redacted = Object.freeze({ user: Object.freeze({ sub }) });
      issued.set(redacted, { request, binding: createHash("sha256").update(JSON.stringify(["crays-auth0-personal-account-session-v1", sub, sid, createdAt])).digest("hex") });
      return redacted;
    },
    async getVerifiedSessionBinding(request: NextRequest, session: object) {
      const authority = issued.get(session);
      if (!authority || authority.request !== request) throw new Error("FOREIGN_AUTHENTICATED_SESSION");
      return authority.binding;
    },
  });
}
