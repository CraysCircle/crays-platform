import {NextRequest,NextResponse} from "next/server";
import {readHotelPreferenceEntry} from "@/lib/clubs/hotel-member-preference-entry";
import {HOTEL_PREFERENCE_COOKIE} from "@/lib/clubs/hotel-member-preference-cookie";
export const dynamic="force-dynamic";
export const runtime="nodejs";
// Untrusted planning preferences only, scoped to the existing local preview.
// This route does not authenticate, reserve inventory or grant account access.
export async function GET(request:NextRequest){
 if(process.env.NODE_ENV!=="development" || process.env.AUTH0_CLUBS_BASE_URL!=="http://127.0.0.1:43172" || (request.headers.get("x-forwarded-host")??request.headers.get("host"))!=="127.0.0.1:43172")return new Response(null,{status:404});
 const values=request.nextUrl.searchParams.getAll("stay_preferences");
 const entry=readHotelPreferenceEntry(values.length===1?values[0]:values);
 if(entry.status!=="valid_preferences_only")return NextResponse.json({status:"invalid_preferences"},{status:400,headers:{"Cache-Control":"no-store"}});
 const response=NextResponse.redirect(new URL("/en/member-preview#bookings", "http://127.0.0.1:43172"),303);
 response.headers.set("Cache-Control","no-store");
 response.cookies.set(HOTEL_PREFERENCE_COOKIE,Buffer.from(JSON.stringify(entry.preferences),"utf8").toString("base64url"),{httpOnly:true,sameSite:"lax",secure:false,path:"/en/member-preview",maxAge:600});
 return response;
}
