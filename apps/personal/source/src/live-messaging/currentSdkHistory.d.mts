import type {GroupHistoryFactory,BaseGroupHistory,MarmotGroup} from '../../.qualification/marmot-pilot-v1/node_modules/@internet-privacy/marmot-ts-welcome-context-v1/dist/client/group/marmot-group.js';
import type {PublicMessagingIdentity} from './currentBoundSigner.mjs';
import type {AccountBrowserStores} from './accountBrowserStores.mjs';
import type {CurrentConversationGrant} from './currentAccountMessaging.mjs';
export type CurrentSdkHistoryFactory=GroupHistoryFactory<BaseGroupHistory>&{
 admit(context:{grant:CurrentConversationGrant;group:MarmotGroup<BaseGroupHistory>}):void;
 recover(groupId:string):Promise<Readonly<{checked:number;repaired:number;unresolved:number;excluded?:number}>>;
 release(groupId:string):Promise<void>;
 close():Promise<void>;
};
export function createCurrentSdkHistoryFactory(context:{identity:PublicMessagingIdentity;stores:AccountBrowserStores['stores'];isCurrent:()=>boolean;signal:AbortSignal;locks?:LockManager;crypto?:Crypto}):CurrentSdkHistoryFactory;
