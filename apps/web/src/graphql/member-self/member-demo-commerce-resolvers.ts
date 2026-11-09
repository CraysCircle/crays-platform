import "server-only";
import {dispatchCommittedMemberTestFinance} from "@/lib/clubs/finance-dispatch-hook";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {z} from "zod";
import {memberSelfPorts} from "./member-self-runtime-ports";
import {queryMemberDemoCommerce,MemberCommerceStatusNotAdmitted} from "@/db/core-member-demo-commerce-runtime";
import {commerceHash,executeNativeMemberDemoCommerce,preflightNativeMemberDemoCommerce,NativeCommercePreflightRejected,issueNativeCartContext,verifyNativeCartContext,NativeCartContextRejected,nativeCartCommandExpiry} from "@/lib/clubs/member-demo-vendure-provider";
import {memberCommerceCommandSchema,memberCommerceReadInputSchema} from "@/lib/clubs/member-demo-commerce-command-contract";
import {memberCommerceCommandStatusSchema} from "@/lib/clubs/member-demo-commerce-command-status-contract";
export {memberCommerceCommandSchema} from "@/lib/clubs/member-demo-commerce-command-contract";
const readInput=memberCommerceReadInputSchema;
async function identity(request:Request){const sdk=await memberSelfPorts.resolveCurrentSdk(request);if(!sdk)throw new GraphQLError("Please sign in to your member account.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});return {sdk,values:[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex")]};}
async function fresh(request:Request,sdk:Awaited<ReturnType<typeof identity>>["sdk"]){const after=await memberSelfPorts.resolveCurrentSdk(request);if(!after||after.subject!==sdk.subject||after.issuer!==sdk.issuer||after.serverConfiguredClientId!==sdk.serverConfiguredClientId||after.expectedAccountId!==sdk.expectedAccountId)throw new GraphQLError("Your account access changed.",{extensions:{code:"FORBIDDEN"}});}
function publicPayload(data:Record<string,unknown>,accountId:string){if(data.schema!=="crays.member.demo-commerce.v1"||data.accountId!==accountId||data.currency!=="USD"||data.liveMoney!==false||data.testOnly!==true)throw Error("COMMERCE_PUBLIC_SCOPE_INVALID");const text=JSON.stringify(data);if(text.includes('sessionCipher')||text.includes('shopToken'))throw Error("COMMERCE_SECRET_DISCLOSURE_DENIED");return {schema:String(data.schema),payloadJson:text};}
export async function readNativeMemberOwnCommerce(_:unknown,args:{input:unknown},context:{request:Request}){
 let pending:z.output<typeof memberCommerceCommandSchema>|null=null;
 try{const input=readInput.parse(args.input);if(input.pendingCommandJson)pending=memberCommerceCommandSchema.parse(JSON.parse(input.pendingCommandJson));}
 catch{throw new GraphQLError("Please check your saved booking reference.",{extensions:{code:"BAD_USER_INPUT"}});}
 const {sdk,values}=await identity(context.request);const data=await queryMemberDemoCommerce("read",values);
 let commandStatus:unknown;const pendingExpiry=pending?nativeCartCommandExpiry(pending):null;
 if(pending){
  try{const decoded=memberCommerceCommandStatusSchema.parse(await queryMemberDemoCommerce("status",[...values,pending.idempotencyKey],{mode:"statusBarrier",accountId:sdk.expectedAccountId}));
   if(decoded.accountId!==sdk.expectedAccountId||decoded.idempotencyKey!==pending.idempotencyKey)throw Error("COMMERCE_STATUS_SCOPE_INVALID");commandStatus=decoded;
  }catch(error){if(!(error instanceof MemberCommerceStatusNotAdmitted))throw error;}
 }
 await fresh(context.request,sdk);return publicPayload({...data,cartContext:await issueNativeCartContext(data,pending&&pendingExpiry!==null&&pendingExpiry>Date.now()?pending:undefined),...(commandStatus?{commandStatus}:{})},sdk.expectedAccountId);
}
export async function writeNativeMemberOwnCommerce(_:unknown,args:{input:{commandJson?:unknown}},context:{request:Request}){
 // Older compiled clients must retain their original reference. Their error
 // classifier treats this upgrade code as unknown, never as safe-to-clear.
 let decoded:Record<string,unknown>;
 try{if(Object.keys(args.input).join(",")!=="commandJson"||typeof args.input.commandJson!=="string"||args.input.commandJson.length>5000)throw Error();const value=JSON.parse(args.input.commandJson);if(!value||typeof value!=="object"||Array.isArray(value))throw Error();decoded=value;}
 catch{throw new GraphQLError("Please check your booking details.",{extensions:{code:"BAD_USER_INPUT"}});}
 if(typeof decoded.cartContextToken!=="string")throw new GraphQLError("Refresh the member area before changing your cart.",{extensions:{code:"COMMERCE_CLIENT_UPDATE_REQUIRED"}});
 let input:z.output<typeof memberCommerceCommandSchema>,cartContextToken:string;
 try{cartContextToken=z.string().min(1).max(2500).parse(decoded.cartContextToken);const {cartContextToken:ignored,...canonicalCommand}=decoded;input=memberCommerceCommandSchema.parse(canonicalCommand);}
 catch{throw new GraphQLError("Please check your booking details.",{extensions:{code:"BAD_USER_INPUT"}});}
 const {sdk,values}=await identity(context.request);
 let prepareReturned=false;
 try{
  const cartContext=await verifyNativeCartContext(cartContextToken!,sdk.expectedAccountId);
  if(input.action!=="restart")await preflightNativeMemberDemoCommerce(sdk.expectedAccountId);
  const prepared=await queryMemberDemoCommerce("prepare",[...values,JSON.stringify(input),commerceHash(input)],{mode:"prepare",context:cartContext});
  prepareReturned=true;
  if(input.action==="restart"&&!prepared.replay)throw Error("COMMERCE_RESTART_INVALID");
  let committed:Record<string,any>|null=null;
  if(!prepared.replay){await fresh(context.request,sdk);const effect=await executeNativeMemberDemoCommerce(prepared,input,sdk.expectedAccountId);committed=await queryMemberDemoCommerce("finish",[...values,prepared.commandId,JSON.stringify(effect.result),effect.sessionCipher]);if(input.action==="checkout"&&committed?.state==="applied"&&typeof committed.order?.id==="string")dispatchCommittedMemberTestFinance(committed.order.id);}else {committed=prepared.outcome??prepared;if(input.action==="checkout"&&prepared.state==="applied"&&typeof prepared.outcome?.order?.id==="string")dispatchCommittedMemberTestFinance(prepared.outcome.order.id);}
  const data=await queryMemberDemoCommerce("read",values);await fresh(context.request,sdk);
  // Read the immutable original command status for every action, including
  // restart: its first prepare response does not carry the archived cart ID.
  const status=memberCommerceCommandStatusSchema.parse(await queryMemberDemoCommerce("status",[...values,input.idempotencyKey],{mode:"statusBarrier",accountId:sdk.expectedAccountId}));
  if(!status.found||status.accountId!==sdk.expectedAccountId||status.commandId!==prepared.commandId||commerceHash(status.command)!==commerceHash(input))throw Error("COMMERCE_COMMAND_RECEIPT_INVALID");
  const commandReceipt={commandId:status.commandId,cartId:status.cartId,expectedVersion:input.expectedVersion,expectedTotalMinor:input.action==="checkout"?input.expectedTotalMinor:null,idempotencyKey:input.idempotencyKey,action:input.action,state:status.state==="prepared"?"unknown":status.state,orderId:status.orderId,orderCode:status.orderCode,errorCode:status.errorCode};
  return publicPayload({...data,cartContext:await issueNativeCartContext(data),commandReceipt},sdk.expectedAccountId);
 }catch(error){if(!prepareReturned&&error instanceof NativeCartContextRejected)throw new GraphQLError("Your cart changed. Refresh and review before continuing.",{extensions:{code:"COMMERCE_COMMAND_REJECTED",reasonCode:"CONFLICT"}});if(error instanceof NativeCommercePreflightRejected)throw new GraphQLError("Booking is temporarily unavailable. Your cart has not been changed.",{extensions:{code:"COMMERCE_PROVIDER_UNAVAILABLE"}});if(error instanceof GraphQLError)throw error;const nativeCode=error&&typeof error==="object"&&"code" in error?String(error.code):null;if(!prepareReturned&&nativeCode==="55000")throw new GraphQLError("An earlier cart update is still being checked. Refresh its saved status.",{extensions:{code:"COMMERCE_OTHER_UPDATE_PENDING"}});if(!prepareReturned&&["22023","40001","42501"].includes(nativeCode??""))throw new GraphQLError(nativeCode==="42501"?"Your account access does not allow this cart change.":nativeCode==="40001"?"Availability or your cart version changed. Refresh before making a new change.":"Please check your booking details.",{extensions:{code:"COMMERCE_COMMAND_REJECTED",reasonCode:nativeCode==="42501"?"FORBIDDEN":nativeCode==="40001"?"CONFLICT":"BAD_USER_INPUT"}});throw new GraphQLError("We couldn’t confirm that update. Refresh your cart before trying again.",{extensions:{code:"COMMERCE_RECONCILIATION_REQUIRED"}});}
}
