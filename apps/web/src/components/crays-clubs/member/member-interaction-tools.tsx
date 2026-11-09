"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from "react";
import {createPortal} from "react-dom";
import {SlidersHorizontal,RotateCcw,X} from "lucide-react";
import {ColumnResizeGrip} from "./interaction/resize-grip";
import {resizeTableColumns} from "./interaction/table-column-widths";
import styles from "./member-interactions.module.css";

type Size={width?:number;height?:number;columns?:number[]};
type Preferences=Record<string,Size>;
type Target={id:string;label:string;element:HTMLElement;kind:"panel"|"field"|"tabs"|"table"};
type SavedView={name:string;preferences:Preferences};
const bounded=(v:unknown,min:number,max:number):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
/** Own presentation only. Small-field limits match the controller and reload parser. */
export function parseMemberLayout(raw:string):Preferences{
 if(raw.length>30000)return {};
 try{
  const value=JSON.parse(raw);if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length>100)return {};
  const result:Preferences={};
  for(const [key,item] of Object.entries(value)){
   if(!/^(panel|field|tabs|table):[0-9a-f]{8}(?:-[0-9]{1,3})?$/.test(key)||!item||typeof item!=="object"||Array.isArray(item))return {};
   const s=item as Size;
   if(Object.keys(s).some(k=>!["width","height","columns"].includes(k))||s.width!==undefined&&!bounded(s.width,32,2400)||s.height!==undefined&&!bounded(s.height,16,2000)||s.columns!==undefined&&(!Array.isArray(s.columns)||s.columns.length>30||!s.columns.every(n=>bounded(n,32,800))))return {};
   result[key]=s;
  }
  return result;
 }catch{return {};}
}
function parseViews(raw:string):SavedView[]{
 try{
  if(raw.length>360000)return [];
  const value=JSON.parse(raw);if(!Array.isArray(value)||value.length>12)return [];
  const names=new Set<string>();const result:SavedView[]=[];
  for(const v of value){if(!v||Object.keys(v).sort().join(",")!=="name,preferences"||typeof v.name!=="string"||!v.name.trim()||v.name.length>48||names.has(v.name.toLowerCase()))return [];names.add(v.name.toLowerCase());result.push({name:v.name,preferences:parseMemberLayout(JSON.stringify(v.preferences))});}
  return result;
 }catch{return [];}
}
function layoutHash(value:string){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,"0");}
function discover(root:HTMLElement):Target[]{
 const groups:[Target["kind"],string][]=[["panel","#member-content section,#member-content article,aside[aria-label] > section"],["field","#member-content dl > div"],["tabs","#member-content [role=tablist],#member-content [role=tablist] > [role=tab],nav[aria-label=\"Member workspace\"] > button"],["table","#member-content table"]];
 const result:Target[]=[];const seen=new Map<string,number>();
 for(const [kind,selector] of groups){for(const element of Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(e=>!e.closest('[hidden],dialog')&&e.getBoundingClientRect().width>20&&e.getBoundingClientRect().height>10).slice(0,80)){
  const local=(element.getAttribute("aria-label")||element.querySelector("dt,h2,h3")?.textContent||element.querySelector("th")?.textContent||(kind==="tabs"?element.textContent:null)||kind).trim().replace(/\s+/g," ").slice(0,80);
  const container=kind==="panel"?element.parentElement?.closest("article,section,nav"):element.closest("article,section,nav");
  const context=(container?.getAttribute("aria-label")||container?.querySelector("h2,h3")?.textContent||"").trim().replace(/\s+/g," ");
  const article=element.closest("article");const reference=Array.from(article?.querySelectorAll("dl>div")??[]).find(row=>row.querySelector("dt")?.textContent?.trim()==="Test reference")?.textContent??"";
  const base=`${kind}:${layoutHash(context+"|"+local+"|"+reference)}`;const count=seen.get(base)??0;seen.set(base,count+1);
  const label=kind==="field"&&context?`${context} / ${local}`:local;
  result.push({id:count?`${base}-${count}`:base,kind,element,label});
 }}return result;
}
export function MemberInteractionTools({accountId,view,locale}:{accountId:string|null;view:string;locale:string}){
 const [scope,setScope]=useState<string|null>(null),[mode,setMode]=useState(false),[targets,setTargets]=useState<Target[]>([]),[selected,setSelected]=useState(""),[hovered,setHovered]=useState(""),[preferences,setPreferences]=useState<Preferences>({}),[saved,setSaved]=useState<SavedView[]>([]),[naming,setNaming]=useState(false),[name,setName]=useState(""),[notice,setNotice]=useState(""),[revision,setRevision]=useState(0);
 const trigger=useRef<HTMLButtonElement>(null),original=useRef(new Map<HTMLElement,{width:string;height:string;overflow:string;tableLayout:string;columns:string[]}>()),active=useRef(preferences),columnSnapshot=useRef<{id:string;columns?:number[]}|null>(null);
 useLayoutEffect(()=>{active.current=preferences;});
 useEffect(()=>{let live=true;setScope(null);if(accountId)void crypto.subtle.digest("SHA-256",new TextEncoder().encode(accountId)).then(bytes=>{if(live)setScope(Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,"0")).join(""));});return()=>{live=false;};},[accountId]);
 const key=scope?`crays.member.layout.v2:${scope}:${locale}:${view}`:null;
 const restoreOriginal=useCallback(()=>{for(const [element,prior] of original.current){element.style.width=prior.width;element.style.height=prior.height;element.style.overflow=prior.overflow;element.style.tableLayout=prior.tableLayout;Array.from(element.querySelectorAll<HTMLElement>("thead th,thead td")).forEach((th,i)=>{th.style.width=prior.columns[i]??"";});}original.current.clear();},[]);
 useEffect(()=>{restoreOriginal();setMode(false);setSelected("");setHovered("");setNaming(false);try{setPreferences(key?parseMemberLayout(localStorage.getItem(key)||"{}"):{});setSaved(key?parseViews(localStorage.getItem(key+":views")||"[]"):[]);}catch{setPreferences({});setSaved([]);setNotice("Your browser could not save this layout.");}return restoreOriginal;},[key,restoreOriginal]);
 useEffect(()=>{const root=document.querySelector<HTMLElement>("[data-member-view]");if(!root)return;let queued=false;const update=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;setTargets(discover(root));for(const field of root.querySelectorAll<HTMLElement>("dl > div"))if(!field.title)field.title="Information only. Use the nearby action to make a change.";for(const button of root.querySelectorAll<HTMLButtonElement>("button")){if(button.disabled&&!button.title)button.title="This action is not available in the current state.";else if(!button.disabled&&button.title==="This action is not available in the current state.")button.removeAttribute("title");}});};update();const observer=new MutationObserver(update);observer.observe(root.querySelector("#member-content")||root,{childList:true,subtree:true,attributes:true,attributeFilter:["disabled"]});window.addEventListener("resize",update);return()=>{observer.disconnect();window.removeEventListener("resize",update);};},[view]);
 useEffect(()=>{const root=document.querySelector<HTMLElement>("[data-member-view]");if(!root)return;const hover=(event:PointerEvent)=>{const node=event.target;if(!(node instanceof Element)||node.closest('[data-member-layout-tools]'))return;const match=targets.filter(t=>t.element.contains(node)).sort((a,b)=>a.element.getBoundingClientRect().width*a.element.getBoundingClientRect().height-b.element.getBoundingClientRect().width*b.element.getBoundingClientRect().height)[0];setHovered(match?.id??"");};root.addEventListener("pointerover",hover);return()=>root.removeEventListener("pointerover",hover);},[targets]);
 useLayoutEffect(()=>{for(const target of targets){const element=target.element;if(!original.current.has(element))original.current.set(element,{width:element.style.width,height:element.style.height,overflow:element.style.overflow,tableLayout:element.style.tableLayout,columns:Array.from(element.querySelectorAll<HTMLElement>("thead th,thead td")).map(th=>th.style.width)});const prior=original.current.get(element)!,value=preferences[target.id];element.style.width=value?.width!==undefined?`${value.width}px`:prior.width;element.style.height=value?.height!==undefined?`${value.height}px`:prior.height;element.style.overflow=value?.height!==undefined?"auto":prior.overflow;const columns=Array.from(element.querySelectorAll<HTMLElement>("thead th,thead td"));if(target.kind==="table"&&value?.columns?.length===columns.length){const total=value.columns.reduce((a,b)=>a+b,0);element.style.tableLayout="fixed";columns.forEach((th,i)=>{th.style.width=`${100*value.columns![i]/total}%`;});}else if(target.kind==="table"){element.style.tableLayout=prior.tableLayout;columns.forEach((th,i)=>{th.style.width=prior.columns[i]??"";});}}},[targets,preferences]);
 const persist=(next:Preferences)=>{if(!key)return;try{localStorage.setItem(key,JSON.stringify(next));active.current=next;setPreferences(next);setNotice("Size saved.");}catch{setNotice("Your browser could not save this size.");}};
 const target=targets.find(t=>t.id===selected)??null,hoverTarget=targets.find(t=>t.id===hovered)??null;
 useEffect(()=>{if(!mode&&!hovered)return;const update=()=>setRevision(v=>v+1);const observer=new ResizeObserver(update);if(target)observer.observe(target.element);if(hoverTarget&&hoverTarget!==target)observer.observe(hoverTarget.element);window.addEventListener("scroll",update,true);window.addEventListener("resize",update);return()=>{observer.disconnect();window.removeEventListener("scroll",update,true);window.removeEventListener("resize",update);};},[mode,target,hoverTarget]);
 useEffect(()=>{if(mode&&selected)document.querySelector<HTMLButtonElement>('[data-member-layout-tools] button[role="separator"]')?.focus();},[mode,selected]);
 useEffect(()=>{if(!mode)return;const clear=()=>{setSelected("");setHovered("");setNaming(false);setMode(false);};const outside=(event:PointerEvent)=>{const node=event.target;if(!(node instanceof Element)||node.closest('[data-member-layout-tools]'))return;if(target?.element.contains(node))return;clear();};const escape=(event:KeyboardEvent)=>{if(event.key!=="Escape"||event.defaultPrevented)return;const node=event.target;if(node instanceof Element&&node.closest('[role="separator"]'))return;clear();};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};},[mode,target]);
 const finish=()=>{setMode(false);setSelected("");setHovered("");setNaming(false);trigger.current?.focus();};
 const updateSize=(axis:"width"|"height",value:number|undefined)=>{if(!target)return;const next={...active.current,[target.id]:{...active.current[target.id]}};if(value===undefined)delete next[target.id][axis];else next[target.id][axis]=Math.round(value);persist(next);};
 const reset=()=>{if(!key)return;try{localStorage.removeItem(key);active.current={};setPreferences({});setNotice("Original sizes restored.");}catch{setNotice("Your browser could not restore this layout.");}};
 const rect=mode&&target?target.element.getBoundingClientRect():null,hoverRect=hoverTarget?hoverTarget.element.getBoundingClientRect():null;void revision;
 const size=target?preferences[target.id]??{}:{},columns=target?.kind==="table"?Array.from(target.element.querySelectorAll<HTMLElement>("thead th,thead td")):[];
 const changeColumn=(index:number,value:number|undefined)=>{if(!target)return;const next={...active.current,[target.id]:{...active.current[target.id]}};if(value===undefined){delete next[target.id].columns;persist(next);return;}if(!columnSnapshot.current)columnSnapshot.current={id:target.id,columns:active.current[target.id]?.columns?.slice()};const widths=columns.map(th=>th.getBoundingClientRect().width),resized=resizeTableColumns(widths,index,value,32,800,[]);if(resized.length!==columns.length)return;const residual=widths.reduce((a,b)=>a+b,0)-resized.reduce((a,b)=>a+b,0),peer=resized.findIndex((_,i)=>i!==index&&bounded(resized[i]+residual,32,800));if(peer>=0)resized[peer]+=residual;next[target.id].columns=resized;persist(next);};
 const cancelColumns=()=>{const snapshot=columnSnapshot.current;if(!snapshot)return;const next={...active.current,[snapshot.id]:{...active.current[snapshot.id]}};if(snapshot.columns)next[snapshot.id].columns=snapshot.columns;else delete next[snapshot.id].columns;columnSnapshot.current=null;persist(next);};
 const saveView=()=>{const clean=name.trim();if(!key||!clean||saved.length>=12||saved.some(v=>v.name.toLowerCase()===clean.toLowerCase())){setNotice("Choose a unique name. Up to 12 views.");return;}try{const next=[...saved,{name:clean,preferences:active.current}];localStorage.setItem(key+":views",JSON.stringify(next));setSaved(next);setName("");setNaming(false);setNotice("View saved.");}catch{setNotice("Your browser could not save this view.");}};
 return <>
  <button ref={trigger} className={styles.customize} type="button" onClick={()=>mode?finish():setMode(true)} disabled={!scope} aria-pressed={mode} aria-label="Adjust page layout" title="Adjust sizes directly on the page"><SlidersHorizontal size={19} aria-hidden/><span>Adjust layout</span></button>
  {(mode||hovered)&&createPortal(<div className={styles.overlay} data-member-layout-tools>
   {mode?<div className={styles.inlineToolbar} role="group" aria-label="Page layout controls">
    <select aria-label="Choose area to resize" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose an area</option>{targets.map(t=><option key={t.id} value={t.id}>{t.label}{t.kind==="field"?" · Information":""}</option>)}</select>
    <button type="button" onClick={reset} aria-label="Restore original sizes" title="Restore original sizes"><RotateCcw size={16}/></button>
    <button type="button" onClick={()=>setNaming(v=>!v)} title="Save this layout">Save view</button>
    {saved.length>0?<select aria-label="Saved layouts" defaultValue="" onChange={e=>{const item=saved.find(v=>v.name===e.target.value);if(item)persist(item.preferences);e.target.value="";}}><option value="">Your views</option>{saved.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select>:null}
    <button type="button" onClick={finish} aria-label="Finish adjusting layout" title="Done"><X size={16}/></button>
    {naming?<form onSubmit={e=>{e.preventDefault();saveView();}}><input aria-label="Layout name" placeholder="Name this view" maxLength={48} value={name} onChange={e=>setName(e.target.value)}/><button type="submit" disabled={!name.trim()}>Save</button></form>:null}
    <span className={styles.srOnly} role="status">{notice}</span>
   </div>:null}
   {hoverTarget&&hoverRect&&hovered!==selected?<button className={styles.inlineChoose} type="button" style={{left:Math.max(4,Math.min(window.innerWidth-32,hoverRect.right-24)),top:Math.max(4,hoverRect.top+4)}} aria-label={`Resize ${hoverTarget.label}`} title={`Resize ${hoverTarget.label}${hoverTarget.kind==="field"?" · information only":""}`} onClick={()=>{setSelected(hoverTarget.id);setMode(true);}}><SlidersHorizontal size={15}/></button>:null}
   {rect&&target?<>
    <div className={styles.outline} style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height} as CSSProperties}/>
    {target.kind!=="table"?<>
     <ColumnResizeGrip accessibleLabel={`Resize ${target.label} width`} label={target.label} ariaControls={target.element.id||undefined} size={rect.width} stored={size.width} min={32} max={Math.max(32,Math.min(2400,window.innerWidth-32,target.element.parentElement?.getBoundingClientRect().width??window.innerWidth))} onSize={v=>updateSize("width",v)} onReset={()=>updateSize("width",undefined)} cancelToken={view+":"+selected} persistenceHint="Saved in this browser." className={styles.gripX+" "+styles.grip}/>
     <ColumnResizeGrip axis="y" accessibleLabel={`Resize ${target.label} height`} label={target.label} size={rect.height} stored={size.height} min={16} max={2000} onSize={v=>updateSize("height",v)} onReset={()=>updateSize("height",undefined)} cancelToken={view+":"+selected} persistenceHint="Saved in this browser." className={styles.gripY+" "+styles.grip}/>
    </>:columns.map((th,index)=>{const b=th.getBoundingClientRect(),label=th.textContent?.trim()||`Column ${index+1}`;return <span key={index} className={styles.columnAnchor} style={{left:b.right-5,top:b.top+Math.max(0,(b.height-36)/2)}}><ColumnResizeGrip accessibleLabel={`Resize ${label} column`} label={label} size={b.width} stored={size.columns?.[index]} min={32} max={800} onSize={v=>changeColumn(index,v)} onReset={()=>{columnSnapshot.current=null;changeColumn(index,undefined);}} onCommit={()=>{columnSnapshot.current=null;}} onCancel={cancelColumns} cancelToken={view+":"+selected} className={styles.grip+" "+styles.columnGrip}/></span>;})}
    <style>{`.${styles.gripX}{left:${rect.right-5}px;top:${rect.top+rect.height/2-18}px}.${styles.gripY}{left:${rect.left+rect.width/2-18}px;top:${rect.bottom-5}px}`}</style>
   </>:null}
  </div>,document.body)}
 </>;
}
