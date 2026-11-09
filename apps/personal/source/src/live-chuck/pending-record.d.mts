import type{ChuckCommand,ChuckReceipt,ChuckPending}from'./controller.mjs';
export function isOriginalUploadCommand(value:unknown):boolean;
export function capturePendingReceipt(value:unknown,command:ChuckCommand,previous?:ChuckReceipt|null):ChuckReceipt;
export function captureChuckPendingRecord(value:unknown):ChuckPending|null;
