import type {MemberDemoCommerce} from "../../../lib/clubs/member-demo-commerce-client";
export const MEMBER_COMMERCE_REFRESH_EVENT="crays-member-commerce-updated";
export const MEMBER_FINANCE_POLL_INTERVAL=2000;
export const MEMBER_FINANCE_POLL_MAX_MS=150000;
export function commercePresentation(data:MemberDemoCommerce|null,loading:boolean){
 if(!data)return loading?"loading":"unavailable";
 if(data.cart?.state==="reconciliation_required")return "checking";
 return data.cart?.lines.length?"items":"empty";
}
export function pendingCommerceFinanceIds(data:MemberDemoCommerce|null):string[]{
 return data?.orders.filter(order=>(order.financeState==="pending"||order.financeState==="unknown")&&!order.integrationComplete).map(order=>order.order.id).sort()??[];
}
/** Invalidate feeds only on a genuine new confirmed order or authoritative ERP
 * acknowledgement, never on first mount, failed write, or a speculative cart. */
export function commerceFeedsChanged(previous:MemberDemoCommerce|null,next:MemberDemoCommerce){
 if(!previous||previous.accountId!==next.accountId)return false;
 return next.orders.some(order=>{
  const prior=previous.orders.find(value=>value.order.id===order.order.id);
  return (!prior&&order.order.state==="PaymentSettled")||Boolean(prior&&!prior.integrationComplete&&order.integrationComplete&&order.financeState==="acknowledged");
 });
}
