import {MemberPurchaseFulfilmentRead,memberPurchaseFulfilmentInput,type MemberPurchaseFulfilmentRead as Read} from "@/lib/clubs/member-purchase-fulfilment-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";
export const PURCHASE_FULFILMENT_OPERATION_ID="sha256:4970746ce527f89696deefa3db9a436a0407f9b5b500009b3693b0c1ed9a6434";
export async function readMemberPurchaseFulfilmentFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal,orderId:string|null=null):Promise<MemberFeed<Read>>{
 try{
  const operation=registry.operations.ownPurchaseFulfilment;
  if(!operation||operation.operationName!=="ClubMemberOwnPurchaseFulfilment"||operation.field!=="clubMemberOwnPurchaseFulfilment"||operation.kind!=="query"||operation.id!==PURCHASE_FULFILMENT_OPERATION_ID)return {kind:"unavailable"};
  const input=memberPurchaseFulfilmentInput.parse({contractVersion:"1.0.0",orderId});
  const data=await createMemberGraphQLTransport(registry,fetcher).read("ownPurchaseFulfilment",input,MemberPurchaseFulfilmentRead,signal);
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  if(data.accountId!=="acct_384c05e7-e716-4dc9-864d-8c63bf13876c"||input.orderId!==null&&data.tasks.some(t=>t.orderId!==input.orderId)||new Set(data.tasks.map(t=>`${t.orderId}:${t.lineId}`)).size!==data.tasks.length)return {kind:"unavailable"};
  return {kind:"ready",data};
 }catch{
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  return {kind:"unavailable"};
 }
}
