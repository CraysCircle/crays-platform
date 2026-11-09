import {handleNativeMemberDocumentUpload} from "@/lib/clubs/member-native-document-handler";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){return handleNativeMemberDocumentUpload(request);}
