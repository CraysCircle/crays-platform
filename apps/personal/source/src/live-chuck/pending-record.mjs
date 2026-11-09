import {captureCommand,receipt,immutable,fail} from './protocol.mjs';
import {captureOriginalUploadCommand} from './upload-command.mjs';
import {originalUploadReceipt} from './upload-transport.mjs';
export const isOriginalUploadCommand=value=>value!==null&&typeof value==='object'&&Object.hasOwn(value,'originals');
export function capturePendingReceipt(value,command,previous=null){
 const upload=isOriginalUploadCommand(command),base=receipt(value);
 if(previous&&['receiptId','messageId','outcome','createdAt'].some(key=>previous[key]!==base[key]))throw fail('original-changed');
 const result=upload?originalUploadReceipt(value,command,{allowReceiptOnly:true}):base;
 // An ingress-only receipt lookup does not erase the historical original
 // source-use receipt, nor turn it into a freshly validated execution grant.
 return upload&&previous?.sourceUse&&!result.sourceUse?originalUploadReceipt({...result,sourceUse:previous.sourceUse},command,{allowReceiptOnly:true}):result;
}
export function captureChuckPendingRecord(value){
 if(value===null)return null;
 if(!value||Object.keys(value).sort().join(',')!=='command,receipt,status'||!['prepared','unknown','stored'].includes(value.status))throw fail('pending-storage');
 const command=isOriginalUploadCommand(value.command)?captureOriginalUploadCommand(value.command):captureCommand(value.command),stored=value.receipt==null?null:capturePendingReceipt(value.receipt,command);
 if((value.status==='stored')!==!!stored)throw fail('pending-storage');
 return immutable({status:value.status,command,receipt:stored});
}
