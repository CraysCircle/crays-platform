import type {PrivateMediaSession} from './privateMediaSession.mjs';
import type {MdkNormalDeviceRuntime} from './mdkDeviceRuntime.mjs';
import type {MdkGroupJournalBinding,MdkGroupJournal} from './mdkMembershipJournal.mjs';
import type {MdkOutgoingAdmission} from './mdkOutgoingPublisher.mjs';
export function openMdkMediaSession(options:{binding:MdkGroupJournalBinding&{storageFormat:'crays-original-mdk-current-v1'};runtime:MdkNormalDeviceRuntime;journal:MdkGroupJournal;getAdmission():MdkOutgoingAdmission|null;authorize(binding:MdkGroupJournalBinding,action:'read'|'send'):boolean;signal:AbortSignal;baseUrl:string;transport:{upload(input:{baseUrl:string;data:Uint8Array;ciphertextSha256:string;signal:AbortSignal;maxBytes:number}):Promise<string>;fetch(input:{url:string;signal:AbortSignal;maxBytes:number}):Promise<Uint8Array>}}):Promise<PrivateMediaSession>;
