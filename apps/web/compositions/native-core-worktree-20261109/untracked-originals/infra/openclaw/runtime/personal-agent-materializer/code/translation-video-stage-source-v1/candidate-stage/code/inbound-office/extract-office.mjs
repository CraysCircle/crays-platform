import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const OFFICE_MIMES=Object.freeze({
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx'
});
const worker=fileURLToPath(new URL('./office-worker.mjs',import.meta.url));
const fail=code=>{throw new Error(code);};
/** Only already-admitted bytes enter. No file/URL/account/person/path factory. */
export async function extractInboundOffice({buffer,mimeType,maxChars,assertCurrent}){
 if(assertCurrent!==undefined&&typeof assertCurrent!=='function')fail('OFFICE_INVALID_GUARD');
 const current=()=>assertCurrent?.();current();
 if(!Buffer.isBuffer(buffer)||buffer.length>5242880||!Object.hasOwn(OFFICE_MIMES,mimeType)||!Number.isSafeInteger(maxChars)||maxChars<1)fail('OFFICE_INPUT_REJECTED');
 const hash=()=>createHash('sha256').update(buffer).digest('hex'),before=hash();
 const input=Buffer.from(JSON.stringify({bytesBase64:buffer.toString('base64'),format:OFFICE_MIMES[mimeType],maxChars:Math.min(maxChars,60000)}));
 const raw=await new Promise((resolve,reject)=>{
  let failure,closed=false,size=0,stderrSize=0;const chunks=[];
  const child=spawn(process.execPath,['--max-old-space-size=192',worker],{shell:false,cwd:'/',stdio:['pipe','pipe','pipe'],env:{LANG:'C.UTF-8',TZ:'UTC',UV_THREADPOOL_SIZE:'1'}});
  const stop=code=>{failure??=code;if(!closed)child.kill('SIGKILL');};
  const timer=setTimeout(()=>stop('OFFICE_WORKER_TIMEOUT'),20000);timer.unref();
  const lifecycle=setInterval(()=>{try{current();}catch{stop('OFFICE_INVOCATION_REVOKED');}},100);lifecycle.unref();
  child.on('error',()=>{failure??='OFFICE_WORKER_START_FAILED';});child.stdin.on('error',()=>{failure??='OFFICE_WORKER_INPUT_FAILED';});
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>524288)stop('OFFICE_OUTPUT_LIMIT');else chunks.push(chunk);});
  child.stderr.on('data',chunk=>{stderrSize+=chunk.length;if(stderrSize>16384)stop('OFFICE_ERROR_LIMIT');});
  child.on('close',(code,signal)=>{closed=true;clearTimeout(timer);clearInterval(lifecycle);if(failure||code!==0||signal)reject(new Error(failure??'OFFICE_PARSE_REJECTED'));else resolve(Buffer.concat(chunks,size));});
  child.stdin.end(input);
 });
 current();if(hash()!==before)fail('OFFICE_INPUT_CHANGED');
 const result=JSON.parse(raw.toString('utf8'));
 if(result===null||typeof result!=='object'||Object.keys(result).sort().join(',')!=='externalLinksFollowed,formulasEvaluated,images,metadata,text'||typeof result.text!=='string'||result.text.length>Math.min(maxChars,60000)||!Array.isArray(result.images)||result.images.length||result.formulasEvaluated!==false||result.externalLinksFollowed!==false||!result.metadata||Object.keys(result.metadata).sort().join(',')!=='imagesTruncated,textTruncated'||typeof result.metadata.textTruncated!=='boolean'||result.metadata.imagesTruncated!==false)fail('OFFICE_WORKER_INVALID_OUTPUT');
 current();return {text:result.text,images:[],metadata:result.metadata};
}
