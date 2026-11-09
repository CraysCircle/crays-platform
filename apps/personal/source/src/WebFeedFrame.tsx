import {publicRelayLogos} from './relayBrandAssets';
import {useRef,useEffect,useState,type ReactNode} from 'react';
import {Plus,UsersThree,GlobeHemisphereWest,SlidersHorizontal,MagnifyingGlass,ArrowLeft,ArrowUp,CaretDown} from '@phosphor-icons/react';
import type {ProductWorld} from './productModel';
import type {FeedSourceChoice} from './feedSourceSelection';
import {relaySources} from './nostrSources';
import {resolveCraysMedia} from './craysMedia';
import './web-feed.css';
import './web-nostr-post.css';
import './web-feed-workspace.css';
import './web-feed-context.css';
const workspaceScroll=new Map<string,number>();
type Props={scrollKey?:string;world:ProductWorld;choices:FeedSourceChoice[];selected:string[];onToggle:(id:string)=>void;onManage:()=>void;onCreate:()=>void;onChuck:(draft:string)=>void;publicRelaySettingsHref?:string;publicRelays?:readonly {id:string;name:string;selected:boolean}[];onTogglePublicRelay?:(id:string)=>void;children:ReactNode;mode?:string;kind?:string;onMode?:(value:string)=>void;onKind?:(value:string)=>void;onSearch?:()=>void;onFilters?:()=>void;onLibrary?:()=>void;detail?:ReactNode;onCloseDetail?:()=>void;query?:string;onQuery?:(value:string)=>void;period?:string;onPeriod?:(value:string)=>void;scope?:string;onScope?:(value:string)=>void;contextLinks?:ReactNode;recommendations?:ReactNode;onReels?:()=>void;includeFiltered?:boolean;onIncludeFiltered?:(value:boolean)=>void;sourceStatus?:ReactNode};
/** One reading column and a permanent task context. Selection never grants rights. */
export function WebFeedFrame({world,choices,selected,onToggle,onManage,onCreate,publicRelays,onTogglePublicRelay,publicRelaySettingsHref,children,scrollKey,mode='Latest',kind='All',onMode,onKind,onFilters,detail,onCloseDetail,query='',onQuery,period='Any time',onPeriod,scope='Public Nostr',onScope,contextLinks,recommendations,onReels,includeFiltered=false,onIncludeFiltered,sourceStatus}:Props){
 const context=useRef<HTMLElement>(null),reading=useRef<HTMLElement>(null);
 const root=useRef<HTMLElement>(null),content=useRef<HTMLDivElement>(null),restoring=useRef(false);

 useEffect(()=>{
  const element=root.current,stream=content.current;if(!element||!stream||!scrollKey||detail)return;
  let pending=true;restoring.current=true;
  const scene=element.closest('[data-flow-current]');
  const restore=()=>{if(!pending||scene?.getAttribute('data-flow-current')==='false')return;const top=workspaceScroll.get(scrollKey)||0;if(element.scrollHeight-element.clientHeight+1<top&&stream.querySelector('[data-live-nostr][aria-busy="true"]'))return;element.scrollTop=top;pending=false;restoring.current=false;};
  const cancel=()=>{pending=false;restoring.current=false;};
  const key=(event:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cancel();};
  element.addEventListener('wheel',cancel,{passive:true});element.addEventListener('touchstart',cancel,{passive:true});element.addEventListener('pointerdown',cancel);element.addEventListener('keydown',key);
  const observer=new MutationObserver(restore);observer.observe(stream,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-busy']});
  const sceneObserver=new MutationObserver(()=>{if(scene?.getAttribute('data-flow-current')==='true'){pending=true;restoring.current=true;restore();}});if(scene)sceneObserver.observe(scene,{attributes:true,attributeFilter:['data-flow-current']});
  restore();return()=>{observer.disconnect();sceneObserver.disconnect();element.removeEventListener('wheel',cancel);element.removeEventListener('touchstart',cancel);element.removeEventListener('pointerdown',cancel);element.removeEventListener('keydown',key);restoring.current=false;};
 },[scrollKey,!!detail]);
 useEffect(()=>{if(detail)root.current?.scrollTo({top:0});},[!!detail]);
 const remember=()=>{const element=root.current;if(!element||!scrollKey||detail||restoring.current||element.closest('[data-flow-current]')?.getAttribute('data-flow-current')==='false')return;workspaceScroll.delete(scrollKey);workspaceScroll.set(scrollKey,element.scrollTop);while(workspaceScroll.size>128)workspaceScroll.delete(workspaceScroll.keys().next().value!);};
 const [expandedGroups,setExpandedGroups]=useState<readonly string[]>([]);
 const relays=relaySources(world);
 const picture=(source:FeedSourceChoice)=>{const relay=relays.find(r=>r.id===source.id);return resolveCraysMedia(relay?.venueId?world.venues.find(v=>v.id===relay.venueId)?.image:relay?.personId?world.people.find(p=>p.id===relay.personId)?.avatar:'');};
 const categories=[['Space','Your Spots'],['Creator','Your creators'],['Circle','Your Circles']] as const;
 return <main ref={root} onScroll={remember} className={'web-feed-page web-feed-workspace web-feed-context-layout'+(detail?' has-original':'')} aria-label="Feed">
  <div className="feed-context-skip-links"><button onClick={()=>{context.current?.querySelector<HTMLInputElement>('input[type=search]')?.focus();context.current?.scrollIntoView({block:"start"});}}>Skip to feed controls</button><button onClick={()=>{reading.current?.focus();reading.current?.scrollIntoView({block:"start"});}}>Skip to posts</button></div>
  <section ref={reading} tabIndex={-1} className="web-feed-reading-column" aria-label={detail?'Original and discussion':'Feed originals'}>
   <h1 className="crays-screen-reader-only">{detail?'Original post':'Feed'}</h1>
   <div ref={content} className="web-feed-workspace-stream" hidden={!!detail}>{children}</div>
   {detail&&<div className="web-feed-context-original"><header className="feed-context-original-heading"><button onClick={onCloseDetail}><ArrowLeft size={19}/>Back to feed</button></header>{detail}</div>}
  </section>
  <aside ref={context} tabIndex={-1} className="web-feed-context" aria-label="Your feed controls and context">
   <header className="feed-context-heading"><h2>Your feed</h2><button className="web-feed-create" onClick={onCreate}><Plus size={18}/>Create</button></header>

   <div className="feed-context-controls">
    <label className="feed-context-search"><MagnifyingGlass size={19}/><span className="crays-screen-reader-only">Search this feed</span><input type="search" placeholder="Search this feed" value={query} onChange={e=>onQuery?.(e.target.value)}/></label>
    <div className="feed-context-selects"><label>View<select value={mode==='All'?'Latest':mode} onChange={e=>onMode?.(e.target.value)}>{['Latest','Following','Communities','Topics','For you','Creators','Circles','Replies','Your posts'].map(value=><option key={value}>{value}</option>)}</select></label><label>Format<select value={kind} onChange={e=>onKind?.(e.target.value)}>{[['All','All formats'],['Note','Text'],['Image','Photos'],['Video','Videos'],['Audio','Audio'],['Article','Articles'],['Live','Live'],['Poll','Polls']].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></div>
    <details className="feed-context-options"><summary><SlidersHorizontal size={17}/>Feed options<CaretDown size={14}/></summary><div>
      <label className="feed-context-select">Posted within<select value={period} onChange={e=>onPeriod?.(e.target.value)}>{['Any time','Last 24 hours','Last 7 days'].map(value=><option key={value}>{value}</option>)}</select></label>
      <button className="feed-context-text-action" onClick={onFilters}>More filters</button>
      {onIncludeFiltered&&scope==='Public Nostr'&&<label className="feed-context-check"><input type="checkbox" checked={includeFiltered} onChange={e=>onIncludeFiltered(e.target.checked)}/><span>Include link lists &amp; app messages</span></label>}
      <p className="source-caption">Posts without a readable profile name are hidden.</p>
    </div></details>
   </div>
   <section className="feed-context-section" aria-label="Sources"><header><h3>Sources</h3><label className="feed-context-scope-select"><span className="crays-screen-reader-only">Read from</span><select value={scope} onChange={e=>onScope?.(e.target.value)}><option>Public Nostr</option><option>Your network</option></select></label><button className="feed-context-text-action" onClick={onManage}>Settings</button></header>
    {categories.map(([category,label])=>{const group=choices.filter(source=>source.category===category);const expanded=expandedGroups.includes(category);const shown=group.filter((source,index)=>expanded||category!=='Circle'&&index<1);return <fieldset className="feed-context-source-group" key={category}><legend><span>{label}</span>{group.length>shown.length||expanded?<button aria-expanded={expanded} onClick={()=>setExpandedGroups(groups=>expanded?groups.filter(id=>id!==category):[...groups,category])}>{expanded?'Less':category==='Circle'?'Choose':'More'}<CaretDown size={14}/></button>:null}</legend>{shown.map(source=><label className="feed-context-source" key={source.id}><input type="checkbox" checked={scope==='Your network'&&selected.includes(source.id)} onChange={()=>onToggle(source.id)}/>{picture(source)?<img src={picture(source)} alt="" className={category==='Creator'?'is-person':''}/>:<UsersThree size={24}/>}<span>{source.name}</span></label>)}{!group.length&&<p className="source-caption">No available sources.</p>}</fieldset>;})}
    <fieldset className="feed-context-source-group feed-context-public-relays"><legend><span>Public Nostr</span>{publicRelaySettingsHref&&<a href={publicRelaySettingsHref} onClick={event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onManage();}}}>Manage relays</a>}</legend>{publicRelays?.map(relay=><label className="feed-context-source" key={relay.id}><input type="checkbox" checked={scope==='Public Nostr'&&relay.selected} onChange={()=>onTogglePublicRelay?.(relay.id)}/>{Object.hasOwn(publicRelayLogos,relay.id)?<img src={publicRelayLogos[relay.id as keyof typeof publicRelayLogos]} alt=""/>:<GlobeHemisphereWest size={24}/>}<span>{relay.name}</span></label>)}</fieldset>
    {sourceStatus&&<div className="feed-context-source-status">{sourceStatus}</div>}
   </section>
   <nav className="feed-context-section feed-context-destinations" aria-label="Explore more"><h3 className="demo-context-entry">Explore more </h3>{onReels&&<button onClick={onReels}>Reels<ArrowUp size={16} style={{transform:'rotate(45deg)'}}/></button>}{contextLinks}</nav>
   {recommendations}
  </aside>
 </main>;
}
