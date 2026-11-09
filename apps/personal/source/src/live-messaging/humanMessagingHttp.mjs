import {PRIVATE_FILE_MAX_BYTES} from './privateFileMessage.mjs';
import {validMessageText,MESSAGE_HTTP_MAX_BODY_BYTES} from './messageLimits.mjs';
/** Own host adapter. Deployment must supply original Core session admission and exact conversation ACLs. */
export function createHumanMessagingHttp({origin,readSession,resolveConversation,revalidateSession}){
 if(!origin||typeof readSession!=='function'||typeof resolveConversation!=='function')throw Error('Original session and conversation admission ports required');
 if(revalidateSession!==undefined&&typeof revalidateSession!=='function')throw Error('Current session revalidation required');
 const prefix='/api/crays/personal/messaging';
 const reply=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Cookie'});res.end(JSON.stringify(value));};
 return async function handle(req,res){
  let url;try{url=new URL(req.url,origin);}catch{return false;}
  if(!url.pathname.startsWith(prefix+'/'))return false;
  if(!['/conversation','/history','/send','/send-file','/attachment'].some(path=>url.pathname===prefix+path)){reply(res,404,{status:'not_found'});return true;}
  if(req.headers.origin!==undefined&&req.headers.origin!==origin){reply(res,403,{status:'origin_denied'});return true;}
  if(req.headers['sec-fetch-site']&& !['same-origin','none'].includes(req.headers['sec-fetch-site'])){reply(res,403,{status:'origin_denied'});return true;}
  const history=url.pathname===prefix+'/history',fileSend=url.pathname===prefix+'/send-file',attachmentRead=url.pathname===prefix+'/attachment',send=url.pathname===prefix+'/send'||fileSend,post=send||attachmentRead||history;
  if(req.method!==(post?'POST':'GET')){reply(res,405,{status:'method_not_allowed'});return true;}
  if(post&&req.headers.origin!==origin){reply(res,403,{status:'origin_denied'});return true;}
  try{
   let body;
   if(post){
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')){reply(res,415,{status:'json_required'});return true;}
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>(fileSend?Math.ceil(PRIVATE_FILE_MAX_BYTES/3)*4+40960:MESSAGE_HTTP_MAX_BODY_BYTES)){reply(res,413,{status:'message_too_large'});return true;}chunks.push(chunk);}
    try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{reply(res,400,{status:'invalid_message'});return true;}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!(history?['conversationId','cursor']:attachmentRead?['conversationId','messageId','index','eventIds']:fileSend?['conversationId','requestId','text','replyTo','replyEventIds','file']:['conversationId','requestId','text','replyTo','replyEventIds']).includes(k))){reply(res,400,{status:'invalid_message'});return true;}
   }else{
    if([...url.searchParams.keys()].some(k=>k!=='conversationId')||url.searchParams.getAll('conversationId').length!==1){reply(res,400,{status:'invalid_conversation'});return true;}
    body={conversationId:url.searchParams.get('conversationId')};
   }
   if(typeof body.conversationId!=='string'||!/^[a-zA-Z0-9:._-]{1,200}$/.test(body.conversationId)||['chuck','person:chuck'].includes(body.conversationId)){reply(res,400,{status:'human_conversation_required'});return true;}
   // Canonical host already performs cheap original-SDK authentication before
   // body consumption. Resolve current Core authority only after the bounded
   // request is read, immediately before the actual conversation operation.
   const identity=await readSession(req);
   if(identity?.kind!=='ready'||typeof identity.accountId!=='string'||!identity.accountId){reply(res,401,{status:'sign_in_required'});return true;}
   const admitted=await resolveConversation(identity.accountId,body.conversationId,identity);
   if(revalidateSession)await revalidateSession(identity);
   if(!admitted||admitted.accountId!==identity.accountId||admitted.conversationId!==body.conversationId||!['person','circle','spot'].includes(admitted.kind)||admitted.canRead!==true||!admitted.session?.getSnapshot().available){reply(res,403,{status:'conversation_unavailable'});return true;}
   const originalIds=body.eventIds??body.replyEventIds;
   if(originalIds!==undefined&&(!Array.isArray(originalIds)||originalIds.length<1||originalIds.length>8||originalIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))||new Set(originalIds).size!==originalIds.length)){reply(res,400,{status:'invalid_original'});return true;}
   if(history){
    if(!body.cursor||typeof body.cursor!=='object'||Array.isArray(body.cursor)||JSON.stringify(body.cursor).length>40000||typeof admitted.session.loadOlder!=='function'){reply(res,400,{status:'invalid_history_request'});return true;}
    await admitted.session.loadOlder({cursor:body.cursor});if(revalidateSession)await revalidateSession(identity);
    const conversation=admitted.session.getSnapshot();if(!conversation.available){reply(res,403,{status:'conversation_unavailable'});return true;}
    reply(res,200,{status:'ready',conversation});return true;
   }
   if(attachmentRead){
    if(typeof body.messageId!=='string'||!/^[a-f0-9]{64}$/.test(body.messageId)||!Number.isInteger(body.index)||body.index!==0||typeof admitted.session.loadAttachment!=='function'){reply(res,400,{status:'invalid_attachment'});return true;}
    const data=await admitted.session.loadAttachment({messageId:body.messageId,index:body.index,...(originalIds?{eventIds:originalIds}:{})});
    if(revalidateSession)await revalidateSession(identity);
    if(!admitted.session.getSnapshot().available||!(data instanceof Uint8Array)||data.length<17||data.length>PRIVATE_FILE_MAX_BYTES+16){reply(res,403,{status:'conversation_unavailable'});return true;}
    res.writeHead(200,{'content-type':'application/octet-stream','content-length':String(data.length),'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Cookie'});res.end(Buffer.from(data));return true;
   }
   if(send){
    if(admitted.canSend!==true){reply(res,403,{status:'send_unavailable'});return true;}
    if(typeof body.requestId!=='string'||!body.requestId||body.requestId.length>200||!validMessageText(body.text)||(!fileSend&&!body.text.trim()||fileSend&&body.text.length>4000)||body.replyTo!=null&&(typeof body.replyTo!=='string'||! /^[a-f0-9]{64}$/.test(body.replyTo))){reply(res,400,{status:'invalid_message'});return true;}
    let file;
    if(fileSend){
     const f=body.file;if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).sort().join(',')!=='data,filename,mediaType'||typeof f.filename!=='string'||!f.filename||f.filename.length>255||/[\x00-\x1f\x7f/\\]/.test(f.filename)||typeof f.mediaType!=='string'||f.mediaType.length>100||typeof f.data!=='string'||!f.data||f.data.length>Math.ceil(PRIVATE_FILE_MAX_BYTES/3)*4||f.data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data)){reply(res,400,{status:'invalid_attachment'});return true;}
     const data=Buffer.from(f.data,'base64');if(data.length<1||data.length>PRIVATE_FILE_MAX_BYTES||data.toString('base64')!==f.data){reply(res,400,{status:'invalid_attachment'});return true;}file={data,filename:f.filename,mediaType:f.mediaType};
    }
    let result;try{result=await admitted.session.send({requestId:body.requestId,text:body.text,replyTo:body.replyTo??null,...(originalIds?{replyEventIds:originalIds}:{}),...(file?{file}:{})});}finally{file?.data.fill(0);}

    // Sending is not undone by a subsequently lost connection or account switch. Never auto-resend.
    if(revalidateSession)await revalidateSession(identity);
    if(!admitted.session.getSnapshot().available){reply(res,409,{status:'send_requires_reconciliation'});return true;}
    reply(res,200,{status:'ready',result});return true;
   }
   reply(res,200,{status:'ready',conversation:admitted.session.getSnapshot()});return true;
  }catch(error){if(history&&error?.code==='HISTORY_BOUNDARY_SATURATED'){reply(res,409,{status:'history_boundary_unavailable'});return true;}reply(res,503,{status:send?'send_unconfirmed':'conversation_temporarily_unavailable'});return true;}
 };
}
