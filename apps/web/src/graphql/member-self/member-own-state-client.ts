import {z} from "zod";
import {createHash} from "node:crypto";
const id=z.string().min(1).max(180),time=z.iso.datetime({offset:true});
const application=z.object({applicationId:id,status:z.enum(["submitted","under_review","approved","declined","withdrawn"]),interestPropertyId:id.nullable(),version:z.number().int().positive(),submittedAt:time,updatedAt:time}).strict();
const membership=z.object({membershipId:id,status:z.enum(["confirmed","suspended","revoked","expired"]),membershipTypeId:id.nullable(),membershipTypeMappingReady:z.boolean(),version:z.number().int().positive(),validFrom:time,validUntil:time.nullable(),decisionAuthority:z.literal("CRAYS_TEAM")}).strict().superRefine((m,c)=>{if(m.membershipTypeMappingReady!==(m.membershipTypeId!==null))c.addIssue({code:"custom",message:"Membership type requires exact mapping"});});
export const memberOwnStateSchema=z.object({schema:z.literal("crays.clubs.member-own-state-rpc.v1"),accountId:id,savedPropertyIds:z.array(id).max(1000),application:application.nullable(),membership:membership.nullable(),authorities:z.object({authenticationReady:z.literal(true),membershipConfirmed:z.boolean(),marinaPropertyAdmission:z.literal(false),availabilityAuthority:z.literal(false),bookingAuthority:z.literal(false)}).strict()}).strict().superRefine((v,c)=>{if(v.authorities.membershipConfirmed&&(v.membership?.status!=="confirmed"||v.application?.status!=="approved"))c.addIssue({code:"custom",message:"Confirmed membership requires original decision"});});
export type MemberOwnState=z.output<typeof memberOwnStateSchema>;
export type MemberOwnStatePorts<Request>=Readonly<{
 /** Existing original server SDK; no browser-provided issuer/subject/account claims. */
 resolveCurrentSdk(request:Request):Promise<{issuer:string;subject:string;serverConfiguredClientId:string;expectedAccountId:string;sessionReady:true}|null>;
 /** Exact restricted runtime pool only, no legacy database fallback. */
 query(sql:string,values:readonly string[]):Promise<{rows:unknown[]}>;
}>;
export async function readOwnMemberState<Request>(request:Request,ports:MemberOwnStatePorts<Request>):Promise<MemberOwnState|null>{
 const principal=await ports.resolveCurrentSdk(request);if(principal===null)return null;
 const p=z.object({issuer:z.string().regex(/^https:\/\/[a-z0-9][a-z0-9.-]*\/$/).max(512),subject:z.string().regex(/^google-oauth2\|\S+$/).max(512),serverConfiguredClientId:z.string().min(1).max(512),expectedAccountId:id,sessionReady:z.literal(true)}).strict().parse(principal);
 if(p.issuer.includes(".."))throw new Error("MEMBER_INVALID_ISSUER");
 const result=await ports.query("select crays_core_rpc.read_own_clubs_member_state_v1($1::text,$2::text,$3::text) as payload",[p.issuer,p.subject,createHash("sha256").update(p.serverConfiguredClientId,"utf8").digest("hex")]);
 if(result.rows.length!==1)throw new Error("MEMBER_INVALID_RPC_ROWS");
 const row=z.object({payload:z.unknown()}).strict().parse(result.rows[0]);if(row.payload===null)return null;
 const state=memberOwnStateSchema.parse(row.payload);if(state.accountId!==p.expectedAccountId)throw new Error("MEMBER_ORIGINAL_ACCOUNT_MISMATCH");
 return state;
}
