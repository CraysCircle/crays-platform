import {readCoreOriginalMemberIdentityAndOwnState} from "@/db/core-original-member-combined-reader";
import "server-only";
import {createHash} from "node:crypto";
import {NextRequest} from "next/server";
import {z} from "zod";
import {GraphQLError} from "graphql";
import {getAuth0RuntimeConfigStateForRequest,getExactOidcServerSessionRead} from "@/lib/auth0";
import {getCoreOriginalMemberIdentityRpcPool} from "@/db/core-identity-runtime-pool";
import {createCoreOriginalMemberIdentityRuntimeRpcClient} from "@/db/core-identity-runtime-rpc";
import type {MemberOwnStatePorts} from "./member-own-state-client";
const accountSchema=z.object({account_id:z.string().min(1).max(180),status:z.literal("active")}).passthrough();
const admittedBundle=z.object({schema_version:z.literal("crays.core.identity-bundle.v1"),account:accountSchema}).passthrough();
export const memberSelfPorts:MemberOwnStatePorts<Request>={
 resolveCurrentSdk:async(request)=>{
  const nextRequest=new NextRequest(request.url,{headers:request.headers});
  const cfg=getAuth0RuntimeConfigStateForRequest(nextRequest);
  if(cfg.application!=="clubs")throw new GraphQLError("Member purpose is required.",{extensions:{code:"FORBIDDEN"}});
  if(!cfg.appBaseUrlConfigured||!cfg.baseUrlMatchesRequestOrigin||!cfg.domainConfigured||!cfg.clientIdConfigured||!cfg.clientSecretConfigured||!cfg.secretConfigured)throw new GraphQLError("Member configuration is unavailable.",{extensions:{code:"UNAVAILABLE"}});
  const sdk=await getExactOidcServerSessionRead(nextRequest);
  if(!sdk||sdk.status==="signed_out")throw new GraphQLError("Member sign-in is required.",{extensions:{code:"UNAUTHENTICATED"}});
  if(sdk.status!=="ready"||!/^google-oauth2\|\S+$/.test(sdk.validatedSubject))throw new GraphQLError("Original member identity is required.",{extensions:{code:"FORBIDDEN"}});
  const core=await createCoreOriginalMemberIdentityRuntimeRpcClient((sql,values)=>getCoreOriginalMemberIdentityRpcPool().query(sql,values)).resolveAuth0IdentityBundleV2(sdk.validatedIssuer,sdk.validatedSubject,sdk.serverConfiguredClientId);
  if(core===null)return null;
  const expectedAccountId=core.account.account_id;
  if(typeof expectedAccountId!=="string"||!expectedAccountId.trim())return null;
  return {issuer:sdk.validatedIssuer,subject:sdk.validatedSubject,serverConfiguredClientId:sdk.serverConfiguredClientId,expectedAccountId,sessionReady:true};
 },
 query:async(sql,values)=>{const result=await getCoreOriginalMemberIdentityRpcPool().query(sql,[...values]);return {rows:result.rows};}
};

/** Isolated own-state operation only; retains every existing SDK/configuration
 * gate and derives identity and state together, without a separate V2 query. */
export async function readCurrentOriginalMemberStateCombined(request:Request){
 const nextRequest=new NextRequest(request.url,{headers:request.headers});
 const cfg=getAuth0RuntimeConfigStateForRequest(nextRequest);
 if(cfg.application!=="clubs")throw new GraphQLError("Member purpose is required.",{extensions:{code:"FORBIDDEN"}});
 if(!cfg.appBaseUrlConfigured||!cfg.baseUrlMatchesRequestOrigin||!cfg.domainConfigured||!cfg.clientIdConfigured||!cfg.clientSecretConfigured||!cfg.secretConfigured)throw new GraphQLError("Member configuration is unavailable.",{extensions:{code:"UNAVAILABLE"}});
 const sdk=await getExactOidcServerSessionRead(nextRequest);
 if(!sdk||sdk.status==="signed_out")throw new GraphQLError("Member sign-in is required.",{extensions:{code:"UNAUTHENTICATED"}});
 if(sdk.status!=="ready"||!/^google-oauth2\|\S+$/.test(sdk.validatedSubject))throw new GraphQLError("Original member identity is required.",{extensions:{code:"FORBIDDEN"}});
 const result=await readCoreOriginalMemberIdentityAndOwnState({issuer:sdk.validatedIssuer,subject:sdk.validatedSubject,serverConfiguredClientId:sdk.serverConfiguredClientId});
 return result?.state??null;
}
