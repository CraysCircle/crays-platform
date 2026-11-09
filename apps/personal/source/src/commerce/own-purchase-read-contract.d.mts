import type{OwnCreatorPurchase}from'./own-purchase-types.mjs';
import type{OwnPurchaseFormat,OwnPurchaseListCommand,OwnPurchaseOriginalCommand,OwnPurchasePage,OwnPurchaseOriginal}from'./own-purchase-types.mjs';
export type{OwnCreatorPurchase,OwnPurchaseFormat,OwnPurchaseListCommand,OwnPurchaseOriginalCommand,OwnPurchasePage,OwnPurchaseOriginal};
export function captureOwnPurchaseListCommand(input?:unknown):Required<OwnPurchaseListCommand>;
export function captureOwnPurchaseOriginalCommand(input:unknown):OwnPurchaseOriginalCommand;
export function validOwnCreatorPurchase(value:unknown):value is OwnCreatorPurchase;
export function validOwnPurchasePage(value:unknown,input?:unknown):value is OwnPurchasePage;
export function validOwnPurchaseOriginal(value:unknown,input:unknown):value is OwnPurchaseOriginal;
export function ownPurchaseMatchesView(row:OwnCreatorPurchase,view:'all'|'library'|'needs-review'):boolean;

export const ownPurchaseFormats:readonly OwnPurchaseFormat[];
export function ownPurchaseMatchesQuery(row:OwnCreatorPurchase,query:string):boolean;
export function ownPurchaseMatchesFormat(row:OwnCreatorPurchase,format:OwnPurchaseFormat):boolean;
