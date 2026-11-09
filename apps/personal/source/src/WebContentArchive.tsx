import {useRef} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X,FileText} from '@phosphor-icons/react';
import './web-content-archive.css';
type Props={open:boolean;title:string;status:string;image?:string;problem:string;onCancel:()=>void;onConfirm:()=>void;onRestoreFocus:()=>void};
/** Own-list review only. Original files, licences and independently held copies are separate. */
export default function WebContentArchive(p:Props){
 const keep=useRef<HTMLButtonElement>(null);
 return <Dialog.Root open={p.open} onOpenChange={open=>{if(!open)p.onCancel();}}><Dialog.Portal><Dialog.Overlay className="web-content-archive-overlay"/><Dialog.Content className="web-content-archive" onOpenAutoFocus={event=>{event.preventDefault();keep.current?.focus();}} onCloseAutoFocus={event=>{event.preventDefault();p.onRestoreFocus();}}><Dialog.Title>Remove this item?</Dialog.Title><Dialog.Close className="web-content-archive-close" aria-label="Close dialog"><X size={24}/></Dialog.Close><div className="web-content-archive-original">{p.image?<img src={p.image} alt=""/>:<FileText size={40}/>}<div><strong>{p.title}</strong><span>{p.status}</span></div></div><Dialog.Description>This removes it from your own list and cancels its active schedule. Public copies, paid licences and files held elsewhere are separate.</Dialog.Description>{p.problem&&<p className="web-content-archive-problem" role="alert">{p.problem}</p>}<footer><button ref={keep} onClick={p.onCancel}>Keep this content</button><button className="web-content-archive-remove" disabled={!!p.problem} onClick={p.onConfirm}>Remove from my list</button></footer></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
