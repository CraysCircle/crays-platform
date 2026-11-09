import type {ChuckOriginalReference} from './originals.mjs';
export type ChuckOriginalReader=(reference:ChuckOriginalReference,control?:{signal?:AbortSignal;onProgress?:(received:number,total:number)=>void})=>Promise<Blob>;
export function createChuckOriginalReader(options:{accountScope:string;fetch?:typeof fetch;subtle?:SubtleCrypto}):ChuckOriginalReader;
