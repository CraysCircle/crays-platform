import {executeNativePersonalOriginalReadRequest} from "@/lib/native-personal-messenger";
import {createNativeOriginalReadResponse} from "@/lib/native-auth/native-personal-original-read.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Private original bytes only. No redirects, provider URL or model grant. */
export async function POST(request:Request) {
 try {
  const original=await executeNativePersonalOriginalReadRequest(request);
  return createNativeOriginalReadResponse(original,request.signal);
 }catch(error){
  const code=error instanceof Error && /^(NATIVE_(PERSONAL|AUTHENTICATION)_|PERSONAL_ATTACHMENT_)[A-Z_]+$/.test(error.message)?error.message:"NATIVE_PERSONAL_UNAVAILABLE";
  const status=/AUTHENTICATION/.test(code)?401:/BUSY/.test(code)?429:/TOO_LARGE/.test(code)?413:/CONFLICT|CHANGED/.test(code)?409:/UNAVAILABLE|NOT_CONFIGURED|OUTCOME_UNKNOWN|TIMEOUT/.test(code)?503:/INVALID_INPUT|REQUEST_NOT_ADMITTED|HASH_MISMATCH/.test(code)?400:403;
  return Response.json({errors:[{message:code,extensions:{code}}]},{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",...(status===429?{"Retry-After":"1"}:{})}});
 }
}
