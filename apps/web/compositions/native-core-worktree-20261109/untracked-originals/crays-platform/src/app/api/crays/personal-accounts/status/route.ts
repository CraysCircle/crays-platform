import{NextRequest}from'next/server';
import{personalAccountStatus}from'@/lib/personal-account-route-host';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:NextRequest){return personalAccountStatus(request);}
