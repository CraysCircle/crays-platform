import "server-only";
import {getCorePgPool} from "@/db/client";
import * as repository from "@/lib/member-commerce/partner-crm-activity-repository";
const pool=()=>getCorePgPool() as unknown as repository.PartnerCrmPool;
export const persistCorePartnerCrmActivity=(input:Parameters<typeof repository.persistPartnerCrmActivity>[1])=>repository.persistPartnerCrmActivity(pool(),input);
export const persistCorePartnerCrmActivityRevocation=(input:Parameters<typeof repository.persistPartnerCrmActivityRevocation>[1])=>repository.persistPartnerCrmActivityRevocation(pool(),input);
export const persistCoreTwentyCrmActivityProviderReceipt=(input:Parameters<typeof repository.persistTwentyCrmActivityProviderReceipt>[1])=>repository.persistTwentyCrmActivityProviderReceipt(pool(),input);
export const persistCoreTwentyCrmActivityReconciliation=(input:Parameters<typeof repository.persistTwentyCrmActivityReconciliation>[1])=>repository.persistTwentyCrmActivityReconciliation(pool(),input);
