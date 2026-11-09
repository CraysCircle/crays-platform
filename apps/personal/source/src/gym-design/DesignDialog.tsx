import {useEffect,useRef,type ReactNode} from 'react';

/** Native modal focus containment and Escape handling; never renders an active background dialog. */
export function DesignDialog({titleId,onClose,children}:{titleId:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const previous=document.activeElement;
  const dialog=ref.current;
  dialog?.showModal();
  return()=>{dialog?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()};
 },[]);
 return <dialog ref={ref} aria-labelledby={titleId} className="gym-design-modal" onCancel={event=>{event.preventDefault();onClose()}}>{children}</dialog>;
}
