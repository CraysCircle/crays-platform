import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {memberSelfPorts} from "./member-self-runtime-ports";
import {memberFinanceRequestCommand,memberFinanceRequestRead,memberFinanceRequestReceipt} from "@/lib/clubs/member-finance-request-contract";
import {queryMemberFinanceRequests,MemberFinanceRequestCommitUnknown} from "@/db/core-member-finance-request-runtime";
import {queueConfirmedNativeMemberSupport} from "@/db/member-support-native-automation-dispatch";
type Context={request:Request};
async function ports(context:Context){
 const sdk=await memberSelfPorts.resolveCurrentSdk(context.request);
 if(!sdk)throw new GraphQLError("Please sign in.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
 const guard=async()=>{const fresh=await memberSelfPorts.resolveCurrentSdk(context.request);if(!fresh||fresh.issuer!==sdk.issuer||fresh.subject!==sdk.subject||fresh.serverConfiguredClientId!==sdk.serverConfiguredClientId||fresh.expectedAccountId!==sdk.expectedAccountId)throw new GraphQLError("Your account access changed.",{extensions:{code:"FORBIDDEN"}});};
 return {sdk,guard,actor:[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex")]};
}
export async function readNativeMemberFinanceRequests(_:unknown,args:{input:{contractVersion?:unknown}},context:Context){
 if(!args.input||Object.keys(args.input).join(",")!=="contractVersion"||args.input.contractVersion!=="1.0.0")throw new GraphQLError("Invalid request.",{extensions:{code:"BAD_USER_INPUT"}});
 try{const {sdk,guard,actor}=await ports(context);const data=await queryMemberFinanceRequests(false,actor,guard,p=>{const d=memberFinanceRequestRead.parse(p);if(d.accountId!==sdk.expectedAccountId)throw Error("SCOPE_MISMATCH");return d;});return {schema:data.schema,payloadJson:JSON.stringify(data)};}
 catch(e){if(e instanceof GraphQLError)throw e;throw new GraphQLError("Your request history is temporarily unavailable.",{extensions:{code:"UNAVAILABLE"}});}
}
export async function submitNativeMemberFinanceRequest(_:unknown,args:{input:{commandJson?:unknown;correlationId?:unknown;requestId?:unknown}},context:Context){
 let command;try{if(!args.input||Object.keys(args.input).sort().join(",")!=="commandJson,correlationId,requestId"||typeof args.input.commandJson!=="string"||args.input.commandJson.length>12000||typeof args.input.correlationId!=="string"||!/^[-A-Za-z0-9:_.]{16,100}$/.test(args.input.correlationId))throw Error();command=memberFinanceRequestCommand.parse(JSON.parse(args.input.commandJson));if(args.input.requestId!==command.requestId)throw Error();}
 catch{throw new GraphQLError("Please check your selected items and reason.",{extensions:{code:"BAD_USER_INPUT"}});}
 try{
  const {sdk,guard,actor}=await ports(context);
  const data=await queryMemberFinanceRequests(true,[...actor,JSON.stringify(command),args.input.correlationId as string],guard,p=>{const d=memberFinanceRequestReceipt.parse(p);if(d.accountId!==sdk.expectedAccountId||d.request.requestId!==command.requestId||d.request.orderId!==command.orderId||d.supportReceipt.accountId!==sdk.expectedAccountId)throw Error("REQUEST_SCOPE_MISMATCH");return d;});
  // Exactly after confirmed COMMIT. Native request and case remain durable if tool dispatch fails.
  if(!data.replayed)queueConfirmedNativeMemberSupport(sdk,data.supportReceipt);
  return {schema:data.schema,payloadJson:JSON.stringify(data)};
 }catch(e){if(e instanceof GraphQLError)throw e;if(e instanceof MemberFinanceRequestCommitUnknown)throw new GraphQLError("We could not confirm the result. Refresh request history to check this request before trying again.",{extensions:{code:"FINANCE_REQUEST_COMMIT_UNKNOWN",requestId:command.requestId}});throw new GraphQLError("We could not save your request. Your details are still here.",{extensions:{code:"FINANCE_REQUEST_NOT_SAVED"}});}
}
