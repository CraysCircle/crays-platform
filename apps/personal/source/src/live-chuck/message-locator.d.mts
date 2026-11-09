import type {PersonalChuckController} from './controller.mjs';
export function validChuckMessageId(value:unknown):value is string;
export type ChuckMessageLocation={phase:string;pagesRead:number;canContinue:boolean};
export class ChuckOriginalMessageLocator{
 constructor(options:{controller:PersonalChuckController;targetId:string});
 subscribe:(listener:()=>void)=>()=>void;getSnapshot:()=>ChuckMessageLocation;
 start():void;cancel():void;continue():void;dispose():void;
}
