/** Candidate isolation at the original Edge writer seam. Original public TTS provider/tool/receipt remain intact. */
import {spawn} from 'node:child_process';
import {statSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {n as inferEdgeExtension} from '/run/crays-owner-tools-whatsapp-live/code/tts/crays-tts-original-writer.mjs';
import {currentExplicitSpeechCall,VOICES} from '/run/crays-owner-tools-whatsapp-live/code/tts/crays-explicit-speech-call.mjs';
let inFlight=false;
async function edgeTTS(params,ttsOverride){
 if(ttsOverride!==undefined)throw Error('EXPLICIT_SPEECH_OVERRIDE_DENIED');
 const scope=currentExplicitSpeechCall(),{text,outputPath,config,timeoutMs}=params;
 if(typeof text!=='string'||!text.trim()||text.length>2000||Buffer.byteLength(text,'utf8')>12000||!Object.hasOwn(VOICES,config?.lang)||!Object.values(VOICES[config.lang]).includes(config.voice)||config.outputFormat!=='audio-24khz-48kbitrate-mono-mp3'||config.proxy||config.saveSubtitles)throw Error('EXPLICIT_SPEECH_INPUT_REQUIRED');
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('EXPLICIT_SPEECH_TIMEOUT_LIMIT');
 const dir=path.dirname(outputPath),st=lstatSync(dir);
 if(path.basename(outputPath)!=='speech.mp3'||!st.isDirectory()||st.isSymbolicLink()||realpathSync(dir)!==dir||!path.basename(dir).startsWith('tts-microsoft-'))throw Error('EXPLICIT_SPEECH_TEMP_ROOT_REQUIRED');
 if(inFlight)throw Error('EXPLICIT_SPEECH_BUSY');
 const worker=fileURLToPath(new URL('file:///run/crays-owner-tools-whatsapp-live/code/tts/crays-tts-isolated-worker.mjs'));
 // prlimit lowers only this child: output <=2MiB, CPU <=10s. Writer-only25s deadline requests SIGKILL; settlement waits actual close.
 const child=spawn('/usr/bin/prlimit',['--fsize=2097152:2097152','--cpu=10:10','--',process.execPath,worker],{cwd:dir,env:{HOME:dir,TMPDIR:dir,LANG:'C.UTF-8'},stdio:['pipe','ignore','ignore'],shell:false,detached:false});
 inFlight=true;let reason=null,timer,closeConfirmed=false;
 const kill=code=>{reason??=code;try{child.kill('SIGKILL');}catch{reason??='EXPLICIT_SPEECH_CHILD_TERMINATION_UNKNOWN';}};
 const onAbort=()=>kill('EXPLICIT_SPEECH_CANCELLED');
 try{
  await new Promise((resolve,reject)=>{
   let settled=false;const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);scope.signal?.removeEventListener('abort',onAbort);error?reject(error):resolve();};
   // Node error can mean a failed kill, not termination. Retain admission and deadline until the actual close event.
   child.on('error',()=>{reason??='EXPLICIT_SPEECH_CHILD_ERROR_AWAITING_CLOSE';});
   child.once('close',code=>{closeConfirmed=true;inFlight=false;finish(reason?Error(reason):code===0?null:Error('EXPLICIT_SPEECH_PROVIDER_FAILED'));});
   child.stdin.on('error',()=>kill('EXPLICIT_SPEECH_CHILD_INPUT_FAILED'));
   timer=setTimeout(()=>kill('EXPLICIT_SPEECH_DEADLINE'),25000);scope.signal?.addEventListener('abort',onAbort,{once:true});if(scope.signal?.aborted)onAbort();
   try{child.stdin.end(JSON.stringify({text,outputPath,config:{voice:config.voice,lang:config.lang,outputFormat:config.outputFormat,timeoutMs},timeoutMs}));}catch{kill('EXPLICIT_SPEECH_CHILD_INPUT_FAILED');}
  });
  scope.guard();const audio=statSync(outputPath);if(!audio.isFile()||audio.size<1||audio.size>2097152)throw Error('EXPLICIT_SPEECH_OUTPUT_LIMIT');
 }finally{if(closeConfirmed){clearTimeout(timer);scope.signal?.removeEventListener('abort',onAbort);} /* Unknown lifecycle retains slot, deadline and close/abort listeners; never admit a second child. */}
}
export {inferEdgeExtension as n,edgeTTS as t};
