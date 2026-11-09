import "server-only";

import { prepareClubsMembershipPaymentAdapter } from "./clubs-membership-payment-adapter-repository";
import type { ClubsMembershipPaymentPrepareResult } from "./clubs-membership-payment-adapter-contract";

export async function prepareClubsMemberMembershipPayment(input: Readonly<{
  memberAccountId: string;
  idempotencyKey: string;
  now?: Date;
}>): Promise<ClubsMembershipPaymentPrepareResult> {
  return prepareClubsMembershipPaymentAdapter(input);
}
