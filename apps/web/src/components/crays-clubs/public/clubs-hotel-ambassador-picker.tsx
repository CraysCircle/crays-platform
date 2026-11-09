"use client";
import {TodayLocalizedContent} from "./today-localized-content";
import {useEffect,useId,useRef,useState} from "react";
import Link from "next/link";
import {ChevronDown} from "lucide-react";
import styles from "./clubs-hotel-stay-planner.module.css";
// A customer routing preference, never an inferred SaaS party or approval.
export const CRAYS_TEAM_AMBASSADOR_SELECTION="crays-team";
export type HotelAmbassadorChoice = Readonly<{slug:string;name:string}>;
export function HotelAmbassadorPicker({options,value,onChange,applicationHref="/en/apply-directly"}:{applicationHref?:string;options:readonly HotelAmbassadorChoice[];value:string|null;onChange:(slug:string|null)=>void}) {
 const id=useId();const root=useRef<HTMLDivElement>(null);
 const [draft,setDraft]=useState<{selection:string|null;query:string}|null>(null);const [open,setOpen]=useState(false);const [active,setActive]=useState(0);
 // A new authoritative selection invalidates an older search draft immediately.
 // A typed draft belongs to null because typing explicitly clears the selection.
 const currentDraft=draft?.selection===value?draft:null;
 if(draft&&draft.selection!==value)setDraft(null);
 const selectedName=value===CRAYS_TEAM_AMBASSADOR_SELECTION?"Crays Team":options.find(item=>item.slug===value)?.name??"";
 const query=currentDraft?.query??selectedName;
 const searchTerm=currentDraft?.query.trim().toLocaleLowerCase()??"";
 const teamChoice:HotelAmbassadorChoice=options.find(item=>item.slug===CRAYS_TEAM_AMBASSADOR_SELECTION)??{slug:CRAYS_TEAM_AMBASSADOR_SELECTION,name:"Crays Team"};
 const personalChoices=options.filter(item=>item.slug!==CRAYS_TEAM_AMBASSADOR_SELECTION).sort((a,b)=>a.name.localeCompare(b.name,"en"));
 const matches=[teamChoice,...personalChoices].filter(item=>!searchTerm||item.name.toLocaleLowerCase().includes(searchTerm));
 const activeIndex=Math.min(active,Math.max(0,matches.length-1));
 const activeChoice=matches[activeIndex]?.slug;
 useEffect(()=>{if(open&&activeChoice)root.current?.querySelector<HTMLElement>(`[id="${id}-${activeIndex}"]`)?.scrollIntoView({block:"nearest"});},[id,activeIndex,activeChoice,open]);
 const choose=(item:HotelAmbassadorChoice)=>{setDraft(null);onChange(item.slug);setActive(0);setOpen(false);};
 return <TodayLocalizedContent><div className={styles.ambassadorField} ref={root} onBlur={event=>{if(!root.current?.contains(event.relatedTarget as Node|null))setOpen(false);}}>
 <label htmlFor={id}>YOUR AMBASSADOR</label><div className={styles.ambassadorInput}>
 <input id={id} role="combobox" autoComplete="off" placeholder="Search by name" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open&&matches[activeIndex]?`${id}-${activeIndex}`:undefined} value={query} onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onChange={event=>{setDraft({selection:null,query:event.target.value});onChange(null);setActive(0);setOpen(true);}} onKeyDown={event=>{
 if(event.key==="Escape"){setOpen(false);return;}
 if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);setActive(index=>!open?(event.key==="ArrowDown"?0:Math.max(0,matches.length-1)):Math.max(0,Math.min(matches.length-1,Math.min(index,matches.length-1)+(event.key==="ArrowDown"?1:-1))));}
 if(event.key==="Enter"&&open&&matches[activeIndex]){event.preventDefault();choose(matches[activeIndex]);}
 }}/><ChevronDown aria-hidden="true" size={16}/></div><p className={styles.ambassadorAlternative}>No personal Ambassador? <Link href={applicationHref}>Apply through the Crays team</Link>.</p>
 {open?<div className={styles.ambassadorMenu} id={`${id}-list`} role="listbox" aria-label="Matching Ambassadors">{matches.map((item,index)=><button key={item.slug} id={`${id}-${index}`} type="button" role="option" aria-selected={value===item.slug} data-team-choice={item.slug===CRAYS_TEAM_AMBASSADOR_SELECTION?"true":undefined} data-active={activeIndex===index} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item)}>{item.name}</button>)}{!matches.length?<div role="status">{options.length?"No matching Ambassador.":"Ambassador directory is currently unavailable."}<Link href="/en/ambassadors">Find your Ambassador</Link></div>:null}</div>:null}
 </div></TodayLocalizedContent>;
}
