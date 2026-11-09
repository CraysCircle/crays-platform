import{NextRequest}from'next/server';
import{personalAccountConnect}from'@/lib/personal-account-route-host';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:NextRequest){return personalAccountConnect(request);}
