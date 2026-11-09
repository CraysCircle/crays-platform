"use client";
type UploadInput={file:File;idempotencyKey:string;title:string;kind:"travel"|"stay"|"membership"|"general";sourceRecordId:string|null;sourceVersion:number|null;sourceRowSha256:string|null};
export async function uploadOwnMemberDocument(input:UploadInput){
 if(input.file.size<8||input.file.size>10485760||!["application/pdf","image/png","image/jpeg"].includes(input.file.type))throw Error("Choose a PDF, PNG or JPEG up to 10 MB.");
 const form=new FormData();form.append("file",input.file);form.append("metadata",JSON.stringify({contractVersion:"1.0.0",idempotencyKey:input.idempotencyKey,title:input.title,kind:input.kind,sourceRecordId:input.sourceRecordId,sourceVersion:input.sourceVersion,sourceRowSha256:input.sourceRowSha256}));
 const response=await fetch("/api/crays/clubs/member/documents/upload",{method:"POST",credentials:"same-origin",body:form,cache:"no-store",redirect:"error"});
 const outcome=await response.json();if(!response.ok||outcome.state!=="ready"||outcome.testOnly!==true||!/^doc_member_[a-f0-9]{32}$/.test(outcome.documentId))throw Error("We couldn’t confirm your file was shared. Refresh before trying again.");
 window.dispatchEvent(new Event("crays-member-documents-updated"));return {documentId:outcome.documentId,version:outcome.version};
}
export function ownMemberDocumentFileUrl(documentId:string,inline=false){if(!/^doc_member_[a-f0-9]{32}$/.test(documentId))throw Error("Document unavailable.");return `/api/crays/clubs/member/documents/${documentId}/file${inline?"?inline=1":""}`;}
