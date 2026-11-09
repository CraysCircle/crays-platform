import {memberExperienceReadSchema,memberExperienceReadInputSchema,type MemberExperienceRead} from "@/lib/clubs/member-experience-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";
/** Exact current Core own-read contract. Read capability does not authorize cart or checkout. */
export async function readMemberExperiencesGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal,offerId:string|null=null,planId:string|null=null):Promise<MemberFeed<MemberExperienceRead>>{
 try{
  const op=registry.operations.ownExperiences;
  if(!op||op.operationName!=="ClubMemberOwnExperiences"||op.field!=="clubMemberOwnExperiences"||op.kind!=="query"||op.id!=="sha256:e8f05e1b1a383501612fbae6b3e0bb3d1f4765e017154b64f6e7cfe77cd3b297")return {kind:"unavailable"};
  const input=memberExperienceReadInputSchema.parse({offerId,planId,limit:100});
  const data=await createMemberGraphQLTransport(registry,fetcher).read("ownExperiences",{contractVersion:"1.0.0",...input},memberExperienceReadSchema,signal);
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  if(data.catalog.some(o=>input.offerId!==null&&o.offerId!==input.offerId)||data.plans.some(p=>input.planId!==null&&p.planId!==input.planId))return {kind:"unavailable"};
  return {kind:"ready",data};
 }catch{if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"unavailable"};}
}
