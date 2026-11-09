import type {OwnMemberConversations} from "@/lib/clubs/member-conversation-contract";
import styles from "./member-messages-workspace.module.css";
type Conversation=OwnMemberConversations["cases"][number];
export function MemberMessageHistory({conversation,locale}:{conversation:Conversation;locale:string}){
 const messages=[...conversation.messages].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.messageId.localeCompare(b.messageId));
 const format=new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"});
 return <section aria-label="Your shared messages"><p className={styles.historyNote}>Your saved TEST conversation · automation replies are labelled. Human replies and attachments are still being connected.</p>{messages.length?<ol className={styles.messages}>{messages.map(message=><li key={message.messageId} className={message.authorType==="member"?styles.outgoing:styles.incoming}><article><header><div className={styles.messageAuthor}><strong>{message.authorName}</strong><span className={styles.messageAuthorType}>{message.authorType==="automation"?"Automation · TEST":"Member · TEST"}</span></div><time dateTime={message.createdAt}>{format.format(new Date(message.createdAt))}</time></header><p>{message.body}</p></article></li>)}</ol>:<p>No messages from you are available in this conversation yet.</p>}</section>;
}
