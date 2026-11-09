import "server-only";
import type {NextRequest} from "next/server";
import {MAX_BODY,MAX_RESPONSE,validTarget,createEnvelope,verifyResponse} from "./member073-transport-protocol.cjs";

const nativeEndpoint="https://team.craysclub.com/_core/member073/v1/request";
const clubsHosts=new Set(["www.craysclub.com","craysclub.com"]);
async function boundedBody(stream:ReadableStream<Uint8Array>|null,limit:number):Promise<Buffer>{
 if(!stream)return Buffer.alloc(0);
 const reader=stream.getReader(),chunks:Uint8Array[]=[];let length=0;
 try{
  while(true){const value=await reader.read();if(value.done)break;length+=value.value.byteLength;if(length>limit){await reader.cancel();throw new Error("MEMBER073_TRANSPORT_BODY_LIMIT");}chunks.push(value.value);}
 }finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}

/** Only the Club pair and the explicit Member route registry can use this.
 * The native destination still validates the same original Auth0 SDK cookie.
 * No caller principal, SQL, provider credential or arbitrary destination is sent.
 */
export async function forwardMember073NativeRequest(request:NextRequest):Promise<Response|null>{
 if(process.env.CRAYS_MEMBER073_NATIVE_TRANSPORT_ENABLED!=="1")return null;
 const host=request.nextUrl.hostname.toLowerCase();
 if(!clubsHosts.has(host))return null;
 const path=request.nextUrl.pathname+request.nextUrl.search;
 if(!validTarget(request.method,path))return null;
 const replyHeaders={"content-type":"application/json","cache-control":"private, no-store","vary":"Cookie"};
 try{
  if(request.nextUrl.protocol!=="https:"||process.env.CRAYS_MEMBER073_NATIVE_ENDPOINT!==nativeEndpoint)throw new Error("MEMBER073_TRANSPORT_TARGET_INVALID");
  const secret=process.env.CRAYS_MEMBER073_NATIVE_TRANSPORT_KEY;
  if(!secret||!/^[a-f0-9]{64}$/.test(secret))throw new Error("MEMBER073_TRANSPORT_KEY_INVALID");
  const declared=request.headers.get("content-length");
  if(declared!==null&&(!/^[0-9]+$/.test(declared)||Number(declared)>MAX_BODY))throw new Error("MEMBER073_TRANSPORT_BODY_LIMIT");
  const headers:Record<string,string>={};
  for(const name of ["cookie","content-type","accept","origin","sec-fetch-site","idempotency-key","range","if-none-match"]){const value=request.headers.get(name);if(value!==null)headers[name]=value;}
  const body=await boundedBody(request.body,MAX_BODY),key=Buffer.from(secret,"hex");
  const encoded=createEnvelope({key,origin:request.nextUrl.origin,method:request.method,path,headers,body});
  const response=await fetch(nativeEndpoint,{method:"POST",headers:{"content-type":"application/octet-stream","accept-encoding":"identity","x-crays-member073-metadata":encoded.metadata,"x-crays-member073-signature":encoded.signature},body:new Uint8Array(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(42000)});
  if(response.status!==200)throw new Error("MEMBER073_TRANSPORT_UNAVAILABLE");
  const payload=await boundedBody(response.body,MAX_RESPONSE);
  const verified=verifyResponse({key,requestMetadata:encoded.metadata,metadata:response.headers.get("x-crays-member073-metadata"),signature:response.headers.get("x-crays-member073-signature"),body:payload});
  const outgoing=new Headers();
  for(const[name,value]of Object.entries(verified.headers))for(const v of Array.isArray(value)?value:[value])outgoing.append(name,v);
  outgoing.set("cache-control","private, no-store");outgoing.set("vary","Cookie");
  return new Response([204,205,304].includes(verified.status)?null:new Uint8Array(payload),{status:verified.status,headers:outgoing});
 }catch{
  // Never retry a native mutation: an interrupted result can be outcome-unknown.
  return Response.json({errors:[{message:"Member details are temporarily unavailable.",extensions:{code:"UNAVAILABLE"}}]},{status:503,headers:replyHeaders});
 }
}
