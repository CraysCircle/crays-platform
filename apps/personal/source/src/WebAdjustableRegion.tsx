"use client";
import {Children,Fragment,isValidElement,useCallback,useId,useLayoutEffect,useRef,useState,useSyncExternalStore,type ReactNode} from "react";
import {ArrowCounterClockwise as RotateCcw} from "@phosphor-icons/react";
import {ColumnResizeGrip} from "./WebResizeGrip";
import {readPanelArrangement,type PanelSize,type PanelArrangement} from "./webPanelArrangement";
import {ClubSortableRegion} from "./WebSortableRegion";
import "./web-adjustable.css";
function listen(fn:()=>void){window.addEventListener('storage',fn);window.addEventListener('crays:panel-arrangement',fn);return()=>{window.removeEventListener('storage',fn);window.removeEventListener('crays:panel-arrangement',fn);};}
const empty=()=>'';
function flatten(children:ReactNode):ReactNode[]{return Children.toArray(children).flatMap(child=>isValidElement<{children?:ReactNode}>(child)&&child.type===Fragment?flatten(child.props.children):[child]);}
function Frame({label,size,minWidth,children,onSize}:{label:string;size:PanelSize;minWidth:number;children:ReactNode;onSize:(axis:'width'|'height',v:number|undefined)=>void}){
 const ref=useRef<HTMLDivElement>(null),id=useId();const [box,setBox]=useState({width:minWidth,height:100});
 useLayoutEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(()=>{const r=node.getBoundingClientRect();setBox(old=>old.width===Math.round(r.width)&&old.height===Math.round(r.height)?old:{width:Math.round(r.width),height:Math.round(r.height)});});observer.observe(node);return()=>observer.disconnect();},[]);
 return <div ref={ref} className="club-adjustable-frame" data-panel-label={label} style={{height:size.height}}>
  <div id={id} className="club-adjustable-content" data-sized={size.height!==undefined}>{children}</div>
  <ColumnResizeGrip label={label} accessibleLabel={'Resize '+label+' width'} ariaControls={id} size={box.width} stored={size.width} min={minWidth} max={2400} onSize={v=>onSize('width',v===undefined?undefined:Math.round(v))} onReset={()=>onSize('width',undefined)} persistenceHint="Saved in this browser. Double-click to restore the default width." className="club-panel-resize club-panel-resize-x"/>
  <ColumnResizeGrip axis="y" label={label} accessibleLabel={'Resize '+label+' height'} ariaControls={id} size={box.height} stored={size.height} min={100} max={2000} onSize={v=>onSize('height',v===undefined?undefined:Math.round(v))} onReset={()=>onSize('height',undefined)} persistenceHint="Saved in this browser. Double-click to restore the default height." className="club-panel-resize club-panel-resize-y"/>
 </div>;
}
/** Reuses the existing drag/keyboard and resize controllers; defaults retain the reference grid. */
export function ClubAdjustableRegion({id,labels,children,className='',view,minWidth=280,basis,itemIds,retainedItemIds,legacy}:{id:string;labels:readonly string[];children:ReactNode;className?:string;view?:string;minWidth?:number;basis?:readonly string[];itemIds?:readonly string[];retainedItemIds?:readonly string[];legacy?:{key:string;map:(raw:string)=>string}}){
 const key='crays.panel-arrangement.v1:'+id,read=useCallback(()=>{try{const saved=window.localStorage.getItem(key);return saved!==null?saved:legacy?legacy.map(window.localStorage.getItem(legacy.key)??''):'';}catch{return '';}},[key,legacy]);
 const raw=useSyncExternalStore(listen,read,empty),nodes=flatten(children),ids=itemIds&&itemIds.length===nodes.length&&new Set(itemIds).size===itemIds.length?[...itemIds]:nodes.map((_,i)=>String(i));
 const allIds=retainedItemIds&&ids.every(id=>retainedItemIds.includes(id))?[...retainedItemIds]:ids;
 const state=readPanelArrangement(raw,allIds),current=useRef(state);useLayoutEffect(()=>{current.current=state;});
 const [notice,setNotice]=useState('');
 function persist(next:PanelArrangement|null,explicitReset=false){if(next){const sizes=Object.fromEntries(Object.entries(next.sizes).filter(([,size])=>size.width!==undefined||size.height!==undefined));next=Object.keys(sizes).length===0&&next.order.length===allIds.length&&next.order.every((value,index)=>value===allIds[index])?null:{...next,sizes};}if(!explicitReset&&JSON.stringify(next??readPanelArrangement('',allIds))===JSON.stringify(current.current))return;try{const baseline=legacy?readPanelArrangement(legacy.map(window.localStorage.getItem(legacy.key)??''),allIds):null;const restoresInherited=legacy&&!explicitReset&&JSON.stringify(next??readPanelArrangement('',allIds))===JSON.stringify(baseline);if(restoresInherited)window.localStorage.removeItem(key);else if(next)window.localStorage.setItem(key,JSON.stringify(next));else if(legacy)window.localStorage.setItem(key,JSON.stringify(readPanelArrangement('',allIds)));else window.localStorage.removeItem(key);current.current=next??readPanelArrangement('',allIds);window.dispatchEvent(new Event('crays:panel-arrangement'));setNotice(next?'Layout saved in this browser.':'Default layout restored.');}catch{setNotice('Could not save the layout in this browser.');}}
 const custom=Object.values(state.sizes).some(s=>s.width!==undefined);
 return <div className="club-adjustable-region" data-arrangement={id}>
  {raw&&<button type="button" className="club-panel-reset" aria-label={'Reset '+labels.slice(0,2).join(' and ')+' layout'} title="Restore default sizes and order" onClick={()=>persist(null,true)}><RotateCcw size={12}/>Reset layout</button>}
  <ClubSortableRegion id={id} label={labels.slice(0,2).join(' and ')} compact controlled={{order:state.order,changed:false,onChange:order=>{let index=0;const combined=current.current.order.map(value=>ids.includes(value)?order[index++]:value);persist({...current.current,order:combined});},onReset:()=>persist(null,true)}} blocks={nodes.map((node,i)=>({id:ids[i],label:labels[i]??'Panel '+(i+1),className:'club-adjustable-block',style:custom?{flexBasis:state.sizes[ids[i]]?.width??basis?.[i]??'0px',flexGrow:state.sizes[ids[i]]?.width===undefined?1:0,flexShrink:1,minWidth:`min(100%, ${minWidth}px)`,maxWidth:'100%'}:undefined,content:<Frame label={labels[i]??'Panel '+(i+1)} size={state.sizes[ids[i]]??{}} minWidth={minWidth} onSize={(axis,v)=>{const sizes={...current.current.sizes},size={...sizes[ids[i]]};if(v===undefined)delete size[axis];else size[axis]=v;sizes[ids[i]]=size;persist({...current.current,sizes});}}>{node}</Frame>}))} render={blocks=><div className={className+(custom?' club-arrangement-custom':'')} data-view={view}>{blocks}</div>}/>
  <span role="status" className="sr-only">{notice}</span>
 </div>;
}
