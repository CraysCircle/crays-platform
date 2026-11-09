import {useSyncExternalStore} from 'react';
let editing=false;
const event='crays:layout-editing';
function listen(notify:()=>void){window.addEventListener(event,notify);return()=>window.removeEventListener(event,notify);}
export function setLayoutEditing(value:boolean){if(editing===value)return;editing=value;document.documentElement.dataset.layoutEditing=String(value);window.dispatchEvent(new Event(event));}
export function useLayoutEditing(){return useSyncExternalStore(listen,()=>editing,()=>false);}
