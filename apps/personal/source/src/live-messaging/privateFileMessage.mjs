/** NIP-17 kind15 individual file messages. File keys belong inside the encrypted
 * rumor only; they are never public Nostr tags, identity keys or blob filenames. */
export const PRIVATE_FILE_MAX_BYTES=5*1024*1024;
const root='http://localhost:8990/api/crays/personal/messaging/blob/';
const blossomRoot='http://127.0.0.1:18994/';
const hex=v=>typeof v==='string'&&/^[a-f0-9]+$/.test(v);
const toHex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=value=>Uint8Array.from(value.match(/../g),v=>parseInt(v,16));
const fail=()=>Error('This private attachment is unavailable');
export const privateFileMime=type=>/^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm)|audio\/(mpeg|ogg|wav|webm)|application\/pdf)$/.test(type)?type:'application/octet-stream';
const filename=value=>typeof value==='string'&&value.length>0&&value.length<=255&&!/[\x00-\x1f\x7f/\\]/.test(value);
const hash=async(bytes,crypto)=>toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
export function parsePrivateFileMessage(rumor){
 if(rumor?.kind!==15||!Array.isArray(rumor.tags))return null;
 const tags=new Map();for(const row of rumor.tags){if(!Array.isArray(row)||row.length<2)throw fail();if(['file-type','encryption-algorithm','decryption-key','decryption-nonce','x','ox','size','name','alt'].includes(row[0])){if(tags.has(row[0]))throw fail();tags.set(row[0],row[1]);}}
 const key=tags.get('decryption-key'),nonce=tags.get('decryption-nonce'),sha256=tags.get('x'),plainSha256=tags.get('ox'),size=tags.get('size'),name=tags.get('name')||'Attachment',type=tags.get('file-type'),caption=tags.get('alt')||'';
 if(tags.get('encryption-algorithm')!=='aes-gcm'||!hex(key)||key.length!==64||!hex(nonce)||nonce.length!==24||!hex(sha256)||sha256.length!==64||!hex(plainSha256)||plainSha256.length!==64||typeof size!=='string'||!/^\d{1,8}$/.test(size)||Number(size)<17||Number(size)>PRIVATE_FILE_MAX_BYTES+16||!filename(name)||typeof type!=='string'||type.length>100||typeof caption!=='string'||caption.length>4000||rumor.content!==root+sha256&&rumor.content!==blossomRoot+sha256+'.bin')throw fail();
 return Object.freeze({filename:name,mediaType:privateFileMime(type),bytes:Number(size)-16,cipherBytes:Number(size),sha256,plainSha256,key,nonce,url:rumor.content,caption});
}
export async function preparePrivateFileMessage({data,filename:name,mediaType,caption='',blossom=false,crypto=globalThis.crypto}){
 if(!(data instanceof Uint8Array)||data.length<1||data.length>PRIVATE_FILE_MAX_BYTES||!filename(name)||typeof caption!=='string'||caption.length>4000)throw fail();
 const secret=crypto.getRandomValues(new Uint8Array(32)),nonce=crypto.getRandomValues(new Uint8Array(12));
 try{const key=await crypto.subtle.importKey('raw',secret,{name:'AES-GCM'},false,['encrypt']),encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,data)),sha256=await hash(encrypted,crypto),plainSha256=await hash(data,crypto);
 return {data:encrypted,content:blossom?blossomRoot+sha256+'.bin':root+sha256,tags:[['file-type',privateFileMime(mediaType)],['encryption-algorithm','aes-gcm'],['decryption-key',toHex(secret)],['decryption-nonce',toHex(nonce)],['x',sha256],['ox',plainSha256],['size',String(encrypted.length)],['name',name],...(caption?[['alt',caption]]:[])]};
 }finally{secret.fill(0);}
}
export async function decryptPrivateFileMessage({data,attachment,crypto=globalThis.crypto}){
 if(!(data instanceof Uint8Array)||data.length!==attachment.cipherBytes||data.length>PRIVATE_FILE_MAX_BYTES+16||await hash(data,crypto)!==attachment.sha256)throw fail();
 const secret=fromHex(attachment.key);try{const key=await crypto.subtle.importKey('raw',secret,{name:'AES-GCM'},false,['decrypt']),plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromHex(attachment.nonce)},key,data));if(plain.length!==attachment.bytes||await hash(plain,crypto)!==attachment.plainSha256){plain.fill(0);throw fail();}return plain;}finally{secret.fill(0);}
}
