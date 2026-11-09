import type {MemberFinanceRead} from "@/lib/clubs/member-finance-contract";
import type {MemberPurchaseFulfilmentRead} from "@/lib/clubs/member-purchase-fulfilment-contract";
import type {MemberFeed} from "./clubs-member-home-model";
export type MemberPurchaseRequest={key:string;kind:"services"|"experiences";id:string;subject:string;reference:string;status:string;bookingId:null;updatedAt:null;purchase:{orderId:string;lineId:string;taskId:string;invoiceId:string;date:string|null;quantity:number;assigneeName:string;grossTotalMinor:number;currency:"USD"}};
/** Join original Core finance and independently acknowledged native tasks. A purchase is never a hotel booking. */
export function memberPurchaseRequestFeed(finance:MemberFeed<MemberFinanceRead>|undefined,fulfilment:MemberFeed<MemberPurchaseFulfilmentRead>|undefined):MemberFeed<{rows:MemberPurchaseRequest[];unverifiedLineCount:number}>{
 if(finance?.kind==="loading"||fulfilment?.kind==="loading")return {kind:"loading"};
 if(finance?.kind!=="ready"||fulfilment?.kind!=="ready"||finance.data.accountId!=="acct_384c05e7-e716-4dc9-864d-8c63bf13876c"||finance.data.accountId!==fulfilment.data.accountId)return {kind:"unavailable"};
 const tasks=new Map<string,MemberPurchaseFulfilmentRead["tasks"][number]>();
 for(const task of fulfilment.data.tasks){const key=`${task.orderId}:${task.lineId}`;if(tasks.has(key))return {kind:"unavailable"};tasks.set(key,task);}
 const seen=new Set<string>();let unverifiedLineCount=0;const rows:MemberPurchaseRequest[]=[];
 for(const order of finance.data.orders)for(const line of order.lines){
  if(!/^[1-9][0-9]{0,19}$/.test(order.orderId)||!/^[1-9][0-9]{0,19}$/.test(line.lineId)||order.currency!=="USD"||line.currency!=="USD")return {kind:"unavailable"};
  const key=`${order.orderId}:${line.lineId}`;if(seen.has(key))return {kind:"unavailable"};seen.add(key);
  const task=tasks.get(key);
  if(!task||task.offerId!==line.offerId||task.offerKind!==line.kind||task.quantity!==line.quantity||task.date!==line.date||task.slotId!==line.slotId||task.nativeApiAcknowledged!==true||task.testOnly!==true||task.realWorldDeliveryConfirmed!==false||task.humanTeamAssigned!==false||!(["allocated_test","in_progress_test","completed_test"] as string[]).includes(task.status)){unverifiedLineCount++;continue;}
  rows.push({key:`purchased:${key}`,kind:line.kind==="service"?"services":"experiences",id:task.taskId,subject:line.title,reference:`Order ${order.orderId} · Line ${line.lineId}`,status:task.status,bookingId:null,updatedAt:null,purchase:{orderId:order.orderId,lineId:line.lineId,taskId:task.taskId,invoiceId:order.invoiceId,date:line.date,quantity:line.quantity,assigneeName:task.assigneeName,grossTotalMinor:line.grossTotalMinor,currency:"USD"}});
 }
 return {kind:"ready",data:{rows,unverifiedLineCount}};
}
