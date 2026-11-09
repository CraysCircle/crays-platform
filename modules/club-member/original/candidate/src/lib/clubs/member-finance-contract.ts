import {z} from "zod";
export const memberFinanceOrderLineSchema=z.object({
 lineId:z.string().min(1),offerId:z.string().min(1),variantId:z.string().min(1),sku:z.string().min(1),
 title:z.string().min(1),kind:z.enum(["experience","service"]),productKind:z.string().min(1),category:z.string().min(1),
 imageAssetId:z.string().min(1).nullable(),quantity:z.number().int().positive(),currency:z.literal("USD"),
 unitPriceMinor:z.number().int().nonnegative(),grossTotalMinor:z.number().int().nonnegative(),
 slotId:z.string().min(1).nullable(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
 bookingState:z.literal("booked_test"),financeState:z.literal("erp_acknowledged"),testOnly:z.literal(true)
}).strict();
export type MemberFinanceOrderLine=z.output<typeof memberFinanceOrderLineSchema>;
export const memberFinanceOrderSchema=z.object({orderId:z.string().min(1),paymentId:z.string().min(1).nullable(),title:z.string().min(1),offerId:z.string().min(1),currency:z.literal("USD"),totalMinor:z.number().int().nonnegative(),outstandingMinor:z.number().int().nonnegative(),salesOrderId:z.string().min(1),invoiceId:z.string().min(1),paymentEntryId:z.string().min(1).nullable(),invoiceStatus:z.literal("Paid"),financeState:z.literal("erp_acknowledged"),testOnly:z.literal(true),lines:z.array(memberFinanceOrderLineSchema).min(1).max(100)}).strict();
export const memberFinanceReadSchema=z.object({schema:z.literal("crays.clubs.member-finance-read.v2"),accountId:z.string().min(1),sourceAuthority:z.literal("test_only"),orders:z.array(memberFinanceOrderSchema).max(100)}).strict();
export type MemberFinanceRead=z.output<typeof memberFinanceReadSchema>;
