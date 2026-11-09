import type {MdkNormalDeviceRuntime} from './mdkDeviceRuntime.mjs';
import type {MdkGroupJournalBinding,MdkGroupJournal} from './mdkMembershipJournal.mjs';
import type {MdkOutgoingAdmission} from './mdkOutgoingPublisher.mjs';
import type {PrivateGroupController} from './privateGroupController.mjs';
export function openMdkGroupManagement(options:{
 binding:MdkGroupJournalBinding&{storageFormat:'crays-original-mdk-current-v1'};
 runtime:MdkNormalDeviceRuntime;journal:MdkGroupJournal;
 getAdmission():MdkOutgoingAdmission|null;
 authorize(binding:MdkGroupJournalBinding,action:'read'|'manage'):boolean;
 signal:AbortSignal;newId?():string;
 onConfirmed?(state:Readonly<{groupId:string;name:string;members:readonly string[]}>):Promise<void>;
}):Promise<PrivateGroupController>;
