/** Bounded, content-free local diagnostics for the reported whole-page white flash. */
type Entry={at:number;event:string;detail?:string};
type Snapshot={schema:string;events:Entry[]};
const key='crays.view-stability.v1';
let installed=false;
let events:Entry[]=[];
const allowed=/^[a-z0-9:_.-]{1,100}$/i;
function save(){try{sessionStorage.setItem(key,JSON.stringify({schema:'crays.view-stability.v1',events}));}catch{/* Diagnostics never affect admission or rendering. */}}
export function noteViewStability(event:string,detail?:string){if(!allowed.test(event)||detail&&!allowed.test(detail))return;events.push({at:Date.now(),event,...(detail?{detail}:{})});if(events.length>160)events.splice(0,events.length-160);save();}
export function viewStabilitySnapshot():Snapshot{return{schema:'crays.view-stability.v1',events:events.map(e=>({...e}))};}
export function installViewStability(){
 if(installed)return;installed=true;
 try{const old=JSON.parse(sessionStorage.getItem(key)||'null');if(old?.schema==='crays.view-stability.v1'&&Array.isArray(old.events))events=old.events.filter((e:Entry)=>Number.isFinite(e?.at)&&typeof e.event==='string'&&allowed.test(e.event)&&(!e.detail||typeof e.detail==='string'&&allowed.test(e.detail))).slice(-100).map((e:Entry)=>({at:e.at,event:e.event,...(e.detail?{detail:e.detail}:{})}));}catch{}
 Object.defineProperty(window,'__craysViewStability',{value:viewStabilitySnapshot,configurable:true});
 noteViewStability('document-start');
 for(const name of ['pageshow','pagehide','focus','blur','online','offline'])window.addEventListener(name,()=>noteViewStability(name,document.visibilityState));
 document.addEventListener('visibilitychange',()=>noteViewStability('visibility',document.visibilityState));
 const ids=new WeakMap<Element,number>();let count=0,last='';const id=(e:Element|null)=>{if(!e)return 0;if(!ids.has(e))ids.set(e,++count);return ids.get(e)!;};
 const visible=(e:HTMLElement|null)=>{if(!e||getComputedStyle(e).visibility==='hidden')return false;for(let n:HTMLElement|null=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||Number(s.opacity)===0)return false;}return true;};
 window.setInterval(()=>{
  if(document.visibilityState!=='visible')return;
  const root=document.getElementById('root'),chrome=root?.querySelector<HTMLElement>('.desktop-chrome')||null,scene=root?.querySelector<HTMLElement>('[data-flow-current="true"]')||null;
  const state=!root?.childElementCount?'empty-root':!visible(root)?'hidden-root':!chrome?'no-chrome':!visible(chrome)?'hidden-chrome':scene&&!visible(scene)&&!chrome.classList.contains('showing-home')?'hidden-scene':'visible';
  const signature=[state,id(root),id(chrome),id(scene)].join(':');if(signature!==last){last=signature;noteViewStability('view',signature);}
 },500);
}
