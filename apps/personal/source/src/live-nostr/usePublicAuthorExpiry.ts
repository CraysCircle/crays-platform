import {useEffect,useMemo,useState} from 'react';
import type {PublicAuthorPage} from './public-feed.mjs';
import {nextPublicExpiration,visiblePublicOriginals} from './public-expiration-clock.mjs';
/** A local visibility clock, never a fetch/retry or a global account cache. */
export function usePublicAuthorExpiry(page:PublicAuthorPage|null,scopeKey:string):PublicAuthorPage|null{
 const [clockRevision,setClockRevision]=useState(0);
 useEffect(()=>{
  if(!page)return;
  let active=true,timer:ReturnType<typeof setTimeout>|undefined;
  function schedule(){
   if(!active||!page)return;
   const now=Date.now(),next=nextPublicExpiration(page.originals,now);
   if(next===null)return;
   timer=setTimeout(()=>{
    if(!active)return;
    setClockRevision(value=>value+1);
    schedule();
   },Math.min(2147483647,Math.max(1,next-now)));
  }
  schedule();
  return()=>{active=false;clearTimeout(timer);};
 },[page,scopeKey]);
 return useMemo(()=>{
  if(!page)return null;
  const originals=visiblePublicOriginals(page.originals);
  // Raw retained originals stay unchanged, solely for newest-version selection.
  return originals===page.originals?page:{...page,originals};
 },[page,scopeKey,clockRevision]);
}
