import type {MemberWorkspace,MemberFeed,MemberDocument} from "./clubs-member-home-model";
/** TEST-source documents retain their original source identity; no fake native booking URN. */
export function memberDocumentFeed(workspace:Pick<MemberWorkspace,"support"|"documents"|"demoDocuments">):MemberFeed<{documents:MemberDocument[]}>{
 const existing:MemberFeed<{documents:MemberDocument[]}>=workspace.documents?.kind==="ready"?{kind:"ready",data:{documents:workspace.documents.data.documents.map(d=>({documentId:d.documentId,kind:d.kind,title:d.title,createdAt:d.createdAt,bookingUrn:`urn:crays:clubs:booking:${d.bookingId}`}))}}:workspace.support;
 const owned=workspace.demoDocuments;
 if(owned?.kind==="ready")return {kind:"ready",data:{documents:[...owned.data.documents,...(existing.kind==="ready"?existing.data.documents:[])]}};
 if(existing.kind==="ready"&&existing.data.documents.length)return existing;
 return owned??existing;
}
