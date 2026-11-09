import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {z} from "zod";
import {memberServiceOffersReadSchema,memberExperienceReadInputSchema} from "@/lib/clubs/member-service-offers-contract";
import {memberSelfPorts} from "./member-self-runtime-ports";
import {MEMBER_DEMO_SERVICES_SQL,queryMemberOwnDemoServices} from "@/db/core-member-demo-services-runtime";
const inputSchema=memberExperienceReadInputSchema.extend({contractVersion:z.literal("1.0.0")}).strict();
export async function readNativeMemberOwnServices(_:unknown,args:{input:unknown},context:{request:Request}){
 const input=inputSchema.safeParse(args.input);if(!input.success)throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});
 try{
  const sdk=await memberSelfPorts.resolveCurrentSdk(context.request);if(!sdk)throw new GraphQLError("Member binding is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
  const result=await queryMemberOwnDemoServices(MEMBER_DEMO_SERVICES_SQL,[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex"),input.data.offerId,input.data.planId,input.data.limit]);
  if(result.rows.length!==1||!result.rows[0]||Object.keys(result.rows[0]).join(",")!=="payload")throw Error("MEMBER_CATALOG_ENVELOPE_INVALID");
  const payload=memberServiceOffersReadSchema.parse(result.rows[0].payload);
  if(payload.accountId!==sdk.expectedAccountId||payload.catalog.length>input.data.limit||input.data.offerId&&payload.catalog.some(o=>o.offerId!==input.data.offerId)||payload.plans.length!==0)throw Error("MEMBER_CATALOG_SCOPE_INVALID");
  const fresh=await memberSelfPorts.resolveCurrentSdk(context.request);if(!fresh||fresh.expectedAccountId!==sdk.expectedAccountId||fresh.subject!==sdk.subject)throw new GraphQLError("Member access changed.",{extensions:{code:"FORBIDDEN"}});
  return payload;
 }catch(e){if(e instanceof GraphQLError)throw e;throw new GraphQLError("Your services are temporarily unavailable.",{extensions:{code:"UNAVAILABLE"}});}
}
