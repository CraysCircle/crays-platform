import {memberDemoDocumentsReadSchema,memberDemoDocumentsInputSchema,type MemberDemoDocumentsRead} from "@/lib/clubs/member-demo-document-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";

export async function readMemberDemoDocumentsGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal,documentId:string|null=null):Promise<MemberFeed<MemberDemoDocumentsRead>>{
 try{
  const data=await createMemberGraphQLTransport(registry,fetcher).read("ownDemoDocuments",memberDemoDocumentsInputSchema.parse({contractVersion:"1.0.0",documentId}),memberDemoDocumentsReadSchema,signal);
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  if(documentId!==null&&data.documents.some(document=>document.documentId!==documentId))return {kind:"unavailable"};
  return {kind:"ready",data};
 }catch{if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"unavailable"};}
}
