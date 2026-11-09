import {z} from "zod";
export const MemberPurchaseFulfilmentTask=z.object({
 kind:z.literal("purchase_fulfilment"),provider:z.literal("plane"),
 orderId:z.string(),lineId:z.string(),taskId:z.string().uuid(),projectId:z.string().uuid(),workspaceId:z.string().uuid(),
 offerId:z.string(),offerKind:z.enum(["experience","service"]),title:z.string(),
 slotId:z.string().nullable(),date:z.string().nullable(),quantity:z.number().int().positive(),
 nativeStateId:z.string().uuid(),status:z.enum(["allocated_test","in_progress_test","completed_test"]),
 assigneeType:z.literal("automation"),assigneeName:z.literal("CRAYS Support Automation (TEST)"),
 nativeApiAcknowledged:z.literal(true),testOnly:z.literal(true),
 realWorldDeliveryConfirmed:z.literal(false),humanTeamAssigned:z.literal(false)
}).strict();
export const MemberPurchaseFulfilmentRead=z.object({
 schema:z.literal("crays.clubs.member-purchase-fulfilment.v1"),accountId:z.string(),tasks:z.array(MemberPurchaseFulfilmentTask),
 testOnly:z.literal(true),realWorldDeliveryConfirmed:z.literal(false),humanTeamAssigned:z.literal(false)
}).strict();
export const memberPurchaseFulfilmentLabel={
 allocated_test:"Assigned to TEST automation",
 in_progress_test:"TEST preparation in progress",
 completed_test:"TEST workflow completed"
} as const;

export type MemberPurchaseFulfilmentRead = z.infer<typeof MemberPurchaseFulfilmentRead>;
export const memberPurchaseFulfilmentInput=z.object({contractVersion:z.literal("1.0.0"),orderId:z.string().regex(/^[0-9]{1,12}$/).nullable()}).strict();
