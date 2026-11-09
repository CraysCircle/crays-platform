import type {HumanConversationClient} from './humanConversationClient.mjs';
import type {ConversationTimer} from './conversationTimer.mjs';
export function createTimedConversationView(options:{client:HumanConversationClient;timer:ConversationTimer;signal:AbortSignal;authorize:()=>boolean;now?:()=>number;setTimeout?:typeof globalThis.setTimeout;clearTimeout?:typeof globalThis.clearTimeout}):HumanConversationClient&{messageTimer:ConversationTimer};
