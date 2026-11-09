/** Bounded ZIP envelope validation before original JSZip / ExcelJS. */
import {inflateRawSync} from 'node:zlib';
const fail=()=>{throw new Error('OFFICE_ZIP_REJECTED');};
export function preflightOfficeZip(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<22||bytes.length>5242880)fail();
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50&&i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break;}
 if(end<0||bytes.readUInt16LE(end+4)!==0||bytes.readUInt16LE(end+6)!==0)fail();
 const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);
 if(!count||count>256||bytes.readUInt16LE(end+8)!==count||offset+size!==end)fail();
 let at=offset,total=0;const names=new Set(),ranges=[];
 for(let i=0;i<count;i++){
  if(at+46>end||bytes.readUInt32LE(at)!==0x02014b50)fail();
  const flags=bytes.readUInt16LE(at+8),method=bytes.readUInt16LE(at+10),compressed=bytes.readUInt32LE(at+20),plain=bytes.readUInt32LE(at+24),nl=bytes.readUInt16LE(at+28),xl=bytes.readUInt16LE(at+30),cl=bytes.readUInt16LE(at+32),local=bytes.readUInt32LE(at+42);
  if(flags&~0x0808||![0,8].includes(method)||bytes.readUInt16LE(at+34)!==0||at+46+nl+xl+cl>end||plain>2097152||compressed===0&&plain!==0||plain>Math.max(1024,compressed*200))fail();
  const rawName=bytes.subarray(at+46,at+46+nl),name=new TextDecoder('utf-8',{fatal:true}).decode(rawName);
  if(!name||names.has(name)||/[\\\u0000-\u001f]/u.test(name)||name.startsWith('/')||name.split('/').some(p=>p==='..'||p==='.')||name.includes(':'))fail();names.add(name);
  total+=plain;if(total>8388608)fail();
  if(local+30>offset||bytes.readUInt32LE(local)!==0x04034b50||bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method)fail();
  const lnl=bytes.readUInt16LE(local+26),lxl=bytes.readUInt16LE(local+28),start=local+30+lnl+lxl,stop=start+compressed;
  if(lnl!==nl||!bytes.subarray(local+30,local+30+lnl).equals(rawName)||stop>offset||stop<start)fail();
  if(!(flags&8)&&(bytes.readUInt32LE(local+18)!==compressed||bytes.readUInt32LE(local+22)!==plain||bytes.readUInt32LE(local+14)!==bytes.readUInt32LE(at+16)))fail();
  // Verify actual decompressed length with a hard native zlib output cap before
  // original JSZip sees the archive; central-directory sizes are untrusted.
  const payload=bytes.subarray(start,stop);
  const inflated=method===0?payload:inflateRawSync(payload,{maxOutputLength:Math.min(plain+1,2097153)});
  if(inflated.length!==plain)fail();
  ranges.push([local,stop]);at+=46+nl+xl+cl;
 }
 if(at!==end||!names.has('[Content_Types].xml'))fail();ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])fail();
 if([...names].some(n=>/(?:^|\/)(?:vbaProject\.bin|embeddings|activeX)(?:\/|$)/i.test(n)))fail();
 return {names,totalDeclaredBytes:total};
}
