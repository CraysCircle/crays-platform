import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {PrivateMediaSession} from './privateMediaSession.mjs';
export function createHttpPrivateMedia(options:{client:HumanConversationClient;accountId:string;conversationId:string;isCurrent:()=>boolean;signal:AbortSignal;fetcher?:typeof fetch}):PrivateMediaSession;
