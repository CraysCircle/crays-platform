export type ConversationContactSpot=Readonly<{id:string;name:string;city:string}>;
export type ConversationContactInfo=Readonly<{schema:1;accountId:string;conversationId:string;peerId:string;peerPubkey:string;sharedSpots:readonly ConversationContactSpot[];homeSpot:ConversationContactSpot;firstMeeting:null}>;
export function parseConversationContactInfo(value:unknown,binding:unknown):ConversationContactInfo|null;
