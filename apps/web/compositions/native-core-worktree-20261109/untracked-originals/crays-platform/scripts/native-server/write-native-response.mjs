import {Readable} from 'node:stream';
import {pipeline,finished} from 'node:stream/promises';
// Transfer only. The owning Core handler has already produced the response.
export async function writeNativeResponse(response,outgoing,signal){
 if(signal.aborted){await response.body?.cancel();signal.throwIfAborted();}
 response.headers.forEach((v,k)=>outgoing.setHeader(k,v));
 outgoing.writeHead(response.status);
 if(response.body)await pipeline(Readable.fromWeb(response.body),outgoing,{signal});
 else{outgoing.end();await finished(outgoing,{signal,cleanup:true});}
}
