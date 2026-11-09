import {qrGenerate,qrReadUpload} from './qrLocalCodec.ts';
import type {QrDraft} from './qrPayload.ts';
const scope=self as unknown as {onmessage:((event:MessageEvent<{id:string;draft:QrDraft}>)=>void)|null;postMessage:(data:unknown)=>void};
scope.onmessage=async event=>{const {id,draft}=event.data;try{const receipt=draft.mode==='image'?await qrReadUpload(draft):qrGenerate(draft);scope.postMessage({id,receipt});}catch(e){scope.postMessage({id,error:e instanceof Error?e.message:'Local QR processing failed.'});}};
