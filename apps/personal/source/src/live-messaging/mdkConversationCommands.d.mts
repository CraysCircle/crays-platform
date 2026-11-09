import type {MdkTimelineRuntime} from './mdkTimelineConversation.mjs';
import type {MdkGroupJournalBinding} from './mdkMembershipJournal.mjs';
import type {MdkOutgoingPublisher,MdkOutgoingAdmission} from './mdkOutgoingPublisher.mjs';
import type {MdkConversationCommandClient} from './mdkTimelineConversation.mjs';
export function openMdkConversationCommands(options:{binding:MdkGroupJournalBinding;runtime:MdkTimelineRuntime;publisher:MdkOutgoingPublisher;getAdmission:()=>MdkOutgoingAdmission|null;authorize:(binding:MdkGroupJournalBinding,action:'read'|'send')=>boolean;signal:AbortSignal}):Promise<MdkConversationCommandClient>;
