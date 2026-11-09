import {memberCommerceCommandSchema} from "./member-demo-commerce-command-contract";
import {commerceReadSchema,type MemberDemoCommerce} from "./member-demo-commerce-client";
import type {PendingMemberCommerce} from "./member-demo-commerce-pending-storage";
import type {OriginalCheckoutCartSnapshot} from "./member-checkout-confirmation";
import {memberCommerceCommandStatusSchema} from "./member-demo-commerce-command-status-contract";
export {memberCommerceCommandStatusSchema} from "./member-demo-commerce-command-status-contract";
type Recovery={state:"pending"|"applied"|"rejected";clearPending:boolean;commandId:string|null;receipt:MemberDemoCommerce["commandReceipt"]|null;checkoutSnapshot:OriginalCheckoutCartSnapshot|null;reason:"status_unavailable"|"reference_conflict"|"missing_record"|"original_command_pending"|"checkout_readback_unavailable"|null};
const unresolved=(reason:Recovery["reason"],commandId:string|null=null):Recovery=>({state:"pending",clearPending:false,commandId,receipt:null,checkoutSnapshot:null,reason});
/** Pure join for a future admitted read-only Core status response. This does not
 * fetch, authorize, retry, mutate, clear storage, or infer success from history. */
export function reconcilePendingMemberCommerceStatus(pending:PendingMemberCommerce,rawStatus:unknown,rawCommerce:unknown):Recovery{
 const decoded=memberCommerceCommandStatusSchema.safeParse(rawStatus),original=memberCommerceCommandSchema.safeParse(pending.command);
 if(!decoded.success||!original.success)return unresolved("status_unavailable");
 const status=decoded.data;
 if(status.accountId!==pending.accountId||status.idempotencyKey!==original.data.idempotencyKey)return unresolved("reference_conflict");
 if(!status.found)return unresolved("missing_record");
 if(pending.commandId!==null&&pending.commandId!==status.commandId||JSON.stringify(status.command)!==JSON.stringify(original.data))return unresolved("reference_conflict");
 if(status.state==="prepared"||status.state==="unknown")return unresolved("original_command_pending",status.commandId);
 const command=status.command;
 const receipt:NonNullable<MemberDemoCommerce["commandReceipt"]>={commandId:status.commandId,cartId:status.cartId,expectedVersion:command.expectedVersion,expectedTotalMinor:command.action==="checkout"?command.expectedTotalMinor:null,idempotencyKey:status.idempotencyKey,action:command.action,state:status.state,orderId:status.orderId,orderCode:status.orderCode,errorCode:status.state==="applied"?null:status.errorCode};
 let checkoutSnapshot:OriginalCheckoutCartSnapshot|null=null;
 if(status.state==="applied"&&command.action==="checkout"){
  const fresh=commerceReadSchema.safeParse(rawCommerce);
  if(!fresh.success||fresh.data.accountId!==pending.accountId)return unresolved("checkout_readback_unavailable",status.commandId);
  const matches=fresh.data.orders.filter(value=>value.order.id===status.orderId);
  if(matches.length!==1)return unresolved("checkout_readback_unavailable",status.commandId);
  const selected=matches[0];
  if(selected.cartId!==status.cartId||selected.version!==command.expectedVersion+1||selected.order.code!==status.orderCode||selected.order.state!=="PaymentSettled"||selected.order.totalWithTax!==command.expectedTotalMinor)return unresolved("checkout_readback_unavailable",status.commandId);
  const snapshot=status.checkoutSnapshot,nativeLines=selected.order.lines;
  if(!snapshot||!Array.isArray(nativeLines)||nativeLines.length!==snapshot.lines.length)return unresolved("checkout_readback_unavailable",status.commandId);
  const ids=new Set<string>();
  for(const observed of nativeLines){
   if(!observed||typeof observed!=="object"||typeof observed.id!=="string"||ids.has(observed.id))return unresolved("checkout_readback_unavailable",status.commandId);
   ids.add(observed.id);const captured=snapshot.lines.find(line=>line.lineId===observed.id);
   if(!captured||observed.quantity!==captured.quantity||observed.unitPriceWithTax!==captured.unitPriceMinor||observed.linePriceWithTax!==captured.quantity*captured.unitPriceMinor)return unresolved("checkout_readback_unavailable",status.commandId);
  }
  checkoutSnapshot={...snapshot,lines:snapshot.lines.map(line=>({...line}))};
 }
 return {state:status.state,clearPending:true,commandId:status.commandId,receipt,checkoutSnapshot,reason:null};
}
