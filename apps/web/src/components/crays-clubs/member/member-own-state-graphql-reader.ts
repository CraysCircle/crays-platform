import {memberOwnStateSchema} from "@/lib/clubs/member-own-state-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberWorkspace} from "./clubs-member-home-model";

type OwnFeeds=Pick<MemberWorkspace,"membership"|"savedProperties">;
/** Core's actual own-state document returns the strict DTO directly, without a REST status wrapper. */
export async function readMemberOwnStateGraphQLFeeds(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal):Promise<OwnFeeds>{
 try{
  const port=createMemberGraphQLTransport(registry,fetcher);
  const state=await port.read("ownState",{contractVersion:"1.0.0"},memberOwnStateSchema,signal);
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  return {
   membership:{kind:"ready",data:{
    membership:state.membership?{status:state.membership.status,validUntil:state.membership.validUntil}:null,
    application:state.application?{status:state.application.status}:null,
    authorities:{membershipConfirmed:state.authorities.membershipConfirmed},
   }},
   savedProperties:{kind:"ready",data:{savedPropertyIds:state.savedPropertyIds}},
  };
 }catch{
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  return {membership:{kind:"unavailable"},savedProperties:{kind:"unavailable"}};
 }
}
