import type {MdkNormalDeviceRuntime} from './mdkDeviceRuntime.mjs';
import type {MdkGroupJournalBinding,MdkGroupJournal} from './mdkMembershipJournal.mjs';
import type {MdkOutgoingAdmission} from './mdkOutgoingPublisher.mjs';
import type {GroupInviteResult,PrivateGroupInvitations} from './privateGroupInvitations.mjs';
export function openMdkGroupInvitations(options:{
 binding:MdkGroupJournalBinding&{storageFormat:'crays-original-mdk-current-v1'};
 runtime:MdkNormalDeviceRuntime;journal:MdkGroupJournal;
 getAdmission():MdkOutgoingAdmission|null;
 authorize(binding:MdkGroupJournalBinding,action:'read'|'manage'|'invite',target?:string):boolean;
 candidates():readonly Readonly<{pubkey:string;name:string}>[];
 resolvePackage(pubkey:string,options:{signal:AbortSignal}):Promise<unknown>;
 prepareRetry?(attempt:Readonly<GroupInviteResult>,options:{signal:AbortSignal;needsCommitProof?:boolean}):Promise<unknown>;
 signal:AbortSignal;newId?():string;
 onConfirmed?(state:Readonly<{groupId:string;name:string;members:readonly string[]}>):Promise<void>;
}):Promise<PrivateGroupInvitations&{retryOriginal(requestId:string):Promise<GroupInviteResult>}>;
