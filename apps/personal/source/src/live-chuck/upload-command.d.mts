export type OriginalUploadDescriptor={mimeType:string;byteLength:number;sha256:string;retainSeconds:number;displayName?:string};
export type OriginalUploadCommand={bindingId:string;expectedBindingRevision:string;expectedContactRevision:string;idempotencyKey:string;body:string;originals:ReadonlyArray<Readonly<OriginalUploadDescriptor>>;inputPurpose?:'personal-chuck-input'};
export function captureOriginalUploadCommand(value:unknown):Readonly<OriginalUploadCommand>;
export function captureOriginalUploadBytes(value:unknown,payloads:(Uint8Array|ArrayBuffer)[],options?:{subtle?:SubtleCrypto;assertCurrent?:()=>void}):Promise<ArrayBuffer[]>;
