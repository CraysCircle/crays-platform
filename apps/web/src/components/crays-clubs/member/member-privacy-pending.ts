import type {MemberPrivacyCommand,MemberPrivacyRead} from "@/lib/clubs/member-privacy-contract";
export function recordedPrivacyRequest(read:MemberPrivacyRead,command:MemberPrivacyCommand){
 const row=read.requests.find(item=>item.idempotencyKey===command.idempotencyKey);
 const receipt=read.commandReceipt;
 if(!row||!receipt||row.requestId!==receipt.requestId||row.accountId!==read.accountId||receipt.accountId!==read.accountId||row.version!==command.expectedVersion+1||receipt.version!==row.version||row.kind!==command.kind||receipt.kind!==command.kind||row.reason!==command.reason||receipt.idempotencyKey!==command.idempotencyKey)return null;
 return row;
}
