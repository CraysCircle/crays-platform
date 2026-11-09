import {ownMemberDocumentsSchema,ownMemberDocumentInputSchema,type OwnMemberDocuments} from "@/lib/clubs/member-document-contract";
import {createMemberGraphQLTransport,type MemberOperationRegistry} from "@/lib/clubs/member-graphql-transport";
import type {MemberFeed} from "./clubs-member-home-model";
/** Exact owner APQ only. Metadata cannot authorize file downloads. */
export async function readMemberDocumentsGraphQLFeed(registry:MemberOperationRegistry,fetcher:typeof fetch,signal:AbortSignal,bookingId:string|null=null,documentId:string|null=null):Promise<MemberFeed<OwnMemberDocuments>>{
 try{
  const op=registry.operations.ownDocuments;
  if(!op||op.operationName!=="ClubMemberOwnDocuments"||op.field!=="clubMemberOwnDocuments"||op.kind!=="query"||op.id!=="sha256:a28d8cad6a53bbd640954967af2dee73344d0a2c6ea5b4e18030e456dc72670f")return {kind:"unavailable"};
  const input=ownMemberDocumentInputSchema.parse({bookingId,documentId,limit:50});
  const data=await createMemberGraphQLTransport(registry,fetcher).read("ownDocuments",{contractVersion:"1.0.0",...input},ownMemberDocumentsSchema,signal);
  if(signal.aborted)throw new DOMException("Cancelled","AbortError");
  if(data.documents.some(d=>input.bookingId!==null&&d.bookingId!==input.bookingId||input.documentId!==null&&d.documentId!==input.documentId))return {kind:"unavailable"};
  return {kind:"ready",data};
 }catch{if(signal.aborted)throw new DOMException("Cancelled","AbortError");return {kind:"unavailable"};}
}
