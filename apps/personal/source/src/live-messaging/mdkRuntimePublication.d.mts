import type {MdkPublicationHooks} from './mdkDeviceRuntime.mjs';
import type {CurrentAccountMessagingPort} from './currentAccountMessaging.mjs';
export interface MdkTransportPublishRequest {
 account_id:number[];
 required_acks:number;
 message:{id:number[];payload:number[];envelope:{GroupMessage:{transport_group_id:number[]}}|{Welcome:{recipient:number[]}}};
 target:{Group:{group_id:number[];transport_group_id:number[];endpoints:string[]}}|{Inbox:{recipient:number[];endpoints:string[]}};
}
export interface MdkTransportPublishReport {
 message_id:number[];required_acks:number;
 accepted:Array<{endpoint:string;accepted_at:number;ack_kind:'affirmative'}>;
 failed:Array<{endpoint:string;reason:string;kind:'not_exposed'|'terminal_rejected'|'possibly_exposed';rejection_category:null}>;
}
export function openMdkRuntimePublication(options:{
 account:Pick<CurrentAccountMessagingPort,'accountId'|'identity'|'signal'>;
 isCurrent():boolean;
 checkpoint():Promise<unknown>;
 authorize(request:MdkTransportPublishRequest):boolean|Promise<boolean>;
 network:{publish(endpoints:string[],event:unknown,options:{signal:AbortSignal;beforeSend():boolean}):Promise<Record<string,{ok:boolean}>>};
}):Readonly<{publish(request:MdkTransportPublishRequest,hooks?:MdkPublicationHooks):Promise<MdkTransportPublishReport>}>;
