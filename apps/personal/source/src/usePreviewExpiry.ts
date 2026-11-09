import {useEffect,useState} from 'react';
/** Refresh permission-bound previews when a deadline passes or the app resumes. */
export function usePreviewExpiry(expiresAt:number){
 const [clock,refresh]=useState(0);
 useEffect(()=>{if(!Number.isFinite(expiresAt)||expiresAt<=Date.now())return;const timer=setTimeout(()=>refresh(Date.now()),Math.min(expiresAt-Date.now()+10,2147483647));return()=>clearTimeout(timer);},[expiresAt,clock]);
 useEffect(()=>{const resume=()=>{if(document.visibilityState==='visible')refresh(Date.now());};document.addEventListener('visibilitychange',resume);return()=>document.removeEventListener('visibilitychange',resume);},[]);
}
