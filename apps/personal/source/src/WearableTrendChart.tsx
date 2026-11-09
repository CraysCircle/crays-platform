import {useEffect,useRef,useState} from 'react';
import {CaretLeft,CaretRight,Moon,ArrowUpRight,ChatCircle} from '@phosphor-icons/react';
import {wearableValueUsable,type WearableObservation,type wearableOverview} from './wearableJourney';
import './wearable-trends.css';
type Series=ReturnType<typeof wearableOverview>['series'][number];
const dayMs=86400000;
const dateLabel=(at:number)=>new Date(at).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
const duration=(value:number)=>{const minutes=Math.round(value*60);return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m`;};
const stateLabel=(point:WearableObservation|undefined)=>!point?'No reading':point.state==='EXCLUDED'?'Excluded by you':point.quality==='BLOCKED'?'Not available':point.quality==='STALE'?'Out of date':point.value===null?'No reading':point.quality==='PARTIAL'?'Partial reading':'Recorded';
/** Data chart only: source values and gaps are projected, never synthetic sleep stages. */
export function WearableTrendChart({series,start,onOpen,onAsk}:{series:Series;start:number;onOpen:(id:string)=>void;onAsk:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),[selected,setSelected]=useState(-1);
 const slots=Array.from({length:series.days},(_,i)=>{const at=start+i*dayMs;const points=series.points.filter(p=>Math.floor(p.observedAt/dayMs)===Math.floor(at/dayMs));return {at,point:points.length===1?points[0]:undefined};});
 const usable=series.comparable?series.points.filter(wearableValueUsable):[],average=usable.length?usable.reduce((sum,p)=>sum+p.value!,0)/usable.length:null;
 const index=selected>=0&&selected<slots.length?selected:Math.max(0,slots.reduce((last,s,i)=>s.point&&wearableValueUsable(s.point)?i:last,-1)),chosen=slots[index];
 const current=chosen.point,hasValue=!!current&&series.comparable&&wearableValueUsable(current),delta=series.delta;
 useEffect(()=>setSelected(-1),[start,series.days]);
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  const draw=()=>{const width=element.getBoundingClientRect().width;if(width<=0)return;const height=205,ratio=window.devicePixelRatio||1;element.width=Math.round(width*ratio);element.height=height*ratio;const c=element.getContext('2d');if(!c)return;c.scale(ratio,ratio);c.clearRect(0,0,width,height);
   const left=0,right=32,top=12,bottom=28,plotWidth=width-right,plotHeight=height-top-bottom,step=plotWidth/slots.length;
   const max=Math.max(10,...usable.map(p=>p.value!)),ceiling=Math.ceil(max/2)*2;
   c.font='10px Avenir, sans-serif';c.textAlign='left';c.textBaseline='middle';
   for(let h=0;h<=ceiling;h+=2){const y=top+plotHeight*(1-h/ceiling);c.strokeStyle='#e5ebef';c.lineWidth=1;c.beginPath();c.moveTo(left,y);c.lineTo(plotWidth,y);c.stroke();c.fillStyle='#7b8c96';c.fillText(`${h}h`,plotWidth+9,y);}
   for(let i=0;i<slots.length;i++){const {point,at}=slots[i],x=i*step+step/2,valid=series.comparable&&!!point&&wearableValueUsable(point),barWidth=Math.min(series.days===1?72:26,Math.max(4,step*.62));
    if(i===index){c.fillStyle='#f0f4f6';c.beginPath();c.roundRect(i*step+1,top-6,step-2,plotHeight+12,8);c.fill();}
    if(valid){const h=plotHeight*point.value!/ceiling;c.fillStyle=i===index?'#ff0a46':point.quality==='PARTIAL'?'#7e9aac':'#0b3952';c.beginPath();c.roundRect(x-barWidth/2,top+plotHeight-h,barWidth,h,[5,5,0,0]);c.fill();}
    else{c.strokeStyle='#9aaab5';c.lineWidth=1.5;c.beginPath();c.moveTo(x-3,top+plotHeight-4);c.lineTo(x+3,top+plotHeight-4);c.stroke();}
    if(series.days<=7||i===0||i===slots.length-1||i%7===0){c.textAlign='center';c.fillStyle=i===index?'#0b2533':'#7b8c96';c.font=`${i===index?'700':'400'} 10px Avenir, sans-serif`;c.fillText(String(new Date(at).getUTCDate()),x,height-9);}
   }
  };draw();const observer=new ResizeObserver(draw);observer.observe(element);return()=>observer.disconnect();
 },[series,start,index]);
 return <section className="wellbeing-trend" aria-label="Sleep duration trend" data-testid="wearable-sleep-trend">
  <div className="wellbeing-trend-title"><span><Moon size={20} weight="duotone"/>Time asleep</span><small>Example data</small></div>
  <div className="wellbeing-value" aria-live="polite"><strong>{hasValue?duration(current.value!):'—'}</strong><span>{dateLabel(chosen.at)} · {stateLabel(current)}</span></div>
  <div className={`wellbeing-chart${series.days===1&&!hasValue?' wellbeing-chart-empty':''}`}><canvas ref={canvas} role="img" tabIndex={0} aria-label={`Sleep duration, ${series.days} ${series.days===1?'day':'days'}. ${usable.length} usable readings. Use left and right arrow keys to select a day.`} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();setSelected(e.key==='Home'?0:e.key==='End'?slots.length-1:Math.max(0,Math.min(slots.length-1,index+(e.key==='ArrowRight'?1:-1))));}}} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setSelected(Math.max(0,Math.min(slots.length-1,Math.floor((e.clientX-rect.left)/(rect.width-32)*slots.length))));}}/>{series.days===1&&!hasValue&&<div className="wellbeing-no-night"><Moon size={32}/><strong>No sleep reading for this day</strong><span>Choose another day or view the week.</span></div>}</div>
  <div className="wellbeing-date-control"><button aria-label="Previous sleep day" disabled={index===0} onClick={()=>setSelected(index-1)}><CaretLeft size={19}/></button><span>{dateLabel(start)}{series.days>1?` – ${dateLabel(start+(series.days-1)*dayMs)}`:''}<small>UTC · tap a day to explore</small></span><button aria-label="Next sleep day" disabled={index===slots.length-1} onClick={()=>setSelected(index+1)}><CaretRight size={19}/></button></div>
  <div className="wellbeing-stats"><div><span>Average sleep</span><strong>{average===null?'—':duration(average)}</strong></div><div><span>Recorded nights</span><strong>{usable.length}<small> / {series.days}</small></strong></div></div>
  {delta!==null&&<p className="wellbeing-change"><ArrowUpRight size={17}/>{delta>0?'+':delta<0?'−':''}{Math.round(Math.abs(delta)*60)} min <span>first to last recorded night</span></p>}
  {!hasValue&&<div className="wellbeing-gap"><Moon size={21}/><span><strong>{stateLabel(current)}</strong><small>{current?.state==='EXCLUDED'?'This night stays out of your average and Chuck analysis.':'This date has no usable value. It is shown as a gap.'}</small></span></div>}
  <div className="wellbeing-chart-key"><span><i/>Recorded</span><span><i className="partial"/>Partial</span><span><i className="gap"/>Not included</span></div>
  {current&&<button className="wellbeing-source-link" onClick={()=>onOpen(current.id)}>View this night<CaretRight size={18}/></button>}
  <button className="wellbeing-chuck-link" onClick={onAsk}><ChatCircle size={20}/><span>Explore this with Chuck</span><CaretRight size={18}/></button>
  <details className="wearable-details wellbeing-evidence"><summary>Readings & sources</summary><p>Example readings only. Different sources and methods stay separate. Missing or excluded nights are not counted as zero.</p><table><caption>Original readings · UTC</caption><thead><tr><th>Date</th><th>Time asleep</th><th>Status</th></tr></thead><tbody>{series.points.map(point=><tr key={point.id}><td>{dateLabel(point.observedAt)}</td><td>{point.value===null?'—':duration(point.value)}</td><td>{stateLabel(point)}</td></tr>)}</tbody></table><p>{series.source} · {series.method}</p><p>These are descriptive readings, not a diagnosis or a sleep-quality score.</p></details>
 </section>;
}
