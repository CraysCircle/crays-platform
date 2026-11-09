import{NextRequest}from'next/server';
import{personalAccountCallback}from'@/lib/personal-account-route-host';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:NextRequest,context:{params:Promise<{provider:string}>}){const{provider}=await context.params;return personalAccountCallback(request,provider);}
