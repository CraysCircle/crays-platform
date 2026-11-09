import {useState} from 'react';
import {Gift,FilmSlate,CheckCircle,CaretRight} from '@phosphor-icons/react';
import {MobileScroll,useKeyboard} from './mobile';
import {VoiceTextarea as KeyboardTextarea} from './VoiceInput';
import {VoiceInput as KeyboardInput} from './VoiceInput';
import type {ProductWorld} from './productModel';
import {awardCampaigns,awardAssets,awardQualifiedVotes,canManageAward,awardMoney,type AwardAsset} from './awardPreview';
import {awardGames,awardEntries,validAwardEntries,saveAwardGame,enterAwardGame,sampleAwardDraw} from './awardGames';
import type {AwardRoute} from './AwardWorkspace';
type Props={world:ProductWorld;update:(fn:(w:ProductWorld)=>ProductWorld)=>void;gameId?:string;campaignId?:string;onOpen:(r:AwardRoute)=>void;onSignIn:()=>void};
export function AwardGameWorkspace({world,update,gameId,campaignId,onOpen,onSignIn}:Props){
 const keyboard=useKeyboard(),[error,setError]=useState(''),[message,setMessage]=useState('');
 const game=awardGames(world).find(g=>gameId?g.id===gameId:g.campaignId===campaignId&&awardCampaigns(world).some(c=>c.id===g.campaignId&&canManageAward(world,c)));
 const campaign=awardCampaigns(world).find(c=>c.id===(campaignId||game?.campaignId));
 const key=`${world.owner}:award-game:${campaignId||gameId}`,d=world.drafts[key]||{};
 const set=(k:string,v:string)=>update(w=>({...w,drafts:{...w.drafts,[key]:{...w.drafts[key],[k]:v}}}));
 const act=(fn:(w:ProductWorld)=>ProductWorld,note:string)=>{keyboard.hide();setError('');let failure='';update(current=>{try{return fn(current);}catch(e){failure=e instanceof Error?e.message:'This action could not be saved.';return current;}});if(failure){setError(failure);setMessage('');}else setMessage(note);};
 const open=(r:AwardRoute)=>{keyboard.hide();onOpen(r);};
 const validVotes=awardQualifiedVotes(world).filter(v=>v.campaignId===game?.campaignId&&v.status==='confirmed-demo'&&v.proof==='verified-preview');
 const entries=game?awardEntries(world).filter(e=>e.gameId===game.id):[],valid=game?validAwardEntries(world,game):[];
 const result=world.objects.find(o=>o.owner===world.owner&&o.kind==='award-preview-draw'&&o.gameId===game?.id);
 if(campaignId&&!world.identity.signedIn)return <MobileScroll><main className="award-workspace"><h1>Your action workspace is private.</h1><button className="primary" onClick={onSignIn}>Sign in to continue</button></main></MobileScroll>;
 return <MobileScroll><main className="award-workspace" data-testid={campaignId?'award-game-editor':'award-game'}>
 {campaignId&&campaign&&canManageAward(world,campaign)?<>
  <FilmSlate size={35} className="award-receipt-icon"/><p className="eyebrow">YOUR CREATOR ACTION</p><h1>Give your crowd<br/>something to play for.</h1><p>{campaign.name} · {campaign.title}</p>
  <label className="product-field"><span>Action format</span><select aria-label="Action format" value={d.type||game?.type||'Challenge'} onChange={e=>set('type',e.target.value)}><option>Challenge</option><option>Prize draw</option></select></label>
  <label className="product-field"><span>Action title</span><KeyboardInput aria-label="Action title" value={d.title??game?.title??''} maxLength={120} onChange={e=>set('title',e.target.value)} onBlur={()=>keyboard.hide()}/></label>
  <label className="product-field"><span>Prize or experience</span><KeyboardTextarea aria-label="Prize or experience" value={d.reward??game?.reward??''} maxLength={700} onChange={e=>set('reward',e.target.value)} onBlur={()=>keyboard.hide()}/></label>
  <label className="product-field"><span>Participation rules</span><KeyboardTextarea aria-label="Participation rules" value={d.rules??game?.rules??''} maxLength={1500} placeholder="Who can enter, what to submit, how the result is decided, deadline and how the reward is delivered." onChange={e=>set('rules',e.target.value)} onBlur={()=>keyboard.hide()}/></label>
  <p className="award-caption">This publishes a fictional action only. The 25% prize pool is a separate earmarked allocation; saving an action does not authorise spending it. Real prize funding, eligibility and rules must be approved before opening real entries.</p>
  {[false,true].map(publish=><button key={String(publish)} className={publish?'primary':'secondary'} onClick={()=>act(w=>saveAwardGame(w,campaignId,{type:(d.type||game?.type||'Challenge') as 'Challenge'|'Prize draw',title:d.title??game?.title??'',reward:d.reward??game?.reward??'',rules:d.rules??game?.rules??''},publish),publish?'Your action is published in this preview.':'Your private action draft is saved.')}>{publish?'Publish action in preview':'Save private action draft'}</button>)}
  {game?.status==='published-demo'&&<button className="award-row" onClick={()=>open({page:'game',id:game.id})}>View your published action<CaretRight size={20}/></button>}
 </>:game?.status==='published-demo'&&campaign?<>
  <Gift size={40} className="award-receipt-icon"/><p className="eyebrow">{game.type.toUpperCase()} · PREVIEW</p><h1>{game.title}</h1><p className="lead">{game.reward}</p><p>{campaign.name} · {campaign.title}</p>
  <section className="award-event"><h2>Before you join.</h2><p>{game.rules}</p><p className="award-caption">A paid vote is not a guaranteed win or a private contact request. This is a local example, with no real entry or prize.</p></section>
  {validVotes.length?<>
   <label className="product-field"><span>Your confirmed Props</span><select aria-label="Props for this action" value={d.voteId||''} onChange={e=>set('voteId',e.target.value)}><option value="">Choose the original receipt</option>{validVotes.map(v=><option key={v.id} value={v.id}>{v.quantity} Props · {awardMoney(v.total,v.asset)} · {v.id.slice(-6)}</option>)}</select></label>
   <label className="product-field"><span>Try an eligibility scenario</span><select aria-label="Eligibility scenario" value={d.eligibility||''} onChange={e=>set('eligibility',e.target.value)}><option value="">Choose a fictional test profile</option><option value="eligible-example">Eligible example profile</option><option value="ineligible-example">Ineligible example profile</option></select></label>
   {game.type==='Challenge'&&<label className="product-field"><span>Your challenge entry</span><KeyboardTextarea aria-label="Your challenge entry" value={d.submission||''} maxLength={1200} placeholder="Describe your creative entry or add a public link in this local preview." onChange={e=>set('submission',e.target.value)} onBlur={()=>keyboard.hide()}/></label>}
   <button className="primary" onClick={()=>act(w=>enterAwardGame(w,game.id,d.voteId||'',d.eligibility as 'eligible-example'|'ineligible-example',d.submission||''),'Your local example entry is saved. No real draw entry or prize is created.')}>Submit preview entry</button>
  </>:<><p>Start with confirmed Props and their verified preview proof for this exact campaign.</p><button className="primary" onClick={()=>open({page:'vote',id:campaign.id})}>Support this campaign</button></>}
  {entries.map(e=><section className="notice" key={e.id}><CheckCircle size={22}/><strong>{valid.some(v=>v.id===e.id)?'Your preview entry is recorded.':'This entry no longer has valid Props.'}</strong><p>{e.quantity} preview entries · Rule version {e.gameVersion}. {e.submission}</p><button className="text-action" onClick={()=>open({page:'receipt',id:e.voteId})}>Original vote receipt <CaretRight size={18}/></button></section>)}
  {world.identity.signedIn&&canManageAward(world,campaign)&&<><h2>Your action overview.</h2><p>{valid.reduce((n,e)=>n+e.quantity,0)} valid entries from this browser’s fictional account. This is not a global participant list.</p>{awardAssets.map(a=><p key={a}>Prize allocation: <strong>{awardMoney(awardQualifiedVotes(world).filter(v=>v.campaignId===game.campaignId&&v.status==='confirmed-demo'&&v.asset===a).reduce((n,v)=>n+v.prizes,0),a)}</strong> from local preview payments.</p>)}{game.type==='Prize draw'&&!result&&<button className="secondary" onClick={()=>act(w=>sampleAwardDraw(w,game.id),'A sample result is recorded. It is not a real or random draw.')}>Preview a sample result</button>}
   {result&&<section className="award-event"><h3>{valid.some(e=>e.id===result.entryId)?'A sample result, ready for review.':'Result requires reconciliation.'}</h3><p>This demonstrates selecting a local example entry. It is not an official winner, random selection, blockchain proof or real prize fulfilment.</p><p className="award-reference">{String(result.entryId)}</p></section>}
  </>}
  <button className="award-row" onClick={()=>open({page:'campaign',id:campaign.id})}>Return to the exact campaign<CaretRight size={20}/></button>
 </>:<><h1>This action is not available.</h1><p>It may still be a private draft. No entry is created.</p></>}
 {message&&<p className="notice" role="status">{message}</p>}{error&&<p className="notice" role="alert">{error}</p>}
 <p className="award-preview-note">Fictional clickdummy interaction. No real payment, draw, publication, message, ticket or prize is executed.</p>
 </main></MobileScroll>;
}
