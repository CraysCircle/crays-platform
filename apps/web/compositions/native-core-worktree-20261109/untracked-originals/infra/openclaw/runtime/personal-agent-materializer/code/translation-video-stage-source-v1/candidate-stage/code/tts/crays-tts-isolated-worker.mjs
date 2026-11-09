/** No real credentials/config are read. Exact original writer retains atomic file handling and its2empty-outputattempts. */
import {t as originalEdgeTTS} from './crays-tts-original-writer.mjs';
import {VOICES} from './crays-explicit-speech-call.mjs';
import {lstatSync,realpathSync} from 'node:fs';import path from 'node:path';
const chunks=[];let bytes=0;
try{
 for await(const chunk of process.stdin){bytes+=chunk.length;if(bytes>32768)throw Error('INPUT_LIMIT');chunks.push(chunk);}
 const params=JSON.parse(Buffer.concat(chunks).toString('utf8'));const keys=Object.keys(params).sort();if(JSON.stringify(keys)!==JSON.stringify(['config','outputPath','text','timeoutMs']))throw Error('INPUT_KEYS');
 if(JSON.stringify(Object.keys(params.config).sort())!==JSON.stringify(['lang','outputFormat','timeoutMs','voice']))throw Error('CONFIG_KEYS');
 const {config,text,outputPath,timeoutMs}=params,dir=path.dirname(outputPath);if(!Object.hasOwn(VOICES,config.lang)||!Object.values(VOICES[config.lang]).includes(config.voice)||config.outputFormat!=='audio-24khz-48kbitrate-mono-mp3'||typeof text!=='string'||!text.trim()||text.length>2000||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000||config.timeoutMs!==timeoutMs||realpathSync(dir)!==dir||!lstatSync(dir).isDirectory()||path.basename(outputPath)!=='speech.mp3'||!path.basename(dir).startsWith('tts-microsoft-'))throw Error('INPUT_VALUE');
 await originalEdgeTTS(params);process.exit(0);
}catch{process.exit(1);}
