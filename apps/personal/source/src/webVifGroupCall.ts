import type {Entity,ProductWorld} from './productModel';
import {canDirectMessage} from './communicationPolicy';
export type GroupCallPeer={personId:string;status:'ringing'|'answered'|'declined'|'missed'|'left'};
export function groupCallPeople(w:ProductWorld){return w.identity.signedIn?w.people.filter(p=>p.id!==w.owner&&canDirectMessage(w,p.id)):[];}
export function groupCallReview(w:ProductWorld,ids:string[]){
 if(!w.identity.signedIn||!w.owner||!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id||!groupCallPeople(w).some(p=>p.id===id)))throw Error('Choose at least two different currently permitted VIFs for this group preview.');
 return JSON.stringify([w.owner,[...ids].sort().map(id=>w.people.find(p=>p.id===id))]);
}
export function validGroupCall(w:ProductWorld,o:Entity){
 if(!w.identity.signedIn||o.owner!==w.owner||o.kind!=='web-group-call'||typeof o.id!=='string'||!o.id||w.objects.filter(q=>q.id===o.id).length!==1||!['Voice','Video'].includes(String(o.type))||!['ringing','ongoing','interrupted','ended','cancelled'].includes(String(o.status))||o.realExecution!==false||o.microphone!==false||o.camera!==false||o.recording!==false||o.transcription!==false||o.chuckIncluded!==false||!Number.isSafeInteger(o.version)||Number(o.version)<1||!Array.isArray(o.peers)||o.peers.length<2)return false;
 const peers=o.peers as GroupCallPeer[];
 if(typeof o.createdAt!=='number'||!Number.isFinite(o.createdAt)||o.createdAt<=0)return false;
 const ended=['ended','cancelled'].includes(String(o.status));
 if(ended&&(typeof o.endedAt!=='number'||!Number.isFinite(o.endedAt)||o.endedAt<o.createdAt||peers.some(p=>['ringing','answered'].includes(p?.status)))||!ended&&o.endedAt!==undefined)return false;
 if(['ongoing','interrupted'].includes(String(o.status))&&!peers.some(p=>p?.status==='answered')||o.status==='ringing'&&(!peers.some(p=>p?.status==='ringing')||peers.some(p=>p?.status==='answered')))return false;
 return peers.every(p=>p&&typeof p.personId==='string'&&!!p.personId&&['ringing','answered','declined','missed','left'].includes(p.status))&&new Set(peers.map(p=>p.personId)).size===peers.length;
}
export function groupCallCurrent(w:ProductWorld,o:Entity){if(!validGroupCall(w,o))return false;try{return groupCallReview(w,(o.peers as GroupCallPeer[]).map(p=>p.personId))===o.sourceSnapshot;}catch{return false;}}
export function ownGroupCalls(w:ProductWorld){return w.identity.signedIn?w.objects.filter(o=>o.owner===w.owner&&o.kind==='web-group-call'&&validGroupCall(w,o)):[];}
export function applyGroupCallAction(w:ProductWorld,o:Entity,action:string,personId:string,version:string){
 if(!validGroupCall(w,o)||String(o.version)!==version)throw Error('Review this exact current group preview again.');
 if(!['Answer','Decline','NoAnswer','Leave','Interrupt','Resume','End','Cancel'].includes(action))throw Error('Choose an available group preview action.');
 const terminal=['ended','cancelled'].includes(String(o.status));
 if(terminal)throw Error('This preview has ended. Prepare a new one explicitly.');
 if(!['End','Cancel'].includes(action)&&(!groupCallCurrent(w,o)||w.identity.relayState==='offline'))throw Error('The selected people, permissions or connection changed. End this preview or prepare a new reviewed one.');
 const peers=o.peers as GroupCallPeer[];
 if(action==='End'||action==='Cancel'){o.status=action==='End'?'ended':'cancelled';o.peers=peers.map(p=>({...p,status:p.status==='ringing'?'missed':p.status==='answered'?'left':p.status}));o.endedAt=Date.now();}
 else if(action==='Interrupt'){if(o.status!=='ongoing')throw Error('Only an ongoing preview can be interrupted.');o.status='interrupted';}
 else if(action==='Resume'){if(o.status!=='interrupted'||!peers.some(p=>p.status==='answered'))throw Error('Only this interrupted preview with a joined example can reconnect.');o.status='ongoing';}
 else {const peer=peers.find(p=>p.personId===personId);if(!peer||action==='Leave'&&peer.status!=='answered'||action!=='Leave'&&peer.status!=='ringing')throw Error('Choose this participant’s available preview outcome.');peer.status=action==='Answer'?'answered':action==='Decline'?'declined':action==='NoAnswer'?'missed':'left';if(peers.every(p=>p.status!=='ringing'&&p.status!=='answered')){o.status='ended';o.endedAt=Date.now();}else if(o.status!=='interrupted'||!peers.some(p=>p.status==='answered'))o.status=peers.some(p=>p.status==='answered')?'ongoing':'ringing';}
 o.version=Number(o.version)+1;return o;
}
