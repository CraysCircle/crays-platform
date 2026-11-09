import type {openCurrentAccountMessaging,CurrentAccountMessagingPort,CurrentConversationGrant} from './currentAccountMessaging.mjs';
import type {openCurrentMdkBrowserAccount} from './currentMdkBrowserAccount.mjs';
import type {openMdkDeviceRuntime,MdkNormalDeviceRuntime} from './mdkDeviceRuntime.mjs';
type AccountStore=Awaited<ReturnType<typeof openCurrentMdkBrowserAccount>>;
type Network=Parameters<typeof openMdkDeviceRuntime>[0]['network']&{close?():void};
type Base=Omit<Parameters<typeof openCurrentAccountMessaging>[0],'admitConversation'>;
type ResourceContext=Parameters<CurrentConversationGrant['openResources']>[0]&{runtime:MdkNormalDeviceRuntime;accountStore:AccountStore;network:Network};
type OriginalGrant=Omit<CurrentConversationGrant,'openResources'|'storageFormat'>&{storageFormat:'crays-original-mdk-current-v1';routingId:string;relays:readonly string[];openResources(context:ResourceContext):ReturnType<CurrentConversationGrant['openResources']>};
export function openCurrentOriginalBrowserMls(options:Base&{
 loadEngine():Promise<Parameters<typeof openCurrentMdkBrowserAccount>[0]['AccountClass']>;
 isCurrentBinding(identity:CurrentAccountMessagingPort['identity']):boolean;
 storage?:Parameters<typeof openCurrentMdkBrowserAccount>[0]['storage'];locks?:LockManager;crypto?:Crypto;
 currentInboxes():Record<string,string[]>;
 openNetwork(context:{account:CurrentAccountMessagingPort;signer:CurrentAccountMessagingPort['signer'];signal:AbortSignal}):Network|Promise<Network>;
 authorizeRuntimeOperation(operation:string,payload:unknown):boolean;
 onFailure?:Parameters<typeof openMdkDeviceRuntime>[0]['onFailure'];
 admitConversation(context:Parameters<Parameters<typeof openCurrentAccountMessaging>[0]['admitConversation']>[0]&{runtime:MdkNormalDeviceRuntime;accountStore:AccountStore;network:Network}):Promise<OriginalGrant|null>;
}):Promise<Readonly<{storageFormat:'crays-original-mdk-current-v1';messaging:CurrentAccountMessagingPort;runtime:MdkNormalDeviceRuntime;accountStore:AccountStore;network:Network;close():Promise<void>;settled():Promise<void>}>>;
