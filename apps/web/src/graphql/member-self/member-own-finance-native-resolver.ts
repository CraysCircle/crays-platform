import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {z} from "zod";
import {memberFinanceReadSchema} from "@/lib/clubs/member-finance-contract";
import {memberSelfPorts} from "./member-self-runtime-ports";
import {MEMBER_DEMO_FINANCE_SQL,queryMemberOwnDemoFinance} from "@/db/core-member-demo-finance-runtime";
import {memberExperienceReadInputSchema} from "@/lib/clubs/member-experience-contract";
const inputSchema=memberExperienceReadInputSchema.extend({contractVersion:z.literal("1.0.0")}).strict();
export async function readNativeMemberOwnFinance(_:unknown,args:{input:unknown},context:{request:Request}){
 const input=inputSchema.safeParse(args.input);if(!input.success)throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});
 try{
  const sdk=await memberSelfPorts.resolveCurrentSdk(context.request);if(!sdk)throw new GraphQLError("Member binding is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
  const result=await queryMemberOwnDemoFinance(MEMBER_DEMO_FINANCE_SQL,[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex"),input.data.offerId,input.data.planId,input.data.limit]);
  if(result.rows.length!==1||!result.rows[0]||Object.keys(result.rows[0]).join(",")!=="payload")throw Error("MEMBER_CATALOG_ENVELOPE_INVALID");
  const payload=memberFinanceReadSchema.parse(result.rows[0].payload);
  if(payload.accountId!==sdk.expectedAccountId||input.data.offerId!==null||input.data.planId!==null||payload.orders.length>input.data.limit)throw Error("MEMBER_FINANCE_SCOPE_INVALID");
  const fresh=await memberSelfPorts.resolveCurrentSdk(context.request);if(!fresh||fresh.expectedAccountId!==sdk.expectedAccountId||fresh.subject!==sdk.subject)throw new GraphQLError("Member access changed.",{extensions:{code:"FORBIDDEN"}});
  return payload;
 }catch(e){if(e instanceof GraphQLError)throw e;throw new GraphQLError("Your finance are temporarily unavailable.",{extensions:{code:"UNAVAILABLE"}});}
}
