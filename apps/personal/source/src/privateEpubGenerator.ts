/** Deterministic escaped-text EPUB 3 with explicitly selected local PNG/JPEG resources. No remote resource, HTML, script or provider fetch. */
const encoder=new TextEncoder();
const bytes=(s:string)=>encoder.encode(s);
const constants=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
const rotate=(v:number,n:number)=>(v>>>n)|(v<<(32-n));
export function sha256Hex(input:string|Uint8Array):string {
 const source=typeof input==='string'?bytes(input):input,length=Math.ceil((source.length+9)/64)*64,data=new Uint8Array(length);data.set(source);data[source.length]=128;
 const view=new DataView(data.buffer);view.setUint32(length-8,Math.floor(source.length/0x20000000));view.setUint32(length-4,(source.length*8)>>>0);
 const hash=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64);
 for(let offset=0;offset<length;offset+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,h]=hash;for(let i=0;i<64;i++){const t1=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+constants[i]+w[i])>>>0,t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,h].forEach((v,i)=>hash[i]=(hash[i]+v)>>>0);
 }return hash.map(v=>v.toString(16).padStart(8,'0')).join('');
}
export function crc32(data:Uint8Array){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function escapeEpubXml(value:string){
 for(const char of value){const cp=char.codePointAt(0)!;if(!(cp===9||cp===10||cp===13||cp>=32&&cp<=0xd7ff||cp>=0xe000&&cp<=0xfffd||cp>=0x10000&&cp<=0x10ffff))throw Error('This text contains characters unsupported by XML. Correct them before export.');}
 return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
type Entry={name:string;data:Uint8Array};
function join(parts:Uint8Array[]){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
function header(size:number){const data=new Uint8Array(size);return {data,v:new DataView(data.buffer)};}
export function zipStore(entries:Entry[]):Uint8Array {
 if(!entries.length||entries.length>200||new Set(entries.map(e=>e.name)).size!==entries.length)throw Error('Review the unique EPUB file manifest.');
 const locals:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
 for(const entry of entries){if(!/^[A-Za-z0-9_./-]+$/.test(entry.name)||entry.name.includes('..')||entry.name.startsWith('/'))throw Error('Unsafe EPUB resource path.');
  const name=bytes(entry.name),crc=crc32(entry.data),l=header(30);l.v.setUint32(0,0x04034b50,true);l.v.setUint16(4,20,true);l.v.setUint16(6,0x800,true);l.v.setUint16(12,0x21,true);l.v.setUint32(14,crc,true);l.v.setUint32(18,entry.data.length,true);l.v.setUint32(22,entry.data.length,true);l.v.setUint16(26,name.length,true);locals.push(l.data,name,entry.data);
  const c=header(46);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x800,true);c.v.setUint16(14,0x21,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,entry.data.length,true);c.v.setUint32(24,entry.data.length,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,offset,true);central.push(c.data,name);offset+=30+name.length+entry.data.length;
 }
 const directory=join(central),end=header(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,entries.length,true);end.v.setUint16(10,entries.length,true);end.v.setUint32(12,directory.length,true);end.v.setUint32(16,offset,true);return join([...locals,directory,end.data]);
}
export type EpubTextChapter={title:string;text:string;sourceId:string;sourceRevision:string};
export type EpubImageResource={id:string;mime:'image/png'|'image/jpeg';bytes:Uint8Array;alt:string};
export type EpubTextInput={id:string;title:string;creator:string;language:string;modifiedAt:number;chapters:EpubTextChapter[];resources?:EpubImageResource[]};
export function createPrivateEpub(input:EpubTextInput){
 if(!input.id||input.id.length>160||!input.title.trim()||input.title.length>200||!input.creator.trim()||input.creator.length>160||!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(input.language)||!Number.isFinite(input.modifiedAt)||!input.chapters.length||input.chapters.length>100)throw Error('Review EPUB title, creator, language and one to 100 selected chapters.');
 const resources=input.resources||[];if(resources.length>6||new Set(resources.map(r=>r.id)).size!==resources.length||resources.some(r=>!r.id||!['image/png','image/jpeg'].includes(r.mime)||r.bytes.length>2*1024*1024||!r.bytes.length||!r.alt.trim()||r.alt.length>300))throw Error('Review up to six unique permitted image resources and descriptions.');
 const images=resources.map((r,i)=>{inspectEpubImage(r.bytes,r.mime);return {...r,href:`resources/image-${i+1}.${r.mime==='image/png'?'png':'jpg'}`,manifestId:`image-${i+1}`};});
 const x=escapeEpubXml,modified=new Date(input.modifiedAt).toISOString().replace(/\.\d{3}Z$/,'Z');
 const chapters=input.chapters.map((chapter,i)=>{if(!chapter.title.trim()||chapter.title.length>200||!chapter.text.trim()||chapter.text.length>200000||!chapter.sourceId||!/^[a-f0-9]{64}$/.test(chapter.sourceRevision))throw Error('Review each selected text chapter and its exact source revision.');return {chapter,i,id:`chapter-${i+1}`,href:`text/chapter-${i+1}.xhtml`};});
 if(chapters.reduce((n,c)=>n+bytes(c.chapter.text).length,0)>2000000)throw Error('This private text export is limited to 2 MB. Select fewer chapters.');
 const entries:Entry[]=[{name:'mimetype',data:bytes('application/epub+zip')},{name:'META-INF/container.xml',data:bytes('<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')},
  {name:'EPUB/package.opf',data:bytes(`<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${x(input.language)}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">urn:crays:private-epub:${x(input.id)}</dc:identifier><dc:title>${x(input.title)}</dc:title><dc:creator>${x(input.creator)}</dc:creator><dc:language>${x(input.language)}</dc:language><meta property="dcterms:modified">${modified}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${chapters.map(c=>`<item id="${c.id}" href="${c.href}" media-type="application/xhtml+xml"/>`).join('')}${images.map(r=>`<item id="${r.manifestId}" href="${r.href}" media-type="${r.mime}"/>`).join('')}</manifest><spine>${chapters.map(c=>`<itemref idref="${c.id}"/>`).join('')}</spine></package>`)},
  {name:'EPUB/nav.xhtml',data:bytes(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${x(input.language)}"><head><title>${x(input.title)} · Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${chapters.map(c=>`<li><a href="${c.href}">${x(c.chapter.title)}</a></li>`).join('')}</ol></nav></body></html>`)}];
 for(const c of chapters)entries.push({name:`EPUB/${c.href}`,data:bytes(`<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${x(input.language)}"><head><title>${x(c.chapter.title)}</title></head><body><h1>${x(c.chapter.title)}</h1>${c.chapter.text.split(/\r?\n\s*\r?\n/).map(p=>`<p>${x(p)}</p>`).join('')}${c.i===0?images.map(r=>`<figure><img src="../${r.href}" alt="${x(r.alt)}"/><figcaption>${x(r.alt)}</figcaption></figure>`).join(''):''}<p>Source reference: ${x(c.chapter.sourceId)} · revision ${x(c.chapter.sourceRevision)}</p></body></html>`)});
 for(const r of images)entries.push({name:`EPUB/${r.href}`,data:r.bytes});
 const data=zipStore(entries);inspectPrivateEpubArchive(data);return {bytes:data,sha256:sha256Hex(data),size:data.length,files:entries.map(e=>({path:e.name,size:e.data.length,crc32:crc32(e.data)})),mediaType:'application/epub+zip' as const};
}
/** Local structural integrity check only; this is not an external EPUBCheck conformance result. */
export function inspectPrivateEpubArchive(data:Uint8Array){
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),decoder=new TextDecoder('utf-8',{fatal:true});
 const require=(ok:boolean)=>{if(!ok)throw Error('The generated private EPUB failed its local archive integrity check.');};
 require(data.length>=22);const end=data.length-22;require(view.getUint32(end,true)===0x06054b50&&view.getUint16(end+20,true)===0&&view.getUint16(end+4,true)===0&&view.getUint16(end+6,true)===0);
 const count=view.getUint16(end+10,true),centralOffset=view.getUint32(end+16,true);require(count>=5&&count<=110&&view.getUint16(end+8,true)===count&&centralOffset+view.getUint32(end+12,true)===end);
 const records:{path:string;size:number;crc32:number;offset:number}[]=[];let cursor=0;
 for(let i=0;i<count;i++){require(cursor+30<=centralOffset&&view.getUint32(cursor,true)===0x04034b50&&view.getUint16(cursor+8,true)===0&&view.getUint16(cursor+6,true)===0x800);const size=view.getUint32(cursor+18,true),length=view.getUint16(cursor+26,true),extra=view.getUint16(cursor+28,true),start=cursor+30+length+extra;require(extra===0&&view.getUint32(cursor+22,true)===size&&start+size<=centralOffset);const path=decoder.decode(data.slice(cursor+30,cursor+30+length)),body=data.slice(start,start+size),crc=view.getUint32(cursor+14,true);require(/^[A-Za-z0-9_./-]+$/.test(path)&&!path.includes('..')&&!records.some(r=>r.path===path)&&crc32(body)===crc);if(!i)require(path==='mimetype'&&decoder.decode(body)==='application/epub+zip');records.push({path,size,crc32:crc,offset:cursor});cursor=start+size;}
 require(cursor===centralOffset);
 for(const record of records){require(cursor+46<=end&&view.getUint32(cursor,true)===0x02014b50&&view.getUint16(cursor+10,true)===0&&view.getUint32(cursor+16,true)===record.crc32&&view.getUint32(cursor+20,true)===record.size&&view.getUint32(cursor+24,true)===record.size&&view.getUint32(cursor+42,true)===record.offset);const length=view.getUint16(cursor+28,true);require(view.getUint16(cursor+30,true)===0&&view.getUint16(cursor+32,true)===0&&cursor+46+length<=end&&decoder.decode(data.slice(cursor+46,cursor+46+length))===record.path);cursor+=46+length;}
 require(cursor===end&&['META-INF/container.xml','EPUB/package.opf','EPUB/nav.xhtml'].every(path=>records.some(r=>r.path===path)));return records.map(({path,size,crc32})=>({path,size,crc32}));
}

function imageNeed(v:unknown,m:string):asserts v{if(!v)throw Error(m);}
/** Only PNG/JPEG bytes with bounded valid container headers; never SVG, HTML, URLs or script. */
export function inspectEpubImage(bytes:Uint8Array,mime:string){
 imageNeed(bytes.length>=24&&bytes.length<=2*1024*1024,'Choose an image with valid headers up to 2 MB.');let width=0,height=0;
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(mime==='image/png'){
  imageNeed([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b),'PNG header does not match its declared type.');let at=8,first=true,ended=false,sawData=false;
  while(at+12<=bytes.length){const length=v.getUint32(at),end=at+12+length;imageNeed(end<=bytes.length,'PNG chunk is incomplete.');const type=String.fromCharCode(...bytes.slice(at+4,at+8));imageNeed(/^[A-Za-z]{4}$/.test(type)&&crc32(bytes.slice(at+4,at+8+length))===v.getUint32(at+8+length),'PNG chunk integrity changed.');if(first){imageNeed(type==='IHDR'&&length===13,'PNG needs its original image header.');width=v.getUint32(at+8);height=v.getUint32(at+12);imageNeed([1,2,4,8,16].includes(bytes[at+16])&&[0,2,3,4,6].includes(bytes[at+17])&&bytes[at+18]===0&&bytes[at+19]===0&&bytes[at+20]<=1,'Unsupported PNG encoding.');first=false;}else imageNeed(type!=='IHDR','Duplicate PNG header.');if(type==='IDAT')sawData=true;if(type==='IEND'){imageNeed(length===0&&end===bytes.length&&sawData,'PNG end or image data is missing.');ended=true;break;}at=end;}
  imageNeed(ended,'PNG file is incomplete.');
 }else if(mime==='image/jpeg'){
  imageNeed(bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217,'JPEG header or end marker is missing.');let at=2,scan=false;
  while(at<bytes.length-2){imageNeed(bytes[at++]===255,'JPEG marker is invalid.');while(bytes[at]===255)at++;const marker=bytes[at++];imageNeed(marker!==0&&marker!==216&&marker!==217,'JPEG structure is invalid.');if(marker===1||marker>=208&&marker<=215)continue;imageNeed(at+2<=bytes.length,'JPEG marker is incomplete.');const length=v.getUint16(at);imageNeed(length>=2&&at+length<=bytes.length,'JPEG segment is incomplete.');if([192,193,194].includes(marker)){imageNeed(length>=8&&!width,'JPEG dimensions are ambiguous.');height=v.getUint16(at+3);width=v.getUint16(at+5);}if(marker===218){scan=true;break;}at+=length;}
  imageNeed(scan&&width&&height,'JPEG image frame and scan are required.');
 }else throw Error('Only local PNG and JPEG image resources are supported.');
 imageNeed(width>0&&height>0&&width<=4096&&height<=4096&&width*height<=8000000,'Image dimensions must fit within 4096 pixels and 8 megapixels.');return {width,height};
}
