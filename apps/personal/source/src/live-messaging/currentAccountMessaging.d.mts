import type {NonexportingSignerProvider,CurrentBoundSigner,PublicMessagingIdentity,CurrentSignerBinding,SignerOperation} from './currentBoundSigner.mjs';
import type {AdmittedHumanMessagingPort} from './admittedConversationSelection.mjs';
import type {HumanConversationBinding,HumanConversationResources} from './humanConversationWorkspace.mjs';
import type {PrivateCallController} from './privateCallController.mjs';
export type CurrentConversationGrant=Readonly<CurrentSignerBinding&{
 conversationId:string;kind:'person'|'spot'|'circle';groupId:string;storageFormat?:'crays-original-mdk-current-v1';membershipId:string;canRead:boolean;canSend:boolean;canCall?:boolean;
 isCurrent:(binding:HumanConversationBinding)=>boolean;
 openResources:(context:{binding:HumanConversationBinding;signer:CurrentBoundSigner;signal:AbortSignal})=>Promise<HumanConversationResources>;
 openCalls?:(context:{binding:HumanConversationBinding;signer:CurrentBoundSigner;signal:AbortSignal})=>Promise<PrivateCallController|null>;
}>;
export type CurrentAccountMessagingPort=AdmittedHumanMessagingPort&Readonly<{identity:PublicMessagingIdentity;signer:CurrentBoundSigner;close():void;settled():Promise<void>}>;
export function openCurrentAccountMessaging(options:{accountId:string;provider:NonexportingSignerProvider;isCurrent:(accountId:string)=>boolean;authorizeOperation:(binding:CurrentSignerBinding,operation:SignerOperation)=>boolean;signal:AbortSignal;fetcher?:typeof fetch;startGroupBeforeReturn?:boolean;admitConversation:(context:{identity:PublicMessagingIdentity;signer:CurrentBoundSigner;conversationId:string;signal:AbortSignal})=>Promise<CurrentConversationGrant|null>}):Promise<CurrentAccountMessagingPort>;
