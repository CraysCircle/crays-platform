export const PRIVATE_FILE_MAX_BYTES:number;
export type PrivateFileAttachment={filename:string;mediaType:string;bytes:number;cipherBytes:number;sha256:string;plainSha256:string;key:string;nonce:string;url:string;caption:string};
export function parsePrivateFileMessage(rumor:any):PrivateFileAttachment|null;
export function decryptPrivateFileMessage(input:{data:Uint8Array;attachment:PrivateFileAttachment;crypto?:Crypto}):Promise<Uint8Array>;
