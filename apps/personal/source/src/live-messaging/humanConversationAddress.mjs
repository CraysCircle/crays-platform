/** A route selects an original conversation; it never grants membership.
 * The current server admission must independently match this exact kind and ID.
 * Keeping group addresses distinct prevents a Spot/Circle chat becoming a VIF.
 */
export function humanConversationKind(id){
 if(typeof id!=='string'||id.length>200||!/^(person|spot|circle):[a-zA-Z0-9:._-]{1,180}$/.test(id)||id==='person:chuck')return null;
 return id.slice(0,id.indexOf(':'));
}
export const validHumanConversationId=id=>humanConversationKind(id)!==null;
export const matchingHumanConversationAddress=b=>!!b&&validHumanConversationId(b.conversationId)&&humanConversationKind(b.conversationId)===b.kind;
