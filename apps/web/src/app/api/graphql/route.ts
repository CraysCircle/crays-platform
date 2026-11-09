import {NextRequest} from "next/server";
import {getAuth0RuntimeConfigStateForRequest} from "@/lib/auth0";
import {selectMemberSelfOperation} from "@/graphql/member-self/member-self-selector";
import {createMemberSelfGraphQLServer} from "@/graphql/member-self/member-self-yoga";
import {getCraysGraphQLRuntimeConfig} from "@/graphql/runtime-config";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"cache-control":"private, no-store","vary":"Cookie"};
async function handle(request:Request){
 if(!getCraysGraphQLRuntimeConfig().enabled)return Response.json({errors:[{message:"GraphQL is unavailable.",extensions:{code:"UNAVAILABLE"}}]},{status:404,headers});
 try{
  const profile=getAuth0RuntimeConfigStateForRequest(new NextRequest(request.url,{headers:request.headers}));
  if(profile.application!=="clubs"||!profile.appBaseUrlConfigured||!profile.baseUrlMatchesRequestOrigin)return Response.json({errors:[{message:"Member configuration is unavailable.",extensions:{code:"UNAVAILABLE"}}]},{status:503,headers});
  // The existing SDK verifies the externally configured host. Next dev's internal URL uses its remote port.
  const host=(request.headers.get("x-forwarded-host")??request.headers.get("host")??new URL(request.url).host).split(",")[0].trim();
  const protocol=(request.headers.get("x-forwarded-proto")??new URL(request.url).protocol.replace(":","")).split(",")[0].trim();
  const trustedOrigin=new URL(`${protocol}://${host}`).origin;
  const selected=await selectMemberSelfOperation(request,trustedOrigin);
  if(profile.application!=="clubs"||selected.kind!=="member")return Response.json({errors:[{message:"This operation is unavailable to a member.",extensions:{code:"FORBIDDEN"}}]},{status:403,headers});
  const response=await createMemberSelfGraphQLServer().fetch(selected.request,{});
  response.headers.set("cache-control","private, no-store");
  const vary=response.headers.get("vary");if(!vary?.split(",").some(v=>v.trim().toLowerCase()==="cookie"))response.headers.set("vary",vary?`${vary}, Cookie`:"Cookie");
  return response;
  }catch(error){
  const invalid=error instanceof Error&&["GRAPHQL_REQUEST_TOO_LARGE","INVALID_MEMBER_OPERATION","INVALID_MEMBER_ORIGIN"].includes(error.message);
  return Response.json({errors:[{message:invalid?"Invalid member request.":"Member details are temporarily unavailable.",extensions:{code:invalid?"BAD_USER_INPUT":"UNAVAILABLE"}}]},{status:invalid?400:503,headers});
 }
}
export const POST=handle;
export const GET=handle;
export const OPTIONS=handle;
