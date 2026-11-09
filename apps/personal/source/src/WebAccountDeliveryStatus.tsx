import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Bell,MessageCircle,Monitor,ShieldCheck} from 'lucide-react';
import './web-account-delivery-status.css';
type Permission='unsupported'|NotificationPermission;
function permission():Permission{try{return typeof window==='undefined'||!('Notification' in window)?'unsupported':Notification.permission;}catch{return 'unsupported';}}
/** Browser permission is public local capability information, never account delivery or device approval. */
export default function WebAccountDeliveryStatus({area,onBack,onSettings,onConversations}:{area:'devices'|'notifications';onBack:()=>void;onSettings:()=>void;onConversations:()=>void}){
 const [browserPermission,setBrowserPermission]=useState<Permission>(permission),title=useRef<HTMLHeadingElement>(null);
 const notifications=area==='notifications';
 useEffect(()=>{title.current?.focus({preventScroll:true});},[area]);
 useEffect(()=>{const refresh=()=>setBrowserPermission(permission());window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
 const labels:Record<Permission,string>={unsupported:'Not supported in this browser',default:'Not requested',denied:'Blocked in this browser',granted:'Allowed in this browser'};
 const Icon=notifications?Bell:Monitor;
 return <main className="web-account-delivery-status"><button className="wad-back" type="button" onClick={onBack}><ArrowLeft size={20} aria-hidden="true"/>Back</button><header><span className="wad-icon"><Icon size={28} aria-hidden="true"/></span><h1 ref={title} tabIndex={-1}>{notifications?'Your notification preferences.':'Your trusted devices.'}</h1><p>{notifications?'Choose how updates reach you.':'Review devices before giving them account access.'}</p></header><section className="wad-connection" aria-label={notifications?'Account notification status':'Device approval status'}><ShieldCheck size={26} aria-hidden="true"/><div><h2>{notifications?'Notification preferences are currently unavailable.':'Device approval is currently unavailable.'}</h2><p role="status">{notifications?'No notification preference has been changed. You can continue to read your conversations in CRAYS.':'No device access has been added, approved or removed here.'}</p></div></section>{notifications&&<section className="wad-browser" aria-label="Browser notification permission"><h2>This browser</h2><p><strong>{labels[browserPermission]}</strong></p><p>Browser permission alone does not enable CRAYS notifications. Account delivery also needs to be connected.</p><button className="wad-secondary" type="button" onClick={()=>setBrowserPermission(permission())}>Refresh browser status</button></section>}<footer><button className="wad-primary" type="button" onClick={onConversations}><MessageCircle size={19} aria-hidden="true"/>Open conversations</button><button className="wad-secondary" type="button" onClick={onSettings}>Back to settings</button></footer></main>;
}
