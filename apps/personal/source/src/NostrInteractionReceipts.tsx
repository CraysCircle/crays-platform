import {relaySources} from './nostrSources.ts';
import {useState} from 'react';
import type {ProductWorld,ActionResult} from './productModel.ts';
import {interactionRecords,interactionCurrent,interactionReview,type PublicInteraction} from './nostrInteraction.ts';
import './nostr-interaction.css';
type Run=(op:string,data:Record<string,string>,ctx:{featureId:string;objectId?:string})=>ActionResult;
const labels={prepared:'Review before signing',signed:'Signed example · not delivered',submitted:'Awaiting confirmation',unknown:'Outcome unknown',failed:'Delivery failed',accepted:'Accepted example',cancelled:'Unsent example cancelled'};
export function NostrInteractionReceipts({world,postId,run}:{world:ProductWorld;postId:string;run:Run}){
 const rows=interactionRecords(world,postId);if(!rows.length)return null;
 return <section className="nostr-interactions" aria-label="Your public interactions"><h2>Your public actions</h2><p>Review your actions and delivery status. Interactive preview: no real event is sent.</p>{rows.map(r=><Receipt key={`${r.id}:${r.version}`} world={world} record={r} run={run}/>)}</section>;
}
function Receipt({world,record:r,run}:{world:ProductWorld;record:PublicInteraction;run:Run}){
 const [approved,setApproved]=useState(false),[feedback,setFeedback]=useState('');const current=interactionCurrent(world,r),post=current?world.posts.find(p=>p.id===r.postId):undefined;
 const call=(op:string,extra:Record<string,string>={})=>{const result=run(op,{expectedVersion:String(r.version),...extra},{featureId:'AL-107',objectId:r.id});setFeedback(result.message);};
 return <article className="nostr-interaction-record"><h3>{r.action==='Vote'?'Poll vote':r.action==='Like'?(r.enabled?'Reaction':'Remove reaction'):(r.enabled?'Repost':'Remove repost')}</h3><strong role="status">{labels[r.state]}</strong>{post&&<p><strong>{post.title}</strong><br/>{world.people.find(p=>p.id===post.author)?.name||post.author}<br/>Audience: {r.audience}<br/>Destinations: {r.relayIds.map(id=>relaySources(world).find(source=>source.id===id)?.name||id).join(', ')}</p>}<p>{current?'Original and audience match your current access.':'The original or permission changed. New signing and delivery are held.'}</p><details><summary>Event and destinations</summary><dl><dt>Target</dt><dd>{r.targetEvent}</dd><dt>Audience</dt><dd>{r.audience}</dd><dt>Event</dt><dd>{r.eventRef}</dd><dt>Destinations</dt><dd>{r.relayIds.join(', ')}</dd>{r.action==='Vote'&&<><dt>Option</dt><dd>{current?world.posts.find(p=>p.id===r.postId)?.choices?.[r.choice!]:'Unavailable with current access'}</dd></>}</dl></details>
 {r.state==='prepared'&&<><label><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} disabled={!current}/>I approve this exact public action, audience and destinations.</label><button className="primary" disabled={!approved||!current} onClick={()=>call('nostr.interaction.sign',{approved:'Yes',review:interactionReview(world,r)})}>Sign this example</button></>}
 {r.state==='signed'&&<button className="secondary" disabled={!current} onClick={()=>call('nostr.interaction.submit')}>Submit signed example</button>}
 {['submitted','unknown'].includes(r.state)&&<div><p>Explore a local delivery result for this same event.</p>{(['unknown','failed','accepted'] as const).map(outcome=><button key={outcome} className="secondary" disabled={!current} onClick={()=>call('nostr.interaction.outcome',{outcome})}>{outcome==='unknown'?'Explore unknown outcome':outcome==='failed'?'Explore failed delivery':'Explore accepted delivery'}</button>)}</div>}
 {['prepared','signed'].includes(r.state)&&<button className="quiet" onClick={()=>call('nostr.interaction.cancel')}>Cancel unsent example</button>}
 <details><summary>Action history</summary><ol>{r.history.map((h,i)=><li key={i}>{h.state} · {new Date(h.at).toLocaleString('en-US')}</li>)}</ol></details>{feedback&&<p role="status">{feedback}</p>}</article>;
}
