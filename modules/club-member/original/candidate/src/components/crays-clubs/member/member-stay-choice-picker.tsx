"use client";
import {CalendarDays} from "lucide-react";
import {memberProperty} from "./clubs-member-home-model";
import type {MemberStayChoice} from "./member-stay-choice-adapter";
import styles from "./member-complete-workspaces.module.css";

/** Existing mockup styling; explicit identity families preserve original IDs. */
export function MemberStayChoicePicker({choices,value,onChange,disabled=false}:{choices:MemberStayChoice[];value:string;onChange:(key:string)=>void;disabled?:boolean}){
 return <label className={styles.picker}><CalendarDays size={24} aria-hidden/><span className={styles.srOnly}>Choose your stay</span><select value={value} onChange={event=>onChange(event.target.value)} disabled={disabled||!choices.length}><option value="">{choices.length?"All your stays":"No stays to choose yet"}</option>{choices.map(choice=><option key={choice.key} value={choice.key}>{choice.kind==="booking"?(memberProperty(choice.booking.propertyId)?.title??choice.reference):choice.title} · {choice.reference}{choice.kind==="test_stay"?" · TEST":""}</option>)}</select></label>;
}
