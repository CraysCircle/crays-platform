export const MAX_PERSONAL_ATTACHMENT_BYTES: number;
export const PERSONAL_ATTACHMENT_MIME_TYPES: readonly string[];
export type OwnAttachmentUpload = Readonly<{
 messageId:string; receiptId:string; idempotencyKey:string; expectedContactRevision:string;
 mimeType:string; bytes:Buffer; retainSeconds:number; displayName?:string;
}>;
export type OwnAttachmentReference = Readonly<{attachmentId:string;version:1;sha256:string}>;
export function captureOwnAttachmentUpload(input:unknown): Readonly<Omit<OwnAttachmentUpload,'bytes'> & {
 byteLength:number;sha256:string;fingerprint:string;copyBytes:()=>Buffer;
}>;
export function captureOwnAttachmentReference(input:unknown): OwnAttachmentReference;
export type CapturedOwnMessageOriginals = Readonly<{
 message:Readonly<Record<string,string>>;
 originalIdentity:readonly (readonly (string|number)[])[];
 materialize:(messageId:string,receiptId:string)=>readonly ReturnType<typeof captureOwnAttachmentUpload>[];
}>;
export function captureOwnMessageWithOriginals(input:unknown):CapturedOwnMessageOriginals;

export function captureOwnOriginalDisplayName(value:unknown):string;
