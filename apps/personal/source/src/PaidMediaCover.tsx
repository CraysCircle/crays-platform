import {LockKey} from '@phosphor-icons/react';
import './paid-media-cover.css';
/** A synthetic mosaic. No original file, URL, poster, alt description or media bytes are used. */
export function PaidMediaCover({compact=false}:{compact?:boolean}){return <div className={`paid-media-cover${compact?' paid-media-cover-compact':''}`} role="img" aria-label="Paid content hidden until access is verified"><span className="paid-media-pixels" aria-hidden="true"/><span className="paid-media-lock"><LockKey size={compact?19:27}/>{!compact&&<><strong>Paid content</strong><small>Unlock after access is verified</small></>}</span></div>;}
