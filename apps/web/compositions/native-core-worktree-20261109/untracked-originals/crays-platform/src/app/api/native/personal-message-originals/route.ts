import {executeNativePersonalOriginalsRequest} from "@/lib/native-personal-messenger";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"};
/** Binary transport into original Core. GraphQL metadata/read contracts remain
 * unchanged. No public object URL, file name/path or model effect is returned.
 */
export async function POST(request:Request) {
 try {
  const result=await executeNativePersonalOriginalsRequest(request);
  if(!result||!("receiptId" in result))throw Error("NATIVE_PERSONAL_OUTCOME_UNKNOWN");
  return Response.json({data:{receiveScopedAgentMessageWithOriginals:result}},{headers});
 } catch(error) {
  const code=error instanceof Error && /^(NATIVE_(PERSONAL|AUTHENTICATION)_|PERSONAL_ATTACHMENT_)[A-Z_]+$/.test(error.message)?error.message:"NATIVE_PERSONAL_UNAVAILABLE";
  const status=/AUTHENTICATION/.test(code)?401:/BUSY/.test(code)?429:/TOO_LARGE/.test(code)?413:/CONFLICT|CHANGED/.test(code)?409:/UNAVAILABLE|NOT_CONFIGURED|OUTCOME_UNKNOWN|TIMEOUT/.test(code)?503:/INVALID_INPUT|REQUEST_NOT_ADMITTED|HASH_MISMATCH/.test(code)?400:403;
  return Response.json({errors:[{message:code,extensions:{code}}]},{status,headers:{...headers,...(status===429?{"Retry-After":"1"}:{})}});
 }
}
