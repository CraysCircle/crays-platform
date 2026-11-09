export const MAX_BODY: number;
export const MAX_RESPONSE: number;
export function validTarget(method: string, path: string): boolean;
export function createEnvelope(input: {
  key: Buffer; origin: string; method: string; path: string;
  headers: Record<string,string>; body: Buffer;
}): {metadata:string;signature:string};
export function verifyResponse(input: {
  key:Buffer;requestMetadata:string;metadata:string|null;signature:string|null;body:Buffer;
}): {status:number;headers:Record<string,string|string[]>};
