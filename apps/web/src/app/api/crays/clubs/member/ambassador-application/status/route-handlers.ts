import "server-only";

import { NextRequest } from "next/server";

import { readMemberAmbassadorApplicationStatus } from "@/db/clubs-public-ambassador-referral-attribution-repository";
import {
  clubsMemberNoStore,
  resolveClubsMemberApiAccount,
} from "@/lib/clubs/member-api-state";
import { unavailableMemberAmbassadorApplicationStatus } from "@/lib/clubs/member-ambassador-application-status-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AccountResolution = Awaited<
  ReturnType<typeof resolveClubsMemberApiAccount>
>;

export type MemberAmbassadorApplicationStatusRouteDependencies = {
  resolveAccount: (request: NextRequest) => Promise<AccountResolution>;
  readStatus: typeof readMemberAmbassadorApplicationStatus;
};

const defaults: MemberAmbassadorApplicationStatusRouteDependencies = {
  resolveAccount: resolveClubsMemberApiAccount,
  readStatus: readMemberAmbassadorApplicationStatus,
};

export async function handleMemberAmbassadorApplicationStatusGet(
  request: NextRequest,
  deps: MemberAmbassadorApplicationStatusRouteDependencies = defaults,
) {
  const member = await deps.resolveAccount(request);
  if ("response" in member) return member.response;

  try {
    return Response.json(await deps.readStatus(member.accountId), {
      headers: clubsMemberNoStore,
    });
  } catch {
    return Response.json(unavailableMemberAmbassadorApplicationStatus(), {
      status: 503,
      headers: clubsMemberNoStore,
    });
  }
}

export async function GET(request: NextRequest) {
  return handleMemberAmbassadorApplicationStatusGet(request);
}
