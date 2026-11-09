import "server-only";
import {createHash} from "node:crypto";
import {request as httpRequest} from "node:http";

type Principal = Readonly<{purpose:"member_owned_test_documents";username:string;password:string;origin:string;providerInstanceId:string;virtualHost:"localhost"}>;
type Authority = Readonly<{accountId:string;documentId:string;principalUsername:string;sourceRecordId:string|null;coreReservationSha256:string;testOnly:true}>;
type FileInput = Readonly<{bytes:Uint8Array;mimeType:"application/pdf"|"image/png"|"image/jpeg";contentSha256:string}>;
export type MemberDocumentNativeReadback = Readonly<{documentId:string;providerInstanceId:string;providerObjectReference:string;providerVersionReference:string;contentSha256:string;bytes:number;mimeType:FileInput["mimeType"];providerMimeType:"application/pdf"|"image/png"|"image/jpeg"|"application/octet-stream";testOnly:true;providerReadbackVerified:true}>;
type Fetch = (input:string|URL,init?:RequestInit)=>Promise<Response>;
const MAX_BYTES=10*1024*1024;
/** Preserve the private Nextcloud virtual Host; Node fetch may replace it. No redirect or retry. */
const nativeDocumentFetch:Fetch=(input,init={})=>new Promise((resolve,reject)=>{
 const url=new URL(String(input));
 if(url.protocol!=="http:"||url.username||url.password||url.search||url.hash||!/^172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)){reject(new Error("DOCUMENT_TRANSPORT_TARGET_INVALID"));return;}
 const signal=init.signal;let finished=false;
 const finish=(error:Error|null,response?:Response)=>{if(finished)return;finished=true;signal?.removeEventListener("abort",abort);if(error)reject(error);else resolve(response!);};
 const req=httpRequest(url,{method:init.method??"GET",headers:Object.fromEntries(new Headers(init.headers).entries())},res=>{
  const chunks:Buffer[]=[];let length=0;
  res.on("data",(chunk:Buffer)=>{length+=chunk.length;if(length>MAX_BYTES){req.destroy(new Error("DOCUMENT_TRANSPORT_BODY_TOO_LARGE"));return;}chunks.push(chunk);});
  res.on("error",error=>finish(error));
  res.on("end",()=>{const headers=new Headers();for(const [key,value]of Object.entries(res.headers)){if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(", "):value);}const status=res.statusCode??502;finish(null,new Response(status===204?null:new Uint8Array(Buffer.concat(chunks)).buffer,{status,headers}));});
 });
 const abort=()=>req.destroy(new Error("DOCUMENT_TRANSPORT_ABORTED"));
 req.on("error",error=>finish(error));req.setTimeout(15000,abort);
 if(signal?.aborted){abort();return;}signal?.addEventListener("abort",abort,{once:true});
 if(init.body instanceof ArrayBuffer)req.end(Buffer.from(init.body));else if(init.body==null)req.end();else{req.destroy(new Error("DOCUMENT_TRANSPORT_BODY_INVALID"));}
});

const sha=(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
function guard(principal:Principal,authority:Authority,file?:FileInput){
 const url=new URL(principal.origin);
 const ownedUsername=`crays-member-docs-${createHash("sha256").update(authority.accountId).digest("hex").slice(0,24)}`;
 if(principal.purpose!=="member_owned_test_documents"||principal.virtualHost!=="localhost"||!authority.testOnly||principal.username!==ownedUsername||principal.username!==authority.principalUsername||principal.password.length<32||!/^doc_member_[a-f0-9]{32}$/.test(authority.documentId)||!/^[a-f0-9]{64}$/.test(authority.coreReservationSha256))throw new Error("MEMBER_DOCUMENT_AUTHORITY_INVALID");
 if(url.protocol!=="http:"||url.pathname!=="/"||url.search||url.hash||url.username||url.password||!/^172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}$/.test(url.hostname))throw new Error("MEMBER_DOCUMENT_PROVIDER_NOT_PRIVATE_TEST");
 if(file){
  if(file.bytes.byteLength<8||file.bytes.byteLength>MAX_BYTES||sha(file.bytes)!==file.contentSha256)throw new Error("MEMBER_DOCUMENT_CONTENT_INVALID");
  const bytes=file.bytes;
  const valid=file.mimeType==="application/pdf"?Buffer.from(bytes.slice(0,5)).toString()==="%PDF-":file.mimeType==="image/png"?Buffer.from(bytes.slice(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])):file.mimeType==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:false;
  if(!valid)throw new Error("MEMBER_DOCUMENT_TYPE_INVALID");
 }
}
function target(principal:Principal,authority:Authority){return new URL(`/remote.php/dav/files/${encodeURIComponent(principal.username)}/${authority.documentId}`,principal.origin);}
function headers(principal:Principal){return {Host:principal.virtualHost,Authorization:`Basic ${Buffer.from(`${principal.username}:${principal.password}`).toString("base64")}`};}

/** Invoke only after a Core-owned reservation; this never publishes Member metadata itself. */
export async function createMemberNextcloudDocument(principal:Principal,authority:Authority,file:FileInput,fetcher:Fetch=nativeDocumentFetch):Promise<MemberDocumentNativeReadback>{
 guard(principal,authority,file);
 const url=target(principal,authority);
 let response:Response;
 try{response=await fetcher(url,{method:"PUT",headers:{...headers(principal),"Content-Type":file.mimeType,"If-None-Match":"*"},body:new Uint8Array(file.bytes).buffer,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});}
 catch{throw new Error("MEMBER_DOCUMENT_PROVIDER_OUTCOME_UNKNOWN");}
 if(![201,204,412].includes(response.status))throw new Error("MEMBER_DOCUMENT_PROVIDER_WRITE_REJECTED");
 const observed=await readMemberNextcloudDocument(principal,authority,fetcher);
 if(observed.receipt.contentSha256!==file.contentSha256||observed.receipt.bytes!==file.bytes.byteLength)throw new Error("MEMBER_DOCUMENT_PROVIDER_CONTENT_CONFLICT");
 return {...observed.receipt,mimeType:file.mimeType};
}

/** Original native bytes plus ETag; fresh Core visibility authorization is required before each call. */
export async function readMemberNextcloudDocument(principal:Principal,authority:Authority,fetcher:Fetch=nativeDocumentFetch):Promise<{receipt:MemberDocumentNativeReadback;bytes:Uint8Array}>{
 guard(principal,authority);
 let response:Response;
 try{response=await fetcher(target(principal,authority),{method:"GET",headers:headers(principal),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});}
 catch{throw new Error("MEMBER_DOCUMENT_PROVIDER_READ_UNAVAILABLE");}
 if(response.status!==200)throw new Error("MEMBER_DOCUMENT_PROVIDER_READ_REJECTED");
 const announced=Number(response.headers.get("content-length"));
 if(Number.isFinite(announced)&&announced>MAX_BYTES)throw new Error("MEMBER_DOCUMENT_PROVIDER_FILE_TOO_LARGE");
 if(!response.body)throw new Error("MEMBER_DOCUMENT_PROVIDER_BODY_MISSING");
 const reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const result=await reader.read();if(result.done)break;length+=result.value.byteLength;if(length>MAX_BYTES){await reader.cancel();throw new Error("MEMBER_DOCUMENT_PROVIDER_FILE_TOO_LARGE");}chunks.push(result.value);}}finally{reader.releaseLock();}
 const bytes=Buffer.concat(chunks);const providerMime=response.headers.get("content-type")?.split(";",1)[0];
 if(providerMime!=="application/pdf"&&providerMime!=="image/png"&&providerMime!=="image/jpeg"&&providerMime!=="application/octet-stream")throw new Error("MEMBER_DOCUMENT_PROVIDER_TYPE_INVALID");
 const mime=bytes.subarray(0,5).toString()==="%PDF-"?"application/pdf":bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":bytes[0]===255&&bytes[1]===216&&bytes[2]===255?"image/jpeg":null;
 if(!mime)throw new Error("MEMBER_DOCUMENT_PROVIDER_SIGNATURE_INVALID");
 const etag=response.headers.get("etag");if(!etag||etag.length>180||/[\r\n]/.test(etag))throw new Error("MEMBER_DOCUMENT_PROVIDER_REVISION_MISSING");
 const receipt:MemberDocumentNativeReadback={documentId:authority.documentId,providerInstanceId:principal.providerInstanceId,providerObjectReference:`${principal.username}/${authority.documentId}`,providerVersionReference:etag,contentSha256:sha(bytes),bytes:length,mimeType:mime,providerMimeType:providerMime,testOnly:true,providerReadbackVerified:true};
 return {receipt,bytes};
}
