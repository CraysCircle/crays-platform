import {memberOwnTestStaysSchema,memberOwnTestStaysInputSchema,type OwnTestStays} from "@/lib/clubs/member-test-stays-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";
/** Original persisted TEST source records; source IDs never become native booking IDs. */
export async function readMemberTestStaysGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal,sourceRecordId:string|null=null,scene:"original_screenshot_baseline"|"full_workflow"="full_workflow"):Promise<MemberFeed<OwnTestStays>>{
 try{
  const op=registry.operations.ownTestStays;
  if(!op||op.operationName!=="ClubMemberOwnTestStays"||op.field!=="clubMemberOwnTestStays"||op.kind!=="query"||op.id!=="sha256:231874d5938ce1a304663fb6443fe252a658b89bf969891908ed8824bbd6fc46")return {kind:"unavailable"};
  const input=memberOwnTestStaysInputSchema.parse({sourceRecordId,scene,limit:50});
  const data=await createMemberGraphQLTransport(registry,fetcher).read("ownTestStays",{contractVersion:"1.0.0",...input},memberOwnTestStaysSchema,signal);
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  if(data.scene!==input.scene||data.stays.length>input.limit||data.stays.some(stay=>input.sourceRecordId!==null&&stay.sourceRecordId!==input.sourceRecordId))return {kind:"unavailable"};
  return {kind:"ready",data};
 }catch{if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"unavailable"};}
}
