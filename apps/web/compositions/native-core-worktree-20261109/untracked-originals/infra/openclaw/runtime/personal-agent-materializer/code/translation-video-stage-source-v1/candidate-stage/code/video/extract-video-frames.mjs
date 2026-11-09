/** Private source proposal. No caller paths, URLs, arbitrary argv or model/audio calls. */
import {runFfprobe,runFfmpeg,getImageMetadata} from 'openclaw/plugin-sdk/media-runtime';
import {withTempWorkspace} from '@openclaw/fs-safe/temp';
import {n as resolvePreferredOpenClawTmpDir} from '../../node_modules/openclaw/dist/tmp-openclaw-dir-DR7bHNl9.mjs';
const MAX_INPUT=20*1024*1024,MAX_DURATION_MS=30000,MAX_PIXELS=2073600,MAX_EDGE=1920,MAX_FRAMES=8,MAX_PROBE_FRAMES=1800,MAX_JPEG=524288;
const fail=code=>{const error=new Error(code);error.safeCode=code;throw error;};
const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
function checkedDimensions(width,height){if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>MAX_EDGE||height>MAX_EDGE||width*height>MAX_PIXELS)fail('VIDEO_DIMENSIONS_REJECTED');}
function ms(value){if(typeof value!=='string'||!/^\d+(?:\.\d+)?$/.test(value))fail('VIDEO_TIMESTAMP_UNAVAILABLE');const number=Number(value)*1000;if(!Number.isFinite(number)||number<0||number>31000)fail('VIDEO_TIMESTAMP_REJECTED');return number;}
function argsRecord(input){
 if(input===null||typeof input!=='object'||Array.isArray(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('VIDEO_ARGUMENTS_REJECTED');
 const d=Object.getOwnPropertyDescriptors(input);for(const key of Reflect.ownKeys(d))if(typeof key!=='string'||!['buffer','mimeType','assertCurrent','signal'].includes(key)||!Object.hasOwn(d[key],'value'))fail('VIDEO_ARGUMENTS_REJECTED');
 if(!Buffer.isBuffer(input.buffer)||input.buffer.length<12||input.buffer.length>MAX_INPUT||!['video/mp4','video/webm'].includes(input.mimeType)||input.assertCurrent!==undefined&&typeof input.assertCurrent!=='function')fail('VIDEO_ARGUMENTS_REJECTED');
 return input;
}
/**
 * Samples an already-admitted short MP4/WebM. Optional original lifecycle check is
 * not a sender/person grant. Native exec has no signal option: await its bounded
 * completion, then reject aborted/revoked work before returning any frame.
 */
async function extractVideoFramesChecked(input){
 const {buffer,mimeType,assertCurrent,signal}=argsRecord(input);
 const current=()=>{if(signal?.aborted)fail('VIDEO_CANCELLED');assertCurrent?.();};current();
 const started=performance.now(),deadline=started+20000;
 const remaining=cap=>{current();const left=Math.floor(deadline-performance.now());if(left<1)fail('VIDEO_TIMEOUT');return Math.min(cap,left);};
 const bytes=Buffer.from(buffer),mp4=mimeType==='video/mp4';
 if(mp4?bytes.toString('ascii',4,8)!=='ftyp':!bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))fail('VIDEO_CONTAINER_REJECTED');
 const demuxer=mp4?'mov':'matroska',extension=mp4?'mp4':'webm';
 // No demuxer auto-detection, network/concat/HLS protocol, external MOV tracks or
 // absolute external references. Only fixed paths inside the original workspace.
 const inputOptions=['-protocol_whitelist','file','-format_whitelist',demuxer,'-f',demuxer,...mp4?['-enable_drefs','0','-use_absolute_path','0']:[], '-probesize','1048576','-analyzeduration','2000000','-threads','1','-max_pixels',String(MAX_PIXELS)];
 try{return await withTempWorkspace({rootDir:resolvePreferredOpenClawTmpDir(),prefix:'crays-video-frames-',dirMode:0o700,mode:0o600},async workspace=>{
  current();const inputPath=await workspace.write('input.'+extension,bytes);current();
  const header=JSON.parse(await runFfprobe(['-v','error',...inputOptions,'-select_streams','v:0','-show_entries','format=duration,format_name:stream=index,codec_type,codec_name,width,height,duration:stream_disposition=attached_pic','-of','json',inputPath],{timeoutMs:remaining(5000),maxBufferBytes:65536}));current();
  if(!header||!Array.isArray(header.streams)||header.streams.length!==1)fail('VIDEO_STREAM_REJECTED');
  const video=header.streams[0];if(video.codec_type!=='video'||video.disposition?.attached_pic===1||!['h264','hevc','vp8','vp9','av1'].includes(video.codec_name))fail('VIDEO_STREAM_REJECTED');
  const formats=typeof header.format?.format_name==='string'?header.format.format_name.split(','):[];if(!formats.includes(demuxer))fail('VIDEO_CONTAINER_REJECTED');
  checkedDimensions(video.width,video.height);
  const durations=[header.format?.duration,video.duration].filter(x=>x!==undefined&&x!=='N/A').map(ms);
  if(!durations.length||durations.some(x=>!positive(x)||x>MAX_DURATION_MS))fail('VIDEO_DURATION_REJECTED');const durationMs=Math.round(Math.max(...durations));
  // Real decoded frame timestamps, not guessed seek positions. Keep the probe
  // bounded independently of untrusted declared duration metadata.
  const observed=JSON.parse(await runFfprobe(['-v','error',...inputOptions,'-select_streams','v:0','-read_intervals','%+31','-show_frames','-show_entries','frame=best_effort_timestamp_time,width,height','-of','json',inputPath],{timeoutMs:remaining(5000),maxBufferBytes:262144}));current();
  if(!Array.isArray(observed?.frames)||observed.frames.length<2||observed.frames.length>MAX_PROBE_FRAMES)fail('VIDEO_FRAME_BUDGET_REJECTED');
  let previous=-1;const timeline=observed.frames.map((frame,index)=>{checkedDimensions(frame.width,frame.height);if(frame.width!==video.width||frame.height!==video.height)fail('VIDEO_DIMENSION_CHANGE_REJECTED');const timestamp=ms(frame.best_effort_timestamp_time);if(timestamp<=previous||timestamp>=MAX_DURATION_MS||timestamp>durationMs+100)fail('VIDEO_TIMELINE_REJECTED');previous=timestamp;return {index,timestampMs:Math.round(timestamp)};});
  const count=Math.min(MAX_FRAMES,timeline.length,Math.max(2,Math.ceil(durationMs/4000)+1));
  const selected=Array.from({length:count},(_,i)=>timeline[Math.round(i*(timeline.length-1)/(count-1))]);
  if(new Set(selected.map(f=>f.index)).size!==count||new Set(selected.map(f=>f.timestampMs)).size!==count)fail('VIDEO_TIMELINE_REJECTED');
  const names=Array.from({length:count},(_,i)=>'frame-'+String(i+1).padStart(2,'0')+'.jpg');
  for(const name of names){current();await workspace.write(name,Buffer.alloc(0));}
  const selection=selected.map(f=>`eq(n\\,${f.index})`).join('+');
  await runFfmpeg(['-hide_banner','-loglevel','error','-y',...inputOptions,'-i',inputPath,'-map','0:v:0','-an','-sn','-dn','-filter_threads','1','-vf',`select=${selection},scale=768:768:force_original_aspect_ratio=decrease`,'-vsync','0','-frames:v',String(count),'-threads','1','-q:v','6','-c:v','mjpeg','-fs','4194304','-f','image2',workspace.path('frame-%02d.jpg')],{timeoutMs:remaining(10000),maxBufferBytes:65536});current();
  const frames=[];
  for(let i=0;i<names.length;i++){
   current();const jpeg=await workspace.store.readBytes(names[i],{maxBytes:MAX_JPEG,symlinks:'reject',hardlinks:'reject'});current();
   if(jpeg.length<4||!jpeg.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff]))||!jpeg.subarray(-2).equals(Buffer.from([0xff,0xd9])))fail('VIDEO_FRAME_ENCODING_REJECTED');
   const metadata=await getImageMetadata(jpeg);current();if(!Number.isSafeInteger(metadata?.width)||!Number.isSafeInteger(metadata?.height)||metadata.width<1||metadata.height<1||metadata.width>768||metadata.height>768)fail('VIDEO_FRAME_DIMENSIONS_REJECTED');
   frames.push({timestampMs:selected[i].timestampMs,mimeType:'image/jpeg',buffer:Buffer.from(jpeg)});
  }
  remaining(1);return {durationMs,width:video.width,height:video.height,frames,audioAnalyzed:false,samplingLimited:true};
 });}catch(error){if(signal?.aborted)fail('VIDEO_CANCELLED');if(error?.safeCode)throw error;fail('VIDEO_FRAME_EXTRACTION_UNAVAILABLE');}
}

// Nothing from native CLI stderr/argv, model setup, native guard messages or temp
// paths crosses this exported boundary. Existing native diagnostics stay private.
const SAFE_CODES=new Set(['VIDEO_DIMENSIONS_REJECTED','VIDEO_TIMESTAMP_UNAVAILABLE','VIDEO_TIMESTAMP_REJECTED','VIDEO_ARGUMENTS_REJECTED','VIDEO_CANCELLED','VIDEO_TIMEOUT','VIDEO_CONTAINER_REJECTED','VIDEO_STREAM_REJECTED','VIDEO_DURATION_REJECTED','VIDEO_FRAME_BUDGET_REJECTED','VIDEO_DIMENSION_CHANGE_REJECTED','VIDEO_TIMELINE_REJECTED','VIDEO_FRAME_ENCODING_REJECTED','VIDEO_FRAME_DIMENSIONS_REJECTED','VIDEO_FRAME_EXTRACTION_UNAVAILABLE']);
export async function extractVideoFrames(input){
 try{return await extractVideoFramesChecked(input);}
 catch(error){fail(SAFE_CODES.has(error?.safeCode)?error.safeCode:'VIDEO_FRAME_EXTRACTION_UNAVAILABLE');}
}
