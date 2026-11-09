// Fixed original admitted dependencies. No paths/URLs/config/auth supplied over stdin.
import JSZip from '/opt/crays/openclaw/plugin-artifacts/crays-document-exports/79e34b46af23d2f9f092b4a918658fb4557d9734113e7b58e5bfe2c74dc6b63b/node_modules/jszip/lib/index.js';
import ExcelJS from '/opt/crays/openclaw/plugin-artifacts/crays-document-exports/79e34b46af23d2f9f092b4a918658fb4557d9734113e7b58e5bfe2c74dc6b63b/vendor/exceljs.bare.min.cjs';
import {Parser} from '/opt/crays/openclaw/plugin-artifacts/crays-feed-reader/46481eb3d47ee26f3b5bb7a577c7ed7e81a9c97fe87ff554fa53397aeb320f7d/node_modules/htmlparser2/dist/esm/index.js';
import {preflightOfficeZip} from './zip-preflight.mjs';
const fail=()=>{throw new Error('OFFICE_PARSE_REJECTED');};
try{
 let length=0;const chunks=[];for await(const chunk of process.stdin){length+=chunk.length;if(length>7100000)fail();chunks.push(chunk);}
 const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(Object.keys(input).sort().join(',')!=='bytesBase64,format,maxChars'||!['docx','xlsx'].includes(input.format)||!Number.isSafeInteger(input.maxChars)||input.maxChars<1||input.maxChars>60000||typeof input.bytesBase64!=='string')fail();
 const bytes=Buffer.from(input.bytesBase64,'base64');if(bytes.toString('base64')!==input.bytesBase64)fail();
 const {names}=preflightOfficeZip(bytes);
 // CRC/declared-size checks run inside this memory/time bounded child before either parser.
 const archive=await JSZip.loadAsync(bytes,{checkCRC32:true,createFolders:false});
 let text='',truncated=false;const append=value=>{const s=String(value);if(text.length+s.length>input.maxChars)truncated=true;text+=(s.slice(0,Math.max(0,input.maxChars-text.length)));};
 if(input.format==='docx'){
  if(!names.has('word/document.xml')||names.has('xl/workbook.xml'))fail();
  const raw=await archive.file('word/document.xml')?.async('nodebuffer');if(!raw||raw.length>2097152)fail();
  const xml=new TextDecoder('utf-8',{fatal:true}).decode(raw);if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail();
  const stack=[];let insideText=false,rootSeen=false;
  const parser=new Parser({
   onopentag(name,attrs){
    if(stack.length===0){if(name!=='w:document'||attrs['xmlns:w']!=='http://schemas.openxmlformats.org/wordprocessingml/2006/main')fail();rootSeen=true;}
    stack.push(name);if(stack.length>128)fail();insideText=name==='w:t';if(name==='w:tab')append('\t');if(name==='w:br'||name==='w:cr')append('\n');
   },
   ontext(value){if(insideText)append(value);},
   onclosetag(name){if(stack.pop()!==name)fail();if(name==='w:p')append('\n');insideText=stack.at(-1)==='w:t';},
   onerror(){fail();}
  },{xmlMode:true,decodeEntities:true,recognizeSelfClosing:true});parser.write(xml);parser.end();if(!rootSeen||stack.length)fail();
 }else{
  if(!names.has('xl/workbook.xml')||names.has('word/document.xml'))fail();
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes);
  if(workbook.worksheets.length>16)fail();let cells=0;
  const scalar=value=>{
   if(value===null||value===undefined)return null;
   if(['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return value;
   if(value instanceof Date){if(!Number.isFinite(value.getTime()))fail();return {date:value.toISOString()};}
   if(typeof value==='object'){
    if(typeof value.formula==='string'||typeof value.sharedFormula==='string')return {formula:value.formula??value.sharedFormula,cachedResult:scalar(value.result),evaluated:false};
    if(Array.isArray(value.richText))return value.richText.map(v=>typeof v.text==='string'?v.text:'').join('');
    if(typeof value.text==='string')return value.text; // hyperlink display only, never dereference
    if(typeof value.error==='string')return {error:value.error};
   }fail();
  };
  for(const sheet of workbook.worksheets){
   if(sheet.rowCount>5000||sheet.columnCount>64)fail();append(`Sheet: ${JSON.stringify(sheet.name)}\n`);
   sheet.eachRow({includeEmpty:false},row=>{const values=[];row.eachCell({includeEmpty:false},(cell,column)=>{if(++cells>10000||column>64)fail();values.push({column,value:scalar(cell.value)});});append(JSON.stringify({row:row.number,cells:values})+'\n');});
  }
 }
 // Avoid cutting a surrogate pair at the native text cap.
 if(text.length&&/[\uD800-\uDBFF]/u.test(text.at(-1)))text=text.slice(0,-1);
 process.stdout.write(JSON.stringify({text,images:[],metadata:{textTruncated:truncated,imagesTruncated:false},formulasEvaluated:false,externalLinksFollowed:false}));
}catch{process.stderr.write('OFFICE_PARSE_REJECTED\n');process.exitCode=1;}
