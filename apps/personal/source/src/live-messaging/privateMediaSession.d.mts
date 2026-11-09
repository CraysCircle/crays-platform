export type PrivateMediaRow={id:string;text:string;author:string;status:'received'|'sending'|'sent-to-relay'|'unconfirmed';attachments:{filename:string;mediaType:string}[]};
export interface PrivateMediaSession {
 getSnapshot():{available:boolean;canSend?:boolean;rows:PrivateMediaRow[];sending:boolean;hasEarlierMessages?:boolean;persistenceWarning?:boolean;pendingSends?:readonly {requestId:string;messageId:string;filename:string;text:string;createdAt:number}[]};
 subscribe(fn:()=>void):()=>void;
 adoptHistory(rumors:any[]):Promise<{added:number}>;
 send(input:{requestId:string;file:Blob;filename:string;caption?:string}):Promise<{status:'sent-to-relay'|'unconfirmed';messageId?:string;requestId:string}>;
 /** Explicit retry of an existing encrypted original; no new file or upload. */
 resumeSend?(requestId:string):Promise<{status:'sent-to-relay'|'unconfirmed';messageId?:string;requestId:string}>;
 load(messageId:string,index?:number):Promise<{data:Uint8Array;attachment:{filename:string;mediaType:string}}>;
 /** Cancel obsolete downloads only; completed cache and in-flight sends remain. */
 cancelReads?():void;
 flush():Promise<void>;
 close():void;
}
