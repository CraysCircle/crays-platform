import {useState} from 'react';
import {Receipt,ArrowDown,ArrowUpRight,CaretRight,Lightning,BookOpen,CalendarBlank,Trophy,DownloadSimple,ArrowLeft,ShieldCheck} from '@phosphor-icons/react';
import {KeyboardInput,useKeyboard} from './mobile';
import type {ProductWorld} from './productModel';
import {creatorIncomeExample,creatorIncomeExampleText,incomeUSD} from './creatorIncomeExample';
import './creator-income.css';

/** Mount inside the existing revenue MobileScroll: no second scroll container or payment authority. */
export function CreatorIncomeStatement({world,month,onMonthChange,onOffers,onLibrary,onDownload}:{world:ProductWorld;month:string;onMonthChange:(month:string)=>void;onOffers:()=>void;onLibrary:()=>void;onDownload:(text:string)=>void}){
 const keyboard=useKeyboard(),[shown,setShown]=useState(''),[selected,setSelected]=useState('');
 const period=/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)?month:new Date().toISOString().slice(0,7),key=`${world.owner}:${period}`;
 const statement=world.identity.signedIn&&shown===key?creatorIncomeExample(world.owner,period):undefined,line=statement?.rows.find(r=>r.id===selected);
 const go=(fn:()=>void)=>{keyboard.hide();fn();};
 return <section className="creator-income" aria-label="Creator income statement"><p className="eyebrow">YOUR CREATOR BUSINESS</p><h1>{line?'One sale. Every detail.':'Your work, accounted for.'}</h1>
 {!world.identity.signedIn?<div className="creator-income-empty"><ShieldCheck size={30}/><h2>Your sales stay private.</h2><p>Sign in to review your own creator statements.</p></div>:<>
  <div className="creator-income-month"><CalendarBlank size={19}/><label><span>Statement month</span><KeyboardInput type="month" aria-label="Statement month" value={period} onChange={e=>{onMonthChange(e.target.value);setSelected('');}}/></label></div>
  {!statement?<><div className="creator-income-empty"><Receipt size={32}/><h2>Follow what your work earns.</h2><p>Your incoming sales, tips and refunds belong together. No real statement is connected yet.</p><button className="primary" onClick={()=>go(()=>{setShown(key);setSelected('');})}>Explore a statement example<CaretRight size={18}/></button></div><button className="creator-income-row" onClick={()=>go(onOffers)}><BookOpen size={22}/><span><strong>Your offers</strong><small>Content, memberships & conversations</small></span><CaretRight size={18}/></button></>:line?<>
   <button className="creator-income-back" onClick={()=>go(()=>setSelected(''))}><ArrowLeft size={18}/>Back to this statement</button>
   <article className="creator-income-sale"><span className="creator-income-pill">{line.status} · fictional example</span><h2>{line.title}</h2><strong className="creator-income-sale-total">{incomeUSD(line.grossMinor)}</strong><p>{line.type} · {period}-{String(line.day).padStart(2,'0')}</p><dl><div><dt>Gross payment</dt><dd>{incomeUSD(line.grossMinor)}</dd></div><div><dt>Refunded principal</dt><dd>{incomeUSD(line.refundMinor)}</dd></div><div><dt>Provider cost · example</dt><dd>{incomeUSD(line.providerMinor)}</dd></div><div><dt>CRAYS content commission</dt><dd>0%</dd></div><div><dt>Payment route</dt><dd>USD · Stripe · example</dd></div></dl><p className="creator-income-note">{line.status==='Refunded'?'Original sale and full refund retained. The illustrated provider cost remains separate.':'An incoming payment example. No private-chat, publishing or media permission is granted.'}</p><details><summary>Original example reference</summary><p className="creator-income-reference">{line.id}</p><p className="creator-income-note">No actual buyer identity or provider transaction is claimed.</p></details></article>
  </>:<>
   <div className="creator-income-example-label"><span>STATEMENT EXAMPLE</span><button onClick={()=>go(()=>{setShown('');setSelected('');})}>Close example</button></div>
   <div className="creator-income-total"><span>Net sales & tips · example</span><strong>{incomeUSD(statement.netMinor)}</strong><small>After the refunds and provider costs shown below</small></div>
   <dl className="creator-income-summary"><div><dt><ArrowUpRight size={17}/>Gross incoming</dt><dd>{incomeUSD(statement.grossMinor)}</dd></div><div><dt><ArrowDown size={17}/>Refunds</dt><dd>−{incomeUSD(statement.refundMinor)}</dd></div><div><dt><Receipt size={17}/>Provider costs · example</dt><dd>−{incomeUSD(statement.providerMinor)}</dd></div></dl>
   <div className="creator-income-list-heading"><h2>Your activity</h2><span>{statement.rows.length} originals</span></div>
   {statement.rows.map(r=>{const Icon=r.type==='Zap'?Lightning:r.type==='Membership'?CalendarBlank:BookOpen;return <button className="creator-income-row" key={r.id} onClick={()=>go(()=>setSelected(r.id))}><Icon size={22}/><span><strong>{r.title}</strong><small>{r.type} · {r.status} · {period}-{String(r.day).padStart(2,'0')}</small></span><b>{incomeUSD(r.grossMinor)}</b><CaretRight size={17}/></button>;})}
   <section className="creator-income-award"><Trophy size={25}/><div><h2>Your Props share</h2><strong>{incomeUSD(statement.awardAllocationMinor)}</strong><p>Allocated in this example · payout not paid</p><details><summary>See the Props split</summary><p>From {incomeUSD(statement.awardVotePrincipalMinor)} vote principal: 50% nominee, 25% prize draws, 25% event. Separate from net sales and your spendable balance.</p></details></div></section>
   <button className="secondary" onClick={()=>go(()=>onDownload(creatorIncomeExampleText(statement)))}><DownloadSimple size={20}/>Save statement example</button>
   <details className="creator-income-costs"><summary>Fees & statement details</summary><p>CRAYS content sales commission: 0%. The 0.25% ecosystem fee has its own official USD payment review. It is not deducted in crypto or added again to this statement.</p><p>Provider costs here are fictional merchant costs, not a quoted tariff.</p><p className="creator-income-reference">{statement.id}</p></details>
  </>}
  <button className="creator-income-row" onClick={()=>go(onLibrary)}><BookOpen size={22}/><span><strong>Your purchased content</strong><small>Library · separate from creator income</small></span><CaretRight size={18}/></button>
  {statement&&<p className="creator-income-note">Fictional incoming statement. No real income, payout, wallet change or tax invoice.</p>}
 </>}
 </section>;
}
