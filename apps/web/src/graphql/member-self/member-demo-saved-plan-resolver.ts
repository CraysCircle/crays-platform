import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {z} from "zod";
import {memberSelfPorts} from "./member-self-runtime-ports";
import {queryMemberDemoSavedPlan} from "@/db/core-member-demo-saved-plan-runtime";
const id=z.string().min(1).max(180);
const base={contractVersion:z.literal("1.0.0"),idempotencyKey:z.string().min(16).max(100),offerId:id,offerVersion:z.number().int().positive(),expectedPlanVersion:z.number().int().nonnegative()};
export const savedPlanCommandSchema=z.discriminatedUnion("action",[
 z.object({...base,action:z.literal("save"),slotId:id.nullable(),slotVersion:z.number().int().positive().nullable(),slotSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable()}).strict(),
 z.object({...base,action:z.literal("remove")}).strict()
]);
export async function writeNativeMemberSavedPlan(_:unknown,args:{input:{commandJson?:unknown}},context:{request:Request}){
 let input:z.output<typeof savedPlanCommandSchema>;
 try{if(Object.keys(args.input).join(",")!=="commandJson"||typeof args.input.commandJson!=="string"||args.input.commandJson.length>3000)throw Error();input=savedPlanCommandSchema.parse(JSON.parse(args.input.commandJson));}catch{throw new GraphQLError("Please check your saved plan.",{extensions:{code:"BAD_USER_INPUT"}});}
 const sdk=await memberSelfPorts.resolveCurrentSdk(context.request);if(!sdk)throw new GraphQLError("Please sign in.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
 try{
  const out=await queryMemberDemoSavedPlan([sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId).digest("hex"),JSON.stringify(input)]);
  const after=await memberSelfPorts.resolveCurrentSdk(context.request);if(!after||after.subject!==sdk.subject||after.issuer!==sdk.issuer||after.serverConfiguredClientId!==sdk.serverConfiguredClientId||after.expectedAccountId!==sdk.expectedAccountId)throw new GraphQLError("Your account access changed.",{extensions:{code:"FORBIDDEN"}});
  if(out.schema!=="crays.member.saved-plan-command.v1"||out.accountId!==sdk.expectedAccountId||out.offerId!==input.offerId||out.action!==input.action||out.bookingConfirmed!==false||out.testOnly!==true||out.liveMoney!==false)throw Error("SAVED_PLAN_SCOPE_INVALID");
  return {schema:out.schema,payloadJson:JSON.stringify(out)};
 }catch(e){if(e instanceof GraphQLError)throw e;throw new GraphQLError("We couldn’t save that change. Refresh your plans and try again.",{extensions:{code:"SAVED_PLAN_UPDATE_UNCONFIRMED"}});}
}
