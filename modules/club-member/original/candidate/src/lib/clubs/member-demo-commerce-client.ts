import {memberGraphQLEndpoint} from "./member-graphql-transport";
import {z} from "zod";
import operationIds from "./member-demo-commerce-operations.json";
import {memberCommerceCommandSchema,type MemberCommerceCommand} from "./member-demo-commerce-command-contract";
import {memberCommerceCommandStatusSchema} from "./member-demo-commerce-command-status-contract";
const nativeOrder=z.object({id:z.string(),code:z.string(),state:z.string(),currencyCode:z.literal("USD"),totalWithTax:z.number().int().nonnegative()}).passthrough();
const line=z.object({lineId:z.string().nullable(),offerId:z.string(),slotId:z.string(),quantity:z.number().int().min(1).max(100),title:z.string(),date:z.string(),unitPriceMinor:z.number().int().nonnegative(),imageAssetId:z.string().nullable()}).strict();
const commandReceipt=z.object({commandId:z.string().min(3).max(180),cartId:z.string().nullable(),expectedVersion:z.number().int().nonnegative(),expectedTotalMinor:z.number().int().nonnegative().nullable(),idempotencyKey:z.string().min(16).max(100),action:z.enum(["add","adjust","remove","checkout","restart"]),state:z.enum(["applied","unknown","rejected"]),orderId:z.string().nullable(),orderCode:z.string().nullable(),errorCode:z.string().nullable()}).strict().superRefine((v,c)=>{if(v.state!=="applied"&&(v.orderId!==null||v.orderCode!==null)||v.state==="applied"&&v.action==="checkout"&&(!v.orderId||!v.orderCode))c.addIssue({code:"custom",message:"Unconfirmed purchase cannot carry a confirmation"});});
export class MemberCommerceUpdateError extends Error{constructor(readonly outcome:"rejected"|"unknown",readonly code:string,readonly reasonCode:string|null=null){super("COMMERCE_UPDATE_"+outcome.toUpperCase());}}
/** A lost response never proves that a command was rejected. Keep the original
 * command reference for reconciliation; aborting the client never retries it. */
async function fetchCommerceResponse(body:string):Promise<{response:Response;body:unknown}>{
 const controller=new AbortController();
 let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new MemberCommerceUpdateError("unknown","COMMERCE_RESPONSE_TIMEOUT"));controller.abort();},8_000);});
 try{
  return await Promise.race([fetch(memberGraphQLEndpoint(),{method:"POST",credentials:"same-origin",cache:"no-store",signal:controller.signal,headers:{"Content-Type":"application/json"},body}).then(async response=>({response,body:await response.json() as unknown})),deadline]);
 }finally{if(timer!==undefined)clearTimeout(timer);}
}
export const commerceReadSchema=z.object({schema:z.literal("crays.member.demo-commerce.v1"),accountId:z.string(),currency:z.literal("USD"),testOnly:z.literal(true),liveMoney:z.literal(false),cartContext:z.object({generation:z.literal("member-native-cart-context-v1"),expiresAt:z.number().int().nonnegative(),token:z.string().min(1).max(2500)}).strict(),commandReceipt:commandReceipt.optional(),commandStatus:memberCommerceCommandStatusSchema.optional(),cart:z.object({cartId:z.string(),version:z.number().int().positive(),state:z.enum(["open","reconciliation_required"]),canStartFreshCart:z.boolean(),unknownCommandId:z.string().nullable(),order:z.union([nativeOrder,z.object({}).strict()]),lines:z.array(line).max(100)}).strict().nullable(),orders:z.array(z.object({cartId:z.string(),version:z.number().int().positive(),order:nativeOrder,financeState:z.enum(["pending","acknowledged","unknown","rejected"]).nullable(),erpReceipt:z.unknown().nullable(),integrationComplete:z.boolean()}).strict()).max(100)}).strict();
export type MemberDemoCommerce=z.output<typeof commerceReadSchema>;
export async function readMemberDemoCommerce(command?:Record<string,unknown>,pendingCommand?:MemberCommerceCommand):Promise<MemberDemoCommerce>{
 if(command&&pendingCommand)throw new MemberCommerceUpdateError("unknown","COMMERCE_RECOVERY_INPUT_INVALID");
 const pending=pendingCommand?memberCommerceCommandSchema.parse(pendingCommand):null;
 const name=command?"ClubMemberCommerceCommand":"ClubMemberOwnCommerce",field=command?"clubMemberCommerceCommand":"clubMemberOwnCommerce";
 const {response,body}=await fetchCommerceResponse(JSON.stringify({operationName:name,variables:{input:command?{commandJson:JSON.stringify(command)}:{contractVersion:"1.0.0",...(pending?{pendingCommandJson:JSON.stringify(pending)}:{})}},extensions:{persistedQuery:{version:1,sha256Hash:operationIds[name]}}}));
 if(!body||typeof body!=="object")throw new MemberCommerceUpdateError("unknown","INVALID_RESPONSE");
 const partial="data" in body&&body.data&&typeof body.data==="object"&&(body.data as Record<string,unknown>)[field]!=null;
 const errors="errors" in body?body.errors:undefined;if(errors!=null&&(!Array.isArray(errors)||errors.length)){const code=Array.isArray(errors)?errors[0]?.extensions?.code:null;throw new MemberCommerceUpdateError(!partial&&["COMMERCE_OTHER_UPDATE_PENDING","COMMERCE_PROVIDER_UNAVAILABLE","COMMERCE_COMMAND_REJECTED","BAD_USER_INPUT","IDENTITY_BINDING_REQUIRED"].includes(typeof code==="string"?code:"")?"rejected":"unknown",typeof code==="string"?code:"OUTCOME_UNKNOWN",Array.isArray(errors)&&["FORBIDDEN","CONFLICT","BAD_USER_INPUT"].includes(errors[0]?.extensions?.reasonCode)?errors[0].extensions.reasonCode:null);}
 const envelope="data" in body&&body.data&&typeof body.data==="object"?(body.data as Record<string,unknown>)[field]:null;
 if(!response.ok||!envelope||typeof envelope!=="object"||!("payloadJson" in envelope)||typeof envelope.payloadJson!=="string")throw new MemberCommerceUpdateError("unknown","INVALID_RESPONSE");
 const json=envelope.payloadJson;if(json.length>200000||json.includes('sessionCipher')||json.includes('shopToken'))throw new MemberCommerceUpdateError("unknown","INVALID_RESPONSE");
 const result=commerceReadSchema.parse(JSON.parse(json));if(!("schema" in envelope)||envelope.schema!==result.schema)throw new MemberCommerceUpdateError("unknown","SCHEMA_MISMATCH");if(command&&(!result.commandReceipt||result.commandReceipt.idempotencyKey!==command.idempotencyKey||result.commandReceipt.action!==command.action||result.commandReceipt.expectedVersion!==command.expectedVersion||command.action==="checkout"&&result.commandReceipt.expectedTotalMinor!==command.expectedTotalMinor))throw new MemberCommerceUpdateError("unknown","COMMAND_RECEIPT_MISMATCH");return result;
}
