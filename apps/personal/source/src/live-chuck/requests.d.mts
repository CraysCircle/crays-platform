export type ChuckOriginalRequest={messageId:string;receiptId:string;body:string;createdAt:string;acceptedAt:string;acceptanceOutcome:'STORED_RUNTIME_UNAVAILABLE';runtimeAdmissionState:'waiting_runtime_admission';dispatchState:string};
export type ChuckSourceCursor={bindingId:string;revision:string;conversationId:string;nextBeforeMessageId:string;oldestCreatedAt:string};
export function personalRequestPage(value:unknown):{bindingId:string;revision:string;conversationId:string;requests:ChuckOriginalRequest[];hasOlderRequests:boolean;nextBeforeMessageId:string|null};
