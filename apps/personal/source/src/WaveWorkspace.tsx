import WebWaveChat from './WebWaveChat';
import WebWaveRoot from './WebWaveRoot';
import {chatPhotoExampleName,chatPhotoExampleUrl} from './chatPhoto';
import {useEffect,useState,type ReactNode} from 'react';
import {HandWaving,Bluetooth,Airplane,Check,CaretRight,ChatCircle,ShieldCheck} from '@phosphor-icons/react';
import {MobileScroll,useKeyboard} from './mobile';
import {MessageComposer} from './MessageComposer';
import type {ProductWorld} from './productModel';
import {waveSession,wavePeers,waveInvitations,waveCanChat,updateWavePreview,wavePurposes,type WaveAction} from './wavePreview';
import './wave.css';
type Props={web?:boolean;onBack?:()=>void;backLabel?:string;world:ProductWorld;update:(fn:(w:ProductWorld)=>ProductWorld)=>void;asset:(name:string)=>string;onChat:(id:string)=>void;invitationId?:string;connectionContext?:ReactNode};
export function WaveWorkspace({world,update,asset,onChat,invitationId,connectionContext,web=false,onBack,backLabel}:Props){
 const keyboard=useKeyboard();const[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const [purpose,setPurpose]=useState('Socializing'),[error,setError]=useState('');
 const draftKey=`${world.owner}:wave-chat:${invitationId||''}`;const text=world.drafts[draftKey]?.text||'';
 const setText=(value:string)=>update(w=>w.owner!==world.owner||!w.identity.signedIn?w:{...w,drafts:{...w.drafts,[draftKey]:{...(w.drafts[draftKey]||{}),text:value}}});
 const photo=world.drafts[draftKey]?.photo||'';
 const setPhoto=(value:string)=>update(w=>w.owner!==world.owner||!w.identity.signedIn?w:{...w,drafts:{...w.drafts,[draftKey]:{...(w.drafts[draftKey]||{}),photo:value}}});
 const session=waveSession(world,now),peers=wavePeers(world,now),invites=waveInvitations(world);
 const selected=invites.find(i=>i.id===invitationId),person=world.people.find(p=>p.id===selected?.personId);
 const act=(action:WaveAction,data:Parameters<typeof updateWavePreview>[2]={})=>{
  keyboard.hide();setError('');
  let accepted=false,invoked=false;update(current=>{invoked=true;try{if(current.owner!==world.owner||!current.identity.signedIn)throw Error('Your account changed. Reopen your own Wave.');if(['start','stop','sample-peer','sample-incoming','wave'].includes(action)&&waveSession(current)?.id!==session?.id)throw Error('Your Wave session changed. Review the current session first.');const next=updateWavePreview(current,action,data);if(action==='message')next.drafts[draftKey]={text:'',photo:''};accepted=true;return next;}catch(e){setError(e instanceof Error?e.message:'Wave could not be updated.');return current;}});if(!invoked)setError('Your account changed. Reopen your own Wave.');return accepted;
 };
 if(!world.identity.signedIn)return <MobileScroll><div className="detail-content wave-workspace"><h1>Sign in to use Wave.</h1><p>Your Wave invitations and local conversations belong to your signed-in account.</p></div></MobileScroll>;
 if(invitationId&&!selected)return <MobileScroll><div className="detail-content wave-workspace"><h1>This Wave is unavailable.</h1><p>Open a valid invitation in its own account. No conversation is shown.</p></div></MobileScroll>;
 if(web&&!invitationId)return <WebWaveRoot world={world} now={now} purpose={purpose} onPurpose={setPurpose} session={session} peers={peers} invites={invites} asset={asset} act={act} onChat={onChat} onBack={onBack||(()=>{})} backLabel={backLabel} error={error}/>;
 if(web&&invitationId&&selected){const active=waveCanChat(world,invitationId,now);return <WebWaveChat name={person?.name||'Wave conversation'} photo={person?asset(person.avatar):undefined} purpose={String(selected.purpose)} active={active} onBack={onBack||(()=>{})} onLeave={()=>act('peer-left',{invitationId})} onBlock={()=>act('block',{invitationId})} context={connectionContext} error={error} messages={world.objects.filter(o=>o.owner===world.owner&&o.kind==='wave-preview-message'&&o.invitationId===invitationId&&world.objects.filter(x=>x.id===o.id).length===1).map(m=><p className="wave-message" key={m.id}>{String(m.text)}{m.attachment===chatPhotoExampleName&&<img className="chat-sent-photo" src={chatPhotoExampleUrl} alt="Bundled photo example · local preview only"/>}<small>You · Saved in this preview</small></p>)} composer={<MessageComposer photoDraft={photo} onPhotoChange={setPhoto} value={text} onChange={setText} onSend={attachment=>act('message',{invitationId,text:text||'Photo example',...(attachment?{attachment}:{})})} label="Your Wave message" sendLabel="Add preview message" disabled={!active} navigationReserved={false} maxLength={2000}/>}/>;}
 const content = <MobileScroll className={invitationId?'chat-scroll':undefined}><div className="detail-content wave-workspace">
  {invitationId?<>
   <div className="wave-chat-person">{person&&<img className="avatar" src={asset(person.avatar)} alt=""/>}<div><h1>{person?.name||'Wave conversation'}</h1><p>{String(selected?.purpose||'Wave')} · Nearby preview</p></div></div>
   {connectionContext}
   <p className="wave-disclaimer">Local preview conversation. No Bluetooth message is transmitted. Chuck is not a participant.</p>
   {world.objects.filter(o=>o.owner===world.owner&&o.kind==='wave-preview-message'&&o.invitationId===invitationId&&world.objects.filter(x=>x.id===o.id).length===1).map(m=><p className="wave-message" key={m.id}>{String(m.text)}{m.attachment===chatPhotoExampleName&&<img className="chat-sent-photo" src={chatPhotoExampleUrl} alt="Bundled photo example · local preview only"/>}<small>Saved in this preview</small></p>)}
   {waveCanChat(world,invitationId,now)?<>
    <details className="wave-preview-controls"><summary>Preview a connection change</summary><button className="secondary" onClick={()=>act('peer-left',{invitationId})}>Preview the other person leaving</button></details>
   </>:<p className="context-note" role="status">This Wave is no longer active. Your local preview messages remain here, but sending is closed.</p>}
   {selected&&<button className="text-action" onClick={()=>act('block',{invitationId})}>Block this person</button>}
  </>:<>
   <section className={`wave-hero ${session?"wave-hero-compact":""}`}><div className="wave-symbol"><HandWaving size={58} weight="duotone"/></div><span className="eyebrow">A LITTLE HELLO GOES A LONG WAY</span><h1>Good company.<br/>Closer than you think.</h1><p>On a flight. On a train. Between plans.<br/>Say hello to people who choose to wave back.</p><div className="wave-hero-detail"><Bluetooth size={19}/><span>Nearby, on your terms</span><Airplane size={19}/></div></section>
   <p className="wave-disclaimer">Interactive preview · Bluetooth and offline transport are not connected yet.</p>
   {session?<section className="wave-active"><div><span className="wave-status-dot"/><strong>Wave is on</strong><span>{String(session.purpose)}</span></div><button className="text-action" onClick={()=>act('stop')}>Turn off</button></section>:<>
    <label className="product-field"><span>I’m open to</span><select aria-label="Wave purpose" value={purpose} onChange={e=>setPurpose(e.target.value)}>{wavePurposes.map(p=><option key={p}>{p}</option>)}</select></label>
    <p className="source-caption">Only this purpose. Your other visibility choices stay private. This preview lasts 15 minutes.</p>
    <button className="primary" onClick={()=>act('start',{purpose})}><HandWaving size={23}/> Turn on Wave preview</button>
   </>}
   {session&&<>
    <div className="network-heading"><h2>Nearby, by choice.</h2><Bluetooth size={24}/></div>
    {!peers.length&&<div className="wave-empty"><HandWaving size={35}/><h3>A little room for someone new.</h3><p>People appear only when both sides choose the same Wave purpose.</p></div>}
    {peers.map(peer=>{const p=world.people.find(p=>p.id===peer.personId)!;const invite=invites.find(i=>i.peerId===peer.id);return <section className="wave-person" key={peer.id}><img className="avatar" src={asset(p.avatar)} alt=""/><div><h3>{p.name}</h3><p>Open to {String(peer.purpose).toLowerCase()}</p></div>{!invite&&<button className="wave-button" aria-label={`Wave to ${p.name}`} onClick={()=>act('wave',{peerId:peer.id})}><HandWaving size={23}/><span>Wave</span></button>}</section>;})}
    {invites.filter(i=>i.sessionId===session.id).map(i=>{const p=world.people.find(p=>p.id===i.personId);return <section className="wave-invitation" key={i.id}>
     <h3>{i.direction==='incoming'?`${p?.name} waved to you`:`Your Wave to ${p?.name}`}</h3>
     {i.status==='pending'?<><p>{i.direction==='incoming'?'Choose whether to start a Wave conversation.':'Waiting for their answer. No private chat has opened.'}</p><div className="profile-primary-actions">{i.direction==='incoming'?<><button className="primary" onClick={()=>act('accept',{invitationId:i.id})}>Wave back <HandWaving size={20}/></button><button className="secondary" onClick={()=>act('decline',{invitationId:i.id})}>No thanks</button></>:<button className="secondary" onClick={()=>act('withdraw',{invitationId:i.id})}>Withdraw Wave</button>}</div>{i.direction==='outgoing'&&<details className="wave-preview-controls"><summary>Preview their answer</summary><button className="secondary" onClick={()=>act('sample-accept',{invitationId:i.id})}>Preview acceptance</button><button className="secondary" onClick={()=>act('sample-decline',{invitationId:i.id})}>Preview decline</button></details>}</>:waveCanChat(world,i.id,now)?<><p><Check size={17}/> You both waved. Start with a hello.</p><button className="primary" onClick={()=>onChat(i.id)}>Open Wave conversation <CaretRight size={20}/></button></>:<p role="status">{i.status==='declined'?'Wave declined. No chat was opened.':i.status==='withdrawn'?'Wave withdrawn.':i.status==='blocked'?'This person is blocked.':'This Wave has ended.'}</p>}
     <button className="text-action" onClick={()=>act('block',{invitationId:i.id})}>Block this person</button>
    </section>;})}
    <details className="wave-preview-controls"><summary>Try a nearby example</summary><p>Fictional profiles and answers. No person or Bluetooth device is contacted.</p><button className="secondary" onClick={()=>act('sample-peer')}>Preview a nearby person</button><button className="secondary" onClick={()=>act('sample-incoming')}>Preview an incoming Wave</button></details>
   </>}
   {invites.some(i=>i.sessionId!==session?.id)&&<details className="wave-preview-controls"><summary>Previous Waves</summary>{invites.filter(i=>i.sessionId!==session?.id).map(i=><button key={i.id} className="secondary" onClick={()=>onChat(i.id)}>{world.people.find(p=>p.id===i.personId)?.name||"Wave"} · {String(i.status)} <CaretRight size={18}/></button>)}</details>}
   <div className="wave-privacy"><ShieldCheck size={24}/><p>No automatic messages. No Spot check-in. You can stop being visible at any time.</p></div>
  </>}
  {error&&<p className="notice" role="alert">{error}</p>}
 </div></MobileScroll>;
 return invitationId?<div className="chat-screen">{content}<MessageComposer photoDraft={photo} onPhotoChange={setPhoto} value={text} onChange={setText} onSend={attachment=>act('message',{invitationId,text:text||'Photo example',...(attachment?{attachment}:{})})} label="Your Wave message" sendLabel="Add preview message" disabled={!waveCanChat(world,invitationId,now)} navigationReserved={world.identity.signedIn} maxLength={2000}/></div>:content;
}
