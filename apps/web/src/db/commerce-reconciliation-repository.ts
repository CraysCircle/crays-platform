import "server-only";
import {getCorePgPool} from "@/db/client";
import {persistCommerceReconciliationTransaction,type CommerceReconciliationPool} from "@/lib/member-commerce/commerce-reconciliation-repository";

export function persistCoreCommerceReconciliation(prepared:Parameters<typeof persistCommerceReconciliationTransaction>[1]){
  return persistCommerceReconciliationTransaction(getCorePgPool() as unknown as CommerceReconciliationPool,prepared);
}
