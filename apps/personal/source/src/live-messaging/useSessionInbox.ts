import {useSyncExternalStore} from 'react';
import type {SessionInbox,InboxState} from './sessionInbox.mjs';
const empty:InboxState=Object.freeze({rows:Object.freeze({}),preferences:Object.freeze({}),state:'idle',loaded:0,total:null,readStateProblem:false});
const inactive={subscribe:()=>()=>{},getSnapshot:()=>empty};
export function useSessionInbox(inbox?:SessionInbox){const source=inbox??inactive;return useSyncExternalStore(source.subscribe,source.getSnapshot,source.getSnapshot).rows;}

export function useSessionInboxState(inbox?:SessionInbox){const source=inbox??inactive;return useSyncExternalStore(source.subscribe,source.getSnapshot,source.getSnapshot);}
