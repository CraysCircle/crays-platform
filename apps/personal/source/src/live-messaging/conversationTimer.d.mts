import type {ConversationDraftBinding} from './conversationDraft.mjs';
export const CONVERSATION_TIMER_SECONDS:readonly number[];
export type ConversationTimerChange=Readonly<{at:number;seconds:number}>;
export type ConversationTimerSnapshot=Readonly<{available:boolean;seconds:number;changes:readonly ConversationTimerChange[];revision:number;saving:boolean;problem:string|null}>;
export interface ConversationTimer {readonly binding:ConversationDraftBinding;getSnapshot():ConversationTimerSnapshot;subscribe(fn:()=>void):()=>void;reload():Promise<void>;save(seconds:number):Promise<ConversationTimerSnapshot>;close():void;}
export function conversationTimerLabel(seconds:number):string;
export function conversationMessageExpiry(message:{createdAt?:number},changes:readonly ConversationTimerChange[]):number;
export function openConversationTimer(options:{binding:ConversationDraftBinding;journal:{getItem(key:string):Promise<unknown>;setItem(key:string,value:unknown):Promise<unknown>};exclusive:<T>(address:string,operation:()=>Promise<T>,signal:AbortSignal)=>Promise<T>;authorize:(binding:ConversationDraftBinding)=>boolean;signal:AbortSignal;now?:()=>number;wait?:(ms:number)=>Promise<void>}):Promise<ConversationTimer>;
