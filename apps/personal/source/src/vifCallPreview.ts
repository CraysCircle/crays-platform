import type {Entity} from './productModel';
/** One policy for reading and changing local previews, including older off-only records. */
export function validVifCallPreview(call:Entity){
 if(!['Voice','Video'].includes(String(call.type))||!['ringing','connected-demo','interrupted','ended','declined','missed','busy','failed'].includes(String(call.status)))return false;
 if(call.recording!==false||call.transcription!==false||call.chuckIncluded!==false||[call.microphone,call.camera,call.realExecution].some(v=>v!==undefined&&v!==false))return false;
 if(call.direction!==undefined&&!['incoming-preview','outgoing-preview'].includes(String(call.direction)))return false;
 if(call.status==='failed')return call.permissionErrorExample==='Microphone permission denied'||call.type==='Video'&&call.permissionErrorExample==='Camera permission denied';
 return call.permissionErrorExample===undefined;
}
