import type {OwnAttachmentReference} from '../../db/personal-message-attachment-input.mjs';
export const MAX_NATIVE_ORIGINAL_READ_BYTES:number;
export function assertNativeOriginalReadTransport(request:Request):void;
export function readNativeOriginalReference(request:Request,assertCurrent:()=>void):Promise<OwnAttachmentReference>;
export function acquireNativeOriginalReadCapacity(accountId:string):Readonly<{assertCurrent:()=>void;release:()=>void}>;
export type NativeOriginalReadResult={bytes:Uint8Array;release:()=>void;receipt:{
 attachmentId:string;version:1;sha256:string;mimeType:string;byteLength:number;available:boolean;
 messageReceiptId:string;registrationReceiptId:string;
}};
export function createNativeOriginalReadResponse(result:NativeOriginalReadResult,signal:AbortSignal):Response;
