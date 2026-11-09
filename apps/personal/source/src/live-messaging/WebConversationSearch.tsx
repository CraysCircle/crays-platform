import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import type {HumanConversationClient} from './humanConversationClient.mjs';
import {searchConversationMessages} from './conversationSearch.mjs';

export function WebConversationSearch({client,ownPubkey,authorName,onJump,onClose}:{client:HumanConversationClient;ownPubkey:string;authorName:(pubkey:string)=>string;onJump:(id:string)=>void;onClose:()=>void}){
 const snapshot=useSyncExternalStore(client.subscribe,client.getSnapshot,client.getSnapshot);
 const [query,setQuery]=useState(''),[selected,setSelected]=useState(''),[searching,setSearching]=useState(false),[searchProblem,setSearchProblem]=useState('');const input=useRef<HTMLInputElement>(null),generation=useRef(0);
 useEffect(()=>{input.current?.focus();},[]);
 useEffect(()=>()=>{generation.current++;},[client]);
 const {matches,total}=searchConversationMessages(snapshot,query),index=matches.findIndex(row=>row.id===selected);
 const jump=(id:string)=>{setSelected(id);onJump(id);};
 const cancel=()=>{generation.current++;setSearching(false);setSearchProblem('');};
 const searchEarlier=async()=>{
  if(!client.loadOlder||searching||!client.getSnapshot().available)return;const token=++generation.current;setSearching(true);setSearchProblem('');
  const current=()=>generation.current===token&&client.getSnapshot().available;
  try{for(let page=0;page<20&&current()&&client.getSnapshot().hasEarlierMessages;page++){
   await client.loadOlder();if(!current())return;if(client.getSnapshot().problem){setSearchProblem('Earlier messages could not be searched. Your loaded messages have been kept. Try again.');return;}
  }
  if(current()&&client.getSnapshot().hasEarlierMessages)setSearchProblem('More earlier messages remain. Search again to continue.');
  }catch{if(current())setSearchProblem('Earlier messages could not be searched. Your loaded messages have been kept. Try again.');}
  finally{if(generation.current===token)setSearching(false);}
 };
 return <aside className="private-conversation-search" aria-label="Search this conversation" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
 <header><strong>Search conversation</strong><button type="button" aria-label="Close conversation search" onClick={onClose}>×</button></header>
 <label><span className="source-caption">Find a message</span><input ref={input} type="search" aria-label="Find messages in this conversation" maxLength={200} value={query} onChange={event=>{cancel();setQuery(event.target.value);setSelected('');onJump('');}} onKeyDown={event=>{if(event.key==='Enter'&&matches.length){event.preventDefault();jump(matches[(index+1)%matches.length].id);}}}/></label>
 <div className="private-search-summary"><span role="status">{!snapshot.available?'Conversation unavailable':query.trim()?total===0?'No matching messages':`${total} ${total===1?'message':'messages'}`:'Search the messages in this conversation.'}</span>{matches.length>0&&<span><button type="button" aria-label="Previous matching message" disabled={index<=0} onClick={()=>jump(matches[index-1].id)}>↑</button><button type="button" aria-label="Next matching message" disabled={index===matches.length-1} onClick={()=>jump(matches[index+1].id)}>↓</button></span>}</div>
 {snapshot.hasEarlierMessages&&<><p className="source-caption">Earlier messages are not loaded. These results cover loaded messages.</p>{client.loadOlder&&query.trim()&&<div role="group" aria-label="Search older messages"><button type="button" className="secondary" disabled={!snapshot.available||searching||snapshot.loadingEarlier} onClick={()=>void searchEarlier()}>{searching?'Searching earlier messages…':'Search earlier messages'}</button>{searching&&<button type="button" className="secondary" onClick={cancel}>Stop searching</button>}</div>}</>}
 {total>matches.length&&<p className="source-caption">Showing the first {matches.length} matches. Refine your search for more specific results.</p>}
 {snapshot.available&&searchProblem&&<p className="source-caption" role="status">{searchProblem}</p>}
 <div className="private-search-results">{matches.map(row=><button key={row.id} type="button" aria-current={row.id===selected?'true':undefined} onClick={()=>jump(row.id)}><strong>{row.author===ownPubkey||row.author==='self'?'You':authorName(row.author)}</strong><span>{row.excerpt}</span></button>)}</div>
 </aside>;
}
