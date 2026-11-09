"use client";
import {useState} from 'react';
import {ArrowRight,Search} from 'lucide-react';
import {memberStatus,type MemberWorkspace,type MemberView} from './clubs-member-home-model';
import {searchMemberWorkspace,type MemberSearchKind} from './member-search-model';
import shared from './clubs-member-home.module.css';
import styles from './member-complete-workspaces.module.css';
const categories:Array<{value:MemberSearchKind|'all';label:string}>=[{value:'all',label:'All'},{value:'stays',label:'Stays'},{value:'requests',label:'Requests'},{value:'services',label:'Services'},{value:'conversations',label:'Conversations'},{value:'documents',label:'Documents'},{value:'saved',label:'Saved stays'}];
export function MemberSearchWorkspace({workspace,onView,onRefresh}:{workspace:MemberWorkspace;onView:(view:MemberView,id?:string)=>void;onRefresh:()=>void}){
 const [query,setQuery]=useState('');const [kind,setKind]=useState<MemberSearchKind|'all'>('all');const result=searchMemberWorkspace(workspace,query,kind);
 const labels=(values:MemberSearchKind[])=>values.map(value=>categories.find(c=>c.value===value)?.label??value).join(', ');
 return <section className={styles.panel} aria-label="Search your own account">
  <label className={styles.search}><Search size={23} aria-hidden/><span className={styles.srOnly}>Search your account</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="A stay, a question, a document…"/></label>
  <div className={styles.filters} role="group" aria-label="Search categories">{categories.map(c=><button type="button" key={c.value} aria-pressed={kind===c.value} onClick={()=>setKind(c.value)}>{c.label}</button>)}</div>
  <div role="status" aria-live="polite">{result.loading.length?<p>Still loading: {labels(result.loading)}.</p>:null}{result.unavailable.length?<p>Not connected yet: {labels(result.unavailable)}.{result.connected.length?' Results below cover the connected sections.':''}</p>:null}<p>{!result.connected.length?'We’ll search your details here once they’re connected.':result.total?`${result.total} ${result.total===1?'match':'matches'}${result.total>100?' · showing the first 100':''}.`:query.trim()?'No matches in the connected sections. Try another word?':'Your connected details will appear here.'}</p></div>
  {result.results.length?<ul className={styles.documents}>{result.results.map(r=><li key={r.key}><button type="button" onClick={()=>onView(r.view,r.target??undefined)}><Search size={23} aria-hidden/><span><strong>{r.title}</strong><small>{categories.find(c=>c.value===r.kind)?.label}{r.reference?` · ${r.reference}`:''}{r.status?` · ${memberStatus(r.status)}`:''}</small></span><ArrowRight size={18} aria-hidden/></button></li>)}</ul>:null}
  {result.unavailable.length?<button type="button" className={shared.textAction} onClick={onRefresh}>Reconnect your details <ArrowRight size={17} aria-hidden/></button>:null}
 </section>;
}
