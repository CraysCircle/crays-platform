import type {MdkNormalDeviceRuntime} from './mdkDeviceRuntime.mjs';
import type {MdkGroupJournal,MdkGroupJournalBinding} from './mdkMembershipJournal.mjs';
import type {MdkOutgoingPublisher,MdkOutgoingAdmission} from './mdkOutgoingPublisher.mjs';
export function openMdkDevicePublisher(options:{binding:MdkGroupJournalBinding;runtime:MdkNormalDeviceRuntime;journal:MdkGroupJournal;getAdmission:()=>MdkOutgoingAdmission|null;authorize:(binding:MdkGroupJournalBinding,action:'read'|'send')=>boolean;signal:AbortSignal;crypto?:Crypto}):Promise<MdkOutgoingPublisher>;
