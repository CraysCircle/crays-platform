import type {AdmittedHumanMessagingPort} from './admittedConversationSelection.mjs';
export function openCurrentHttpMessaging(options:{platformAccountId:string;isCurrent:(id:string)=>boolean;signal:AbortSignal;fetcher?:typeof fetch;openConversationRoute?:(id:string)=>void}):Promise<AdmittedHumanMessagingPort&{close():void}>;
