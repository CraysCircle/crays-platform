export interface BrowserAttemptOutbox {
 prepare(text:string,replyTo?:string|null):Promise<{requestId:string}>;
 claim(requestId:string,text:string,replyTo?:string|null):Promise<{canPublish:boolean;result:{status:'sent-to-relay';requestId:string}|null}>;
 confirm(requestId:string,result:{status:string}):Promise<void>;
 reconcile(messages:readonly {requestId?:string;replyTo?:string|null;text:string;status:string}[]):Promise<void>;
 acknowledge(requestId:string):Promise<boolean|undefined>;
}
export function openBrowserAttemptOutbox(options:{accountKey:string;conversationId:string;storage?:{getItem(key:string):string|null|Promise<string|null>;setItem(key:string,value:string):unknown|Promise<unknown>;removeItem(key:string):unknown|Promise<unknown>};crypto?:Pick<Crypto,'subtle'|'randomUUID'>;exclusive?:<T>(scope:string,operation:()=>Promise<T>)=>Promise<T>}):Promise<BrowserAttemptOutbox>;
