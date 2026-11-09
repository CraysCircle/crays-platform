import {Children,cloneElement,isValidElement,useEffect,useId,useRef,type ReactNode,type RefObject} from 'react';
import {CaretRight,ChatCircle,X} from '@phosphor-icons/react';
import './web-chuck-about.css';
type Props={open:boolean;onOpenChange:(open:boolean)=>void;title:string;children:ReactNode;dialogRef:RefObject<HTMLDialogElement|null>;onContinue:()=>void};
/** Existing AI-status disclosure in a transient dialog, never a separate profile page. */
export default function WebChuckAboutDialog({open,onOpenChange,title,children,dialogRef,onContinue}:Props){
 const titleId=useId(),heading=useRef<HTMLHeadingElement>(null);
 const close=()=>{dialogRef.current?.close();onOpenChange(false);};
 useEffect(()=>{const d=dialogRef.current;if(!d)return;if(open&&!d.open){d.showModal();heading.current?.focus();}else if(!open&&d.open)d.close();},[open,dialogRef]);
 useEffect(()=>{const d=dialogRef.current;return()=>{if(d?.open)d.close();};},[dialogRef]);
 useEffect(()=>{if(!open)return;const leave=()=>{dialogRef.current?.close();onOpenChange(false);};window.addEventListener('popstate',leave);window.addEventListener('hashchange',leave);return()=>{window.removeEventListener('popstate',leave);window.removeEventListener('hashchange',leave);};},[open,dialogRef,onOpenChange]);
 const source=Children.toArray(children)[0];
 const nodes=isValidElement<{children?:ReactNode}>(source)?Children.toArray(source.props.children):[];
 const done=nodes.find(n=>isValidElement<{children?:ReactNode}>(n)&&n.type==='button'&&String(n.props.children).trim()==='Done');
 const body=isValidElement(source)?cloneElement(source,undefined,...nodes.filter(n=>n!==done).map(n=>isValidElement<{className?:string;children?:ReactNode}>(n)&&n.type==='button'&&n.props.className==='primary'?cloneElement(n,undefined,<span>{n.props.children}</span>,<CaretRight size={20} aria-hidden="true"/>):n)):children;
 return <dialog ref={dialogRef} className="web-chuck-about" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close();}} onClose={()=>onOpenChange(false)} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <header><h1 id={titleId} ref={heading} tabIndex={-1}>About Chuck</h1><button type="button" aria-label="Close About Chuck" onClick={close}><X size={22}/></button></header>
  <div className="web-chuck-about-body"><div className="web-chuck-about-identity"><img src="/assets/crays/chuck.png" alt=""/><span>Chuck · AI{title!=='Chuck Crays'&&' · '+title}</span></div>{body}</div>
  <footer>{done||<button type="button" className="quiet" onClick={close}>Done</button>}<button type="button" className="web-chuck-about-continue" onClick={()=>{close();onContinue();}}><ChatCircle size={20}/>Continue conversation</button></footer>
 </dialog>;
}
