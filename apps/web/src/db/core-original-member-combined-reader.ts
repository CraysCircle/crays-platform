import "server-only";
import {createHash} from "node:crypto";
import {z} from "zod";
import {getCoreOriginalMemberIdentityRpcPool,ORIGINAL_MEMBER_COMBINED_READ_SQL} from "./core-identity-runtime-pool";
import {parseAuth0IdentityBundleRpcV2} from "./core-identity-runtime-rpc";
import {memberOwnStateSchema} from "../lib/clubs/member-own-state-contract";

const sdkIdentity=z.object({issuer:z.string().regex(/^https:\/\/[a-z0-9][a-z0-9.-]*\/$/).max(512),subject:z.string().regex(/^google-oauth2\|\S+$/).max(512),serverConfiguredClientId:z.string().min(1).max(512)}).strict();
const rowSchema=z.object({identity_payload:z.unknown(),own_state_payload:z.unknown()}).strict();
/** Caller must pass the genuine existing ready server SDK identity, after the
 * existing application/configuration/provenance gates. This is never a browser
 * principal adapter. No DTO/identity cache; the pool verifies actual roles and
 * both installed function definitions before AND after the single statement. */
export async function readCoreOriginalMemberIdentityAndOwnState(input:z.input<typeof sdkIdentity>){
 const sdk=sdkIdentity.parse(input);if(sdk.issuer.includes(".."))throw new Error("MEMBER_INVALID_ISSUER");
 const result=await getCoreOriginalMemberIdentityRpcPool().query(ORIGINAL_MEMBER_COMBINED_READ_SQL,[sdk.issuer,sdk.subject,createHash("sha256").update(sdk.serverConfiguredClientId,"utf8").digest("hex")]);
 if(result.rowCount!==1||result.rows.length!==1)throw new Error("MEMBER_INVALID_RPC_ROWS");
 const row=rowSchema.parse(result.rows[0]);
 const bundle=parseAuth0IdentityBundleRpcV2(row.identity_payload,sdk.issuer,sdk.subject,sdk.serverConfiguredClientId);
 if(bundle===null||row.own_state_payload===null){
  if(bundle===null&&row.own_state_payload!==null)throw new Error("MEMBER_ORIGINAL_IDENTITY_STATE_MISMATCH");
  return null;
 }
 const state=memberOwnStateSchema.parse(row.own_state_payload);
 if(state.accountId!==bundle.account.account_id)throw new Error("MEMBER_ORIGINAL_ACCOUNT_MISMATCH");
 return {bundle,state};
}
