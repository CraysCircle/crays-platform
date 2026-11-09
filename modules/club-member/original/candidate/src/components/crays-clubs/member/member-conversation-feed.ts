import type {MemberWorkspace} from "./clubs-member-home-model";
/** The same admitted source drives Messages and Search. Documents remain a separate support feed. */
export function memberConversationFeed({support,conversations}:Pick<MemberWorkspace,"support"|"conversations">){
 return conversations?.kind==="ready"?{kind:"ready" as const,data:{supportCases:conversations.data.cases.map(c=>({...c,version:c.caseVersion,messageCount:c.messages.length}))}}:support;
}
