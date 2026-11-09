import "server-only";
import {createHash} from "node:crypto";
import {GraphQLError} from "graphql";
import {z} from "zod";
import {memberOwnTestStaysSchema} from "@/lib/clubs/member-test-stays-contract";
import type {MemberOwnStatePorts} from "./member-own-state-client";
import {MEMBER_TEST_STAYS_SQL} from "@/db/core-member-test-stays-runtime";
const inputSchema=z.object({contractVersion:z.literal("1.0.0"),sourceRecordId:z.string().regex(/^map_member_test_stay_[a-f0-9]{32}$/).nullable().optional(),scene:z.enum(["original_screenshot_baseline","full_workflow"]),limit:z.number().int().min(1).max(50)}).strict();
type TestStaysPorts<Request>=Pick<MemberOwnStatePorts<Request>,"resolveCurrentSdk"> & Readonly<{
 query:(text:string,values:readonly(string|number|null)[])=>Promise<{rows:unknown[]}>;
}>;
export function createNativeMemberOwnTestStaysResolver<Request>(ports:TestStaysPorts<Request>){
 return async(_parent:unknown,args:{input:unknown},context:{request:Request})=>{
  let input:z.output<typeof inputSchema>;
  try{input=inputSchema.parse(args.input);}catch{throw new GraphQLError("Invalid member request.",{extensions:{code:"BAD_USER_INPUT"}});}
  try{
   const sdk=await ports.resolveCurrentSdk(context.request);
   if(!sdk)throw new GraphQLError("Member identity connection is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
   const r=await ports.query(MEMBER_TEST_STAYS_SQL,[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId,"utf8").digest("hex"),input.sourceRecordId??null,input.scene,input.limit]);
   if(r.rows.length!==1||!r.rows[0]||typeof r.rows[0]!=="object"||Array.isArray(r.rows[0])||Object.keys(r.rows[0]).join(",")!=="payload")throw Error("MEMBER_TEST_STAYS_ENVELOPE_INVALID");
   const payload=(r.rows[0] as {payload:unknown}).payload;
   if(payload===null)throw new GraphQLError("Member identity connection is required.",{extensions:{code:"IDENTITY_BINDING_REQUIRED"}});
   const state=memberOwnTestStaysSchema.parse(payload);
   if(state.accountId!==sdk.expectedAccountId||state.scene!==input.scene||state.stays.length>input.limit||input.sourceRecordId&&state.stays.some(s=>s.sourceRecordId!==input.sourceRecordId))throw Error("MEMBER_TEST_STAYS_SCOPE_INVALID");
   return state;
  }catch(e){if(e instanceof GraphQLError)throw e;throw new GraphQLError("Your stays are temporarily unavailable.",{extensions:{code:"UNAVAILABLE"}});}
 };
}
