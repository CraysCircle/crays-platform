import type {MdkNormalDeviceRuntime} from './mdkDeviceRuntime.mjs';
import type {MdkGroupJournalBinding,MdkGroupJournal} from './mdkMembershipJournal.mjs';
import type {MdkOutgoingAdmission} from './mdkOutgoingPublisher.mjs';
import type {PrivateGroupDeparture} from './privateGroupDeparture.mjs';
export function openMdkGroupDeparture(options:{binding:MdkGroupJournalBinding&{storageFormat:'crays-original-mdk-current-v1'};runtime:MdkNormalDeviceRuntime;journal:MdkGroupJournal;getAdmission():MdkOutgoingAdmission|null;authorize(binding:MdkGroupJournalBinding,action:'read'|'leave'):boolean;signal:AbortSignal;newId?():string;onLeft?(state:Readonly<{groupId:string;requestId:string}>):Promise<void>}):Promise<PrivateGroupDeparture>;
