import {handleNativeMemberDocumentFile} from "@/lib/clubs/member-native-document-handler";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{documentId:string}>}){const {documentId}=await context.params;return handleNativeMemberDocumentFile(request,documentId);}
