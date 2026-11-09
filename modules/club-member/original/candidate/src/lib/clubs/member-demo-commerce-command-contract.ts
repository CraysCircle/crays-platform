import {z} from "zod";
const id=z.string().min(1).max(180),sha=z.string().regex(/^[a-f0-9]{64}$/);
const base={contractVersion:z.literal("1.0.0"),idempotencyKey:z.string().min(16).max(100),expectedVersion:z.number().int().min(0)};
const fenceBase={...base,expectedVersion:z.number().int().min(0).max(999999999)};
export const memberNonpaymentCommerceCommandSchema=z.discriminatedUnion("action",[
 z.object({...fenceBase,action:z.literal("add"),offerId:id,offerVersion:z.number().int().positive().max(999999999),priceRevisionSha256:sha,slotId:id,slotVersion:z.number().int().positive().max(999999999),slotSha256:sha,quantity:z.number().int().min(1).max(100)}).strict(),
 z.object({...fenceBase,action:z.literal("remove"),lineId:id}).strict(),
 z.object({...fenceBase,action:z.literal("adjust"),lineId:id,quantity:z.number().int().min(1).max(100)}).strict(),
]);
export const memberCommerceCommandSchema=z.discriminatedUnion("action",[
 z.object({...base,action:z.literal("add"),offerId:id,offerVersion:z.number().int().positive(),priceRevisionSha256:sha,slotId:id,slotVersion:z.number().int().positive(),slotSha256:sha,quantity:z.number().int().min(1).max(100)}).strict(),
 z.object({...base,action:z.literal("restart"),commandId:id,abandonedCommand:memberNonpaymentCommerceCommandSchema.optional()}).strict(),
 z.object({...base,action:z.literal("remove"),lineId:id}).strict(),
 z.object({...base,action:z.literal("adjust"),lineId:id,quantity:z.number().int().min(1).max(100)}).strict(),
 z.object({...base,action:z.literal("checkout"),reviewed:z.literal(true),expectedTotalMinor:z.number().int().min(0).max(1000000000)}).strict()
]);
export type MemberCommerceCommand=z.output<typeof memberCommerceCommandSchema>;
export const memberCommerceReadInputSchema=z.object({contractVersion:z.literal("1.0.0"),pendingCommandJson:z.string().min(2).max(5000).optional()}).strict();
