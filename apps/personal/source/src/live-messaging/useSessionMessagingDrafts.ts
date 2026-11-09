import {createContext,useSyncExternalStore} from 'react';
import {sessionConversationDrafts,type ConversationPositionMemory} from './sessionConversationDrafts.mjs';
import type {AdmittedHumanMessagingPort} from './admittedConversationSelection.mjs';
export function useSessionMessagingDrafts(port?:AdmittedHumanMessagingPort){
 const store=sessionConversationDrafts(port);
 const state=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 return [state.drafts,store.setDrafts,state.replies,store.setReplies] as const;
}

export const ConversationPositionContext=createContext<ConversationPositionMemory|undefined>(undefined);
