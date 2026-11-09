const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9:._-]{1,200}$/.test(v);
export function parseConversationContactInfo(value,binding){
 if(value==null)return null;
 const spot=s=>s&&validId(s.id)&&typeof s.name==='string'&&s.name.length>0&&s.name.length<=240&&typeof s.city==='string'&&s.city.length>0&&s.city.length<=240;
 if(value.schema!==1||value.accountId!==binding?.accountId||value.conversationId!==binding?.conversationId||!validId(value.peerId)||value.conversationId!=='person:'+value.peerId||typeof value.peerPubkey!=='string'||!/^[a-f0-9]{64}$/.test(value.peerPubkey)||!Array.isArray(value.sharedSpots)||value.sharedSpots.length>100||!value.sharedSpots.every(spot)||new Set(value.sharedSpots.map(s=>s.id)).size!==value.sharedSpots.length||!spot(value.homeSpot)||value.firstMeeting!==null)throw Error('Contact details unavailable');
 const copy=s=>Object.freeze({id:s.id,name:s.name,city:s.city});
 return Object.freeze({schema:1,accountId:value.accountId,conversationId:value.conversationId,peerId:value.peerId,peerPubkey:value.peerPubkey,sharedSpots:Object.freeze(value.sharedSpots.map(copy)),homeSpot:copy(value.homeSpot),firstMeeting:null});
}
