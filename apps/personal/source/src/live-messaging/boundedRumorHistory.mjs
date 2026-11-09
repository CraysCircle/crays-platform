const encoder=new TextEncoder();
const HEX=/^[a-f0-9]{64}$/;
const MAX_RECORD_BYTES=256*1024,MAX_PAGE_BYTES=2*1024*1024,DEFAULT_PAGE_BYTES=1024*1024;
const compare=(a,b)=>b.created_at-a.created_at||(a.id<b.id?1:a.id>b.id?-1:0);
const older=(row,cursor)=>!cursor||row.created_at<cursor.created_at||row.created_at===cursor.created_at&&row.id<cursor.id;
const size=row=>encoder.encode(JSON.stringify(row)).byteLength;

/** Bounded read facade over the SDK's existing history backend. Capture,
 * removal, purge, decoding and encrypted custody remain the original providers.
 * Reads scan sequentially; this is not an indexed database or volume claim. */
export function createBoundedRumorHistoryBackend({store,backend,compileFilter,isCurrent,scopeKey,crypto=globalThis.crypto}){
 if(!store?.keys||!store?.getItem||!backend?.addRumor||!backend?.removeRumor||!backend?.clear||typeof compileFilter!=='function'||typeof isCurrent!=='function'||typeof scopeKey!=='string'||!scopeKey||scopeKey.length>2048||!crypto?.subtle)throw Error('Admitted SDK history providers required');
 const check=signal=>{if(signal?.aborted||isCurrent()!==true)throw Error('History query is no longer current');};
 function filter(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw Error('Bounded history filter required');
  const copy=structuredClone(input);if(encoder.encode(JSON.stringify(copy)).byteLength>64*1024)throw Error('History filter too large');
  for(const [key,value] of Object.entries(copy)){
   if(['since','until'].includes(key)){if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid history timestamp');}
   else if(key==='limit'){if(!Number.isInteger(value)||value<0||value>200)throw Error('History page limit must be between0and200');}
   else if(['ids','authors','kinds'].includes(key)||/^[#&][a-zA-Z]$/.test(key)){
    if(!Array.isArray(value)||value.length>200||value.some(item=>key==='kinds'?!Number.isInteger(item)||item<0||item>65535:['ids','authors'].includes(key)?typeof item!=='string'||!HEX.test(item):typeof item!=='string'||item.length>4096))throw Error('Invalid bounded history match list');
   }else throw Error('Unsupported history filter');
  }
  const predicate=compileFilter(copy),empty=Object.entries(copy).some(([key,value])=>Array.isArray(value)&&value.length===0&&(key[0]!=='&'&&key[0]!=='#'||key[0]==='#'&&!copy['&'+key.slice(1)]?.length));
  return{value:copy,limit:copy.limit??50,matches:row=>!empty&&(copy.since===undefined||row.created_at>=copy.since)&&(copy.until===undefined||row.created_at<=copy.until)&&predicate(row)};
 }
 const budget=value=>{if(!Number.isInteger(value)||value<512*1024||value>MAX_PAGE_BYTES)throw Error('Invalid history byte budget');return value-1024;};
 function retain(bucket,row,bytes,maxBytes){
  bucket.rows.push({row,bytes});bucket.rows.sort((a,b)=>compare(a.row,b.row));
  let used=2,keep=0;
  for(const candidate of bucket.rows){if(keep>=bucket.limit||used+candidate.bytes+1>maxBytes)break;used+=candidate.bytes+1;keep++;}
  if(keep<bucket.rows.length)bucket.more=true;bucket.rows.length=keep;
 }
 async function scan(filters,{cursor=null,queryKey,maxBytes=DEFAULT_PAGE_BYTES,signal}={}){
  check(signal);const cap=budget(maxBytes);
  if(cursor!==null&&(!cursor||Object.keys(cursor).sort().join(',')!=='created_at,id,query'||cursor.query!==queryKey||!HEX.test(cursor.id)||!Number.isSafeInteger(cursor.created_at)||cursor.created_at<0))throw Error('Exact original history cursor required');
  const buckets=filters.map(entry=>({...entry,rows:[],more:false}));
  if(!buckets.some(entry=>entry.limit>0))return{buckets,cap};
  const keys=await store.keys();check(signal);if(!Array.isArray(keys)||keys.length>10000||keys.some(key=>typeof key!=='string'||!HEX.test(key)))throw Error('Invalid bounded history keys');
  const seen=new Set();
  for(const key of keys){
   if(seen.has(key))continue;seen.add(key);check(signal);
   const row=await store.getItem(key);check(signal);if(row===null)continue;
   if(row?.id!==key||!Number.isSafeInteger(row.created_at)||row.created_at<0)throw Error('Invalid original history record');
   const bytes=size(row);if(bytes>MAX_RECORD_BYTES)throw Error('History record exceeds decoded byte bound');
   if(!older(row,cursor))continue;
   for(const bucket of buckets)if(bucket.limit>0&&bucket.matches(row))retain(bucket,row,bytes,cap);
  }
  check(signal);return{buckets,cap};
 }
 return Object.freeze({
  addRumor:row=>backend.addRumor(row),removeRumor:id=>backend.removeRumor(id),clear:()=>backend.clear(),
  async queryRumors(input){
   const inputs=Array.isArray(input)?input:[input];if(inputs.length>10)throw Error('Too many history filters');
   const {buckets,cap}=await scan(inputs.map(filter));const unique=new Map();for(const bucket of buckets)for(const entry of bucket.rows)unique.set(entry.row.id,entry);
   const rows=[...unique.values()].sort((a,b)=>compare(a.row,b.row)),result=[];let bytes=2;
   for(const entry of rows){if(result.length>=500||bytes+entry.bytes+1>cap)break;result.push(entry.row);bytes+=entry.bytes+1;}
   check();return result;
  },
  async queryPage({filter:input={},cursor=null,limit=input?.limit??50,maxBytes=DEFAULT_PAGE_BYTES,signal}={}){
   const normalized=filter(input),entry=filter({...normalized.value,limit}),identity=Object.fromEntries(Object.entries(entry.value).filter(([key])=>key!=='limit').sort(([a],[b])=>a<b?-1:a>b?1:0));
   check(signal);const hash=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([scopeKey,identity]))),queryKey=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');check(signal);
   const {buckets}=await scan([entry],{cursor,queryKey,maxBytes,signal}),bucket=buckets[0],messages=bucket.rows.map(value=>value.row),last=messages.at(-1);
   check(signal);return Object.freeze({messages:Object.freeze(messages),hasMore:bucket.more,cursor:bucket.more&&last?Object.freeze({created_at:last.created_at,id:last.id,query:queryKey}):null,byteLength:encoder.encode(JSON.stringify(messages)).byteLength});
  },
 });
}

/** Keep the SDK's capture/subscription interface, replacing only its time-only
 * loader with exact timestamp+ID continuation. No unknown original is skipped. */
export function createPagedSdkGroupHistory({GroupRumorHistory,backend}){
 if(typeof GroupRumorHistory!=='function'||!backend?.queryPage)throw Error('Original SDK history and bounded backend required');
 const history=new GroupRumorHistory(backend);
 history.queryPage=options=>backend.queryPage(options);
 history.createPaginatedLoader=async function*(filter={}){let cursor=null;do{const page=await backend.queryPage({filter,cursor,limit:filter.limit??50});if(page.messages.length)yield [...page.messages];if(!page.hasMore)return;if(!page.cursor)throw Error('History cursor unavailable');cursor=page.cursor;}while(true);};
 return history;
}
