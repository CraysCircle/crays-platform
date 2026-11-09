"use client";
import {useId,useRef,useState} from "react";
import {Plus,X} from "lucide-react";
import {addRecruitmentAudienceLabel,recruitmentAudienceLabels,referenceAudienceSelectionLimit} from "./member-recruitment-audience-text";
import styles from "./member-recruitment-audience.module.css";
/** Visual editor of the existing self-reported text DTO; not native admission. */
export function MemberRecruitmentAudience({label,value,onChange}:{label:string;value:string;onChange(value:string):void}) {
 const inputRef=useRef<HTMLInputElement>(null);
 const id=useId(),labels=recruitmentAudienceLabels(value);
 const [entry,setEntry]=useState(""),[error,setError]=useState("");
 function add(){const result=addRecruitmentAudienceLabel(value,entry);if(result.status==="invalid"){setError(result.reason);return;}onChange(result.value);setEntry("");setError("");requestAnimationFrame(()=>inputRef.current?.focus());}
 if(labels===null)return <div className={styles.field}><label htmlFor={id}>{label}</label><textarea id={id} value={value} onChange={event=>onChange(event.target.value)} aria-describedby={id+"-help"}/><small id={id+"-help"}>Your original audience text is preserved. Use up to five separate labels to show selections.</small></div>;
 return <div className={styles.field}><label htmlFor={id}>{label}</label><div className={styles.editor}>
  <ul aria-label={label+" selections"}>{labels.map((item,index)=><li key={item}><span>{item}</span><button type="button" aria-label={"Remove "+item} onClick={()=>{onChange(labels.filter((_,i)=>i!==index).join(", "));setError("");requestAnimationFrame(()=>inputRef.current?.focus());}}><X size={13} aria-hidden/></button></li>)}</ul>
  <div className={styles.entry}><input ref={inputRef} id={id} value={entry} placeholder={labels.length>=referenceAudienceSelectionLimit?"Five selected":"Add a selection"} disabled={labels.length>=referenceAudienceSelectionLimit} onChange={event=>setEntry(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();add();}}} aria-describedby={id+"-help"} aria-invalid={error?true:undefined}/><button type="button" aria-label={"Add "+label.toLowerCase()+" selection"} disabled={labels.length>=referenceAudienceSelectionLimit} onClick={add}><Plus size={16} aria-hidden/></button></div>
 </div><small id={id+"-help"}>Choose up to five. These are your audience estimates.</small>{error?<p role="alert" className={styles.error}>{error}</p>:null}</div>;
}
