import {useLayoutEffect} from 'react';
import {useKeyboard} from './mobile';

/** Fit an active app field in its own scrolling viewport. Never scroll a
 * FlowStack ancestor or move app chrome to compensate for the keyboard. */
export function fitWorkspaceFocus(field:HTMLElement|null=document.activeElement as HTMLElement|null){
 if(!field||!field.matches('input,textarea')||document.activeElement!==field)return;
 const scene=field.closest('[data-flow-current]');
 if(scene&&scene.getAttribute('data-flow-current')!=='true')return;
 const scroll=field.closest<HTMLElement>('[data-testid="mobile-scroll"]');
 const phone=field.closest('[data-phone-screen]');
 if(!scroll||!phone)return;
 const dock=phone.querySelector<HTMLElement>('[data-testid="keyboard-dock"][data-visible="true"]');
 if(!dock)return;
 const viewport=scroll.getBoundingClientRect(),bounds=field.getBoundingClientRect();
 const scale=scroll.clientWidth?viewport.width/scroll.clientWidth:1;
 if(!Number.isFinite(scale)||scale<=0)return;
 const top=viewport.top+12*scale,bottom=Math.min(viewport.bottom,dock.getBoundingClientRect().top)-16*scale;
 if(bottom<=top)return;
 let delta=0;
 if(bounds.height>bottom-top)delta=bounds.top-top;
 else if(bounds.bottom>bottom)delta=bounds.bottom-bottom;
 else if(bounds.top<top)delta=bounds.top-top;
 if(Math.abs(delta)>1)scroll.scrollTop+=delta/scale;
}
export function WorkspaceFocusKeeper(){
 const keyboard=useKeyboard();
 useLayoutEffect(()=>{
  if(!keyboard.visible||!keyboard.focusedElement)return;
  const field=keyboard.focusedElement;
  const fit=()=>fitWorkspaceFocus(field);
  const frame=requestAnimationFrame(fit);
  const timer=setTimeout(fit,360);
  const scroll=field.closest('[data-testid="mobile-scroll"]');
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(fit):null;
  if(scroll)observer?.observe(scroll);
  return()=>{cancelAnimationFrame(frame);clearTimeout(timer);observer?.disconnect();};
 },[keyboard.visible,keyboard.height,keyboard.focusedElement]);
 return null;
}
