import {ownMemberConversationsSchema,ownMemberConversationInputSchema,type OwnMemberConversations} from '@/lib/clubs/member-conversation-contract';
import {createMemberGraphQLTransport,type MemberOperationRegistry} from '@/lib/clubs/member-graphql-transport';
import type {MemberFeed} from './clubs-member-home-model';
/** Prepared for the exact owner document. Missing active registration returns unavailable without making a request. */
export async function readMemberConversationsGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal,caseId:string|null=null):Promise<MemberFeed<OwnMemberConversations>>{
 try{
  const operation=registry.operations.ownConversations;
  if(!operation||operation.operationName!=='ClubMemberOwnConversations'||operation.field!=='clubMemberOwnConversations'||operation.kind!=='query'||operation.id!=='sha256:f6d942e31749e49c0683305e32567e52eaa3e33ed020a907abc077e284d3c7ab')return {kind:'unavailable'};
  const input=ownMemberConversationInputSchema.parse({caseId,limit:50});
  const data=await createMemberGraphQLTransport(registry,fetcher).read('ownConversations',{contractVersion:'1.0.0',...input},ownMemberConversationsSchema,signal);
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  if(input.caseId!==null&&data.cases.some(c=>c.caseId!==input.caseId))return {kind:'unavailable'};
  return {kind:'ready',data};
 }catch{
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  return {kind:'unavailable'};
 }
}
