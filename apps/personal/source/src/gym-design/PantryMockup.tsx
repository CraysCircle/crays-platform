import {useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowRight,Plus} from '@phosphor-icons/react';

export type DesignPantryLot={id:string;name:string;amount:string;unit:string;location:string;dateKind:string;date:string;state:'ACTIVE'|'DEPLETED'|'REMOVED'};
const positive=(value:string)=>/^(0|[1-9][0-9]*)(?:\.[0-9]{1,12})?$/.test(value)&&/[1-9]/.test(value);
function calendarDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T00:00:00Z');
 return Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value;
}

/** Local design lots only. Manual ingredients have no asserted wger binding or nutrient evidence. */
export function PantryMockup({onRecipes,lots:controlledLots,onChange}:{onRecipes:()=>void;lots?:DesignPantryLot[];onChange?:Dispatch<SetStateAction<DesignPantryLot[]>>}){
 const [localLots,setLocalLots]=useState<DesignPantryLot[]>([]);
 const lots=controlledLots??localLots;const setLots=onChange??setLocalLots;
 const [name,setName]=useState(''),[amount,setAmount]=useState(''),[unit,setUnit]=useState('g');
 const [location,setLocation]=useState('PANTRY'),[dateKind,setDateKind]=useState('NONE'),[date,setDate]=useState('');
 const [notice,setNotice]=useState(''),[filter,setFilter]=useState('ACTIVE');
 const ready=Boolean(name.trim())&&name.trim().length<=180&&positive(amount)&&Boolean(unit.trim())&&unit.trim().length<=80&&(dateKind==='NONE'||calendarDate(date));
 function transition(id:string,state:DesignPantryLot['state']){
  setLots(values=>values.map(value=>value.id===id?{...value,state}:value));
  setNotice(state==='ACTIVE'?'Example item restored.':state==='DEPLETED'?'Example marked used up.':'Example item removed.');
 }
 return <section><div className="gym-design-section-heading"><div><p className="gym-design-eyebrow">PRIVATE PANTRY</p><h2>What you have</h2></div><span>Local design example</span></div>
  <p className="gym-design-muted">Record exact amounts and the package dates you can verify. Manual entries do not have a verified food or nutrient binding.</p>
  {notice&&<p className="gym-design-notice" role="status">{notice} No original pantry record was changed.</p>}
  <form className="gym-design-form gym-design-panel" onSubmit={event=>{event.preventDefault();if(!ready)return;setLots(values=>[...values,{id:crypto.randomUUID(),name:name.trim(),amount,unit:unit.trim(),location,dateKind,date:dateKind==='NONE'?'':date,state:'ACTIVE'}]);setName('');setAmount('');setDateKind('NONE');setDate('');setNotice('Example item added locally.')}}>
   <h3>Add an ingredient</h3>
   <label>Ingredient<input required maxLength={180} value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. red lentils"/></label>
   <div className="gym-design-form-grid"><label>Exact amount<input required inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="e.g. 0.125"/></label><label>Unit<input required maxLength={80} value={unit} onChange={event=>setUnit(event.target.value)}/></label></div>
   {amount&&!positive(amount)&&<p role="alert">Enter a positive decimal with up to 12 decimal places.</p>}
   <div className="gym-design-form-grid"><label>Stored in<select value={location} onChange={event=>setLocation(event.target.value)}>{['PANTRY','FRIDGE','FREEZER','OTHER'].map(value=><option key={value} value={value}>{value[0]+value.slice(1).toLowerCase()}</option>)}</select></label><label>Package date<select value={dateKind} onChange={event=>{setDateKind(event.target.value);setDate('')}}><option value="NONE">No date</option><option value="BEST_BEFORE">Best before</option><option value="USE_BY">Use by</option></select></label></div>
   {dateKind!=='NONE'&&<label>Date on the package<input type="date" required value={date} onChange={event=>setDate(event.target.value)}/></label>}
   <button className="gym-design-action primary" disabled={!ready}><Plus size={18}/>Add example item</button>
  </form>
  <div className="gym-design-tabs" role="group" aria-label="Pantry item state">{['ACTIVE','DEPLETED','REMOVED','ALL'].map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{({ACTIVE:'Available',DEPLETED:'Used up',REMOVED:'Removed',ALL:'All items'})[value]}</button>)}</div>
  {!lots.some(lot=>filter==='ALL'||lot.state===filter)&&<p>No example items in this view.</p>}
  <div className="gym-design-card-grid">{lots.filter(lot=>filter==='ALL'||lot.state===filter).map(lot=><article key={lot.id} className="gym-design-panel"><h3>{lot.name}</h3><p>{lot.amount} {lot.unit} · {lot.location.toLowerCase()}</p><p className="gym-design-muted">{lot.state==='ACTIVE'?'Available':lot.state==='DEPLETED'?'Used up':'Removed'} · Manual, unbound ingredient</p>{lot.dateKind!=='NONE'&&<p>{lot.dateKind==='USE_BY'?'Use-by date':'Best-before date'} on record: {lot.date}. {lot.dateKind==='USE_BY'?'Follow the package label and storage instructions.':'This is a quality date, not an automatic safety judgement.'}</p>}<div className="gym-design-inline"><button type="button" className="gym-design-action" aria-label={'Mark '+lot.name+' used up'} disabled={lot.state!=='ACTIVE'} onClick={()=>transition(lot.id,'DEPLETED')}>Used up</button><button type="button" className="gym-design-action" disabled={lot.state==='REMOVED'} onClick={()=>transition(lot.id,'REMOVED')}>Remove</button>{lot.state!=='ACTIVE'&&<button type="button" className="gym-design-action" onClick={()=>transition(lot.id,'ACTIVE')}>Restore example</button>}</div></article>)}</div>
  <section className="gym-design-panel"><h3>Cook with what you have</h3><p>Recipe matches need the original ingredient bindings. No verified pantry match is available in this preview.</p><button type="button" className="gym-design-action" onClick={onRecipes}>Browse recipe examples<ArrowRight size={18}/></button></section>
 </section>;
}
