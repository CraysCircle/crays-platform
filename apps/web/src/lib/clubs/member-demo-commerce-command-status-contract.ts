import {z} from "zod";
import {memberCommerceCommandSchema} from "./member-demo-commerce-command-contract";
const base={schema:z.literal("crays.member.commerce.command-status.v1"),accountId:z.string().min(1).max(180),idempotencyKey:z.string().min(16).max(100),testOnly:z.literal(true),liveMoney:z.literal(false)};
const exactDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const d=new Date(value+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;});
export const memberCommerceCheckoutSnapshotSchema=z.object({
 commandId:z.string().min(1).max(180),idempotencyKey:base.idempotencyKey,accountId:base.accountId,cartId:z.string().min(1).max(180),cartVersion:z.number().int().positive(),expectedVersion:z.number().int().positive(),orderId:z.string().min(1).max(180),orderCode:z.string().min(1).max(180),currency:z.literal("USD"),totalMinor:z.number().int().nonnegative(),expectedTotalMinor:z.number().int().nonnegative(),
 lines:z.array(z.object({lineId:z.string().min(1).max(180),offerId:z.string().min(1).max(180),slotId:z.string().min(1).max(180),quantity:z.number().int().min(1).max(100),title:z.string().min(1).max(500),date:exactDate,unitPriceMinor:z.number().int().nonnegative(),imageAssetId:z.string().min(1).max(180).nullable()}).strict()).min(1).max(100)
}).strict().superRefine((value,context)=>{
 const ids=new Set<string>();let total=0;
 for(const line of value.lines){if(ids.has(line.lineId))context.addIssue({code:"custom",message:"Duplicate original line"});ids.add(line.lineId);total+=line.quantity*line.unitPriceMinor;}
 if(value.cartVersion!==value.expectedVersion||value.totalMinor!==value.expectedTotalMinor||!Number.isSafeInteger(total)||total!==value.totalMinor)context.addIssue({code:"custom",message:"Original checkout snapshot differs"});
});
export const memberCommerceCommandStatusSchema=z.discriminatedUnion("found",[
 z.object({...base,found:z.literal(false)}).strict(),
 z.object({...base,found:z.literal(true),commandId:z.string().min(1).max(180),cartId:z.string().min(1).max(180),command:memberCommerceCommandSchema,state:z.enum(["prepared","unknown","rejected","applied"]),orderId:z.string().min(1).max(180).nullable(),orderCode:z.string().min(1).max(180).nullable(),errorCode:z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/).nullable(),checkoutSnapshot:memberCommerceCheckoutSnapshotSchema.nullable().optional()}).strict()
]).superRefine((value,context)=>{
 if(!value.found)return;
 if(value.command.idempotencyKey!==value.idempotencyKey)context.addIssue({code:"custom",message:"Original command key differs"});
 if(value.state!=="applied"||value.command.action!=="checkout"){
  if(value.orderId!==null||value.orderCode!==null)context.addIssue({code:"custom",message:"Unconfirmed command cannot carry an order confirmation"});
  if(value.checkoutSnapshot!=null)context.addIssue({code:"custom",message:"Only original applied checkout carries reviewed lines"});
 }else if(!value.orderId||!value.orderCode)context.addIssue({code:"custom",message:"Applied checkout requires its original order"});
 if(value.command.action==="checkout"&&value.checkoutSnapshot){const s=value.checkoutSnapshot;
  if(s.accountId!==value.accountId||s.commandId!==value.commandId||s.idempotencyKey!==value.idempotencyKey||s.cartId!==value.cartId||s.expectedVersion!==value.command.expectedVersion||s.expectedTotalMinor!==value.command.expectedTotalMinor||s.orderId!==value.orderId||s.orderCode!==value.orderCode)context.addIssue({code:"custom",message:"Snapshot is not this original checkout"});
 }
});
