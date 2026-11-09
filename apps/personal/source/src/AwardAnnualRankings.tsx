import {resolveCraysMedia} from './craysMedia';
import {useState} from 'react';
import {CaretRight,Flag,Trophy} from '@phosphor-icons/react';
import {MobileScroll} from './mobile';
import type {ProductWorld} from './productModel';
import {awardCategories} from './awardCategories';
import {awardReport,awardPublicTop100} from './awardReporting';
import {storyGlobalSource} from './awardStoryReporting';
import {storyCampaignsFor} from './awardStoryRegistry';
import {AwardLiveEventCard} from './AwardLiveEvent';
import './award.css';
export function AwardAnnualRankings({web=false,world,onContest,onEvent}:{web?:boolean;world:ProductWorld;onContest:(id:string)=>void;onEvent:()=>void}){
 const [category,setCategory]=useState('Music');
 const picture=(nomineeId:string)=>resolveCraysMedia(storyCampaignsFor(world).find(c=>c.nominationId===nomineeId)?.image||'web-props-award.webp');
 const source=storyGlobalSource(world),report=awardReport(source,category);
 let publication:ReturnType<typeof awardPublicTop100>|undefined;try{publication=awardPublicTop100(source,category);}catch{}
 return <MobileScroll><main className={web?"award-workspace web-annual-rankings":"award-workspace"} data-testid="award-annual-rankings"><p className="eyebrow">THE YEAR. THE CREATORS. THE RACE.</p><h1>Every contest.<br/>One annual race.</h1>
 <p>Each Prop belongs to its selected contest. Valid contest Props add to that creator’s annual score in this category.</p>
 <label className="product-field"><span>Annual Props category</span><select aria-label="Annual Props category" value={category} onChange={e=>setCategory(e.target.value)}>{awardCategories.map(c=><option key={c}>{c}</option>)}</select></label>
 <p className="award-caption">2026 fictional demo season · Current positions, not final qualification.</p>
 {report.standings.length?<><section className="award-score"><span><strong>{report.standings.length}</strong>seeded category participants</span><span><strong>{report.countedVotes.toLocaleString('en-US')}</strong>valid demo Props across their contests</span></section><h2>The current Top 3.</h2>
 <div className={web?"web-annual-podium":""}>{report.standings.filter(s=>s.rank<=3).map(s=><div className="award-rank" key={s.nomineeId}>{web&&<img src={picture(s.nomineeId)} alt="Illustrative Props season artwork"/>}<b>#{s.rank}</b><Trophy size={25}/><span>{s.nominee}<small>{s.votes.toLocaleString('en-US')} annual Props{s.tied?' · tied':''}</small></span></div>)}
 </div><h2>Road to the Top 100.</h2><p className="award-caption">All {report.standings.length} seeded participants are shown. We do not invent a full field of 100 active nominees.</p>
 {report.standings.map(s=>{const c=storyCampaignsFor(world).find(c=>c.nominationId===s.nomineeId&&c.category===category);return c?<button className="award-rank" key={s.nomineeId} onClick={()=>onContest(c.id)}>{web&&<img src={picture(s.nomineeId)} alt="Illustrative Props season artwork"/>}<b>#{s.rank}</b><span>{s.nominee}<small>{s.votes.toLocaleString('en-US')} annual Props · open their contests</small></span><CaretRight size={20}/></button>:<div className="award-rank" key={s.nomineeId}>{web&&<img src={picture(s.nomineeId)} alt="Illustrative Props season artwork"/>}<b>#{s.rank}</b><span>{s.nominee}<small>{s.votes.toLocaleString('en-US')} annual Props · illustrative rival, no active demo contest</small></span></div>;})}
 {!publication&&<p role="status" className="notice">The current source or boundary ties need review before a final result can be prepared.</p>}
 </>:<section className="award-empty"><Flag size={32}/><h2>This world is waiting.</h2><p>The category is preserved, but no active annual demo race is seeded here.</p></section>}
 <AwardLiveEventCard onOpen={onEvent}/><details className="award-details"><summary>Counting, closing and prizes</summary><p>Only counted orders with a simulated payment and valid simulated proof enter this race. Failed, pending, invalid and reversed attempts never add Props. Multiple posts or screens do not multiply an order.</p><p>The final annual Top 3 receive their prizes at the annual live event. Only the final category winner receives the star and handprint in every global CRAYS Club.</p><p>The season is still open. A current rank grants no prize, ticket, ownership, event entry or permanent honour. Final closing and tie rules require their own release.</p></details></main></MobileScroll>;
}
