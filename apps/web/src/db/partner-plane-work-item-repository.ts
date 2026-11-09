import "server-only";
import {getCorePgPool} from "@/db/client";
import {persistPartnerPlaneWorkItemCommand as persistCommand,persistPartnerPlaneWorkItemReceipt as persistReceipt,persistPartnerPlaneWorkItemReconciliation as persistReconciliation} from "../lib/member-commerce/partner-plane-work-item-repository";
import type {observePartnerPlaneWorkItem,preparePartnerPlaneWorkItemDelivery,reconcilePartnerPlaneWorkItem} from "../lib/member-commerce/partner-plane-work-item-delivery-contract";
const pool=()=>getCorePgPool() as unknown as Parameters<typeof persistCommand>[0];
export const persistCorePartnerPlaneWorkItemCommand=(value:ReturnType<typeof preparePartnerPlaneWorkItemDelivery>)=>persistCommand(pool(),value);
export const persistCorePartnerPlaneWorkItemReceipt=(value:ReturnType<typeof observePartnerPlaneWorkItem>)=>persistReceipt(pool(),value);
export const persistCorePartnerPlaneWorkItemReconciliation=(value:ReturnType<typeof reconcilePartnerPlaneWorkItem>)=>persistReconciliation(pool(),value);
