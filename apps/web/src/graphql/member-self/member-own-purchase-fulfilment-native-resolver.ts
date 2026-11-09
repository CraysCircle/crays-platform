import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {MemberPurchaseFulfilmentRead,memberPurchaseFulfilmentInput} from "@/lib/clubs/member-purchase-fulfilment-contract";
import {memberSelfPorts} from "./member-self-runtime-ports";
import {MEMBER_PURCHASE_FULFILMENT_SQL,queryMemberOwnPurchaseFulfilment} from "@/db/core-member-purchase-fulfilment-runtime";
const account="acct_384c05e7-e716-4dc9-864d-8c63bf13876c";
export async function readNativeMemberOwnPurchaseFulfilment(_:unknown,args:{input:unknown},context:{request:Request}){
 const input=memberPurchaseFulfilmentInput.safeParse(args.input);
 if(!input.success)throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});
 try{
  const sdk=await memberSelfPorts.resolveCurrentSdk(context.request);
  if(!sdk||sdk.expectedAccountId!==account)throw new GraphQLError("Member binding is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
  const result=await queryMemberOwnPurchaseFulfilment(MEMBER_PURCHASE_FULFILMENT_SQL,[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex"),input.data.orderId]);
  if(result.rows.length!==1||Object.keys(result.rows[0]).join(",")!=="payload")throw Error("FULFILMENT_ENVELOPE_INVALID");
  const data=MemberPurchaseFulfilmentRead.parse(result.rows[0].payload);
  const ids=new Set(data.tasks.map(t=>`${t.orderId}:${t.lineId}`));
  if(data.accountId!==sdk.expectedAccountId||ids.size!==data.tasks.length||input.data.orderId!==null&&data.tasks.some(t=>t.orderId!==input.data.orderId))throw Error("FULFILMENT_SCOPE_INVALID");
  const fresh=await memberSelfPorts.resolveCurrentSdk(context.request);
  if(!fresh||fresh.expectedAccountId!==sdk.expectedAccountId||fresh.subject!==sdk.subject||fresh.issuer!==sdk.issuer||fresh.serverConfiguredClientId!==sdk.serverConfiguredClientId)throw new GraphQLError("Member access changed.",{extensions:{code:"FORBIDDEN"}});
  return data;
 }catch(e){if(e instanceof GraphQLError)throw e;throw new GraphQLError("Your purchase preparation is temporarily unavailable.",{extensions:{code:"UNAVAILABLE"}});}
}
