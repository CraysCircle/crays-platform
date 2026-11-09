import {createContext,useContext,useEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {ChatCircle,Heart,Repeat,BookmarkSimple,UsersThree,DotsThree,ShareNetwork,Play,MusicNote,Lightning,X} from '@phosphor-icons/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {MobileScroll} from '../mobile';
import {publicAutomationReason} from './public-feed-quality.mjs';
import {PublicMediaGallery} from './PublicMediaGallery';
import {PublicActionReview} from './WebPublicActionReview';
import {PublicPlaybackProvider} from './PublicPlayback';
import {WebOriginalLayout} from '../WebOriginalLayout';
import {WebContextLink} from '../WebContextLink';
import {createPublicNostrAdapter,createPublicQuoteDraft,createPublicQuoteDraftStore,PUBLIC_RELAYS,DEFAULT_PUBLIC_RELAYS,publicRelayLabel,presentPublicOriginal,presentPrimalCachedOriginal,readPrimalPublicAuthor,presentPublicProfile,createPublicProfileStore,publicNostrLink,remarkPublicNostrReferences,presentPublicComment,publicCommentMatchesTarget,presentPublicFollowing,presentPublicEngagementBatch,readPrimalPublicEngagement,presentPublicZapTarget,presentPublicText,publicSearchMatches,publicExternalURL,
 type PublicPublicationDraft,type PublicCommandAction,type PublicNostrAdapter,type PublicQuery,type PublicFeedSnapshot,type VerifiedPublicOriginal,
 type PublicPostPresentation,type PublicCachedPostPresentation,type PublicAuthorPage,type VerifiedPrimalPublicOriginal,type PublicProfilePresentation,type PublicReadReference,type PublicEngagementPresentation,type PublicCommentTarget,type PrimalReportedEngagement,type PrimalPublicEngagementResult} from './public-feed.mjs';

const PublicRelayContext=createContext<readonly (typeof PUBLIC_RELAYS[number])[]>(DEFAULT_PUBLIC_RELAYS);
type ProfileCache=ReturnType<typeof createPublicProfileStore>;
const PublicProfileCacheContext=createContext<ProfileCache|null>(null);
const PublicQuoteDraftContext=createContext<ReturnType<typeof createPublicQuoteDraftStore>|null>(null);
function newerProfile(next:PublicProfilePresentation,old:PublicProfilePresentation){const a=next.original.event,b=old.original.event;return a.created_at>b.created_at||a.created_at===b.created_at&&a.id<b.id;}
export function PublicRelayProvider({value,scope='',children}:{value:readonly (typeof PUBLIC_RELAYS[number])[];scope?:string;children:ReactNode}){
 const sourceKey=JSON.stringify(value),key=JSON.stringify([scope,sourceKey]);
 // Per mounted CRAYS account/source generation, never a global metadata cache.
 const cache=useMemo(()=>createPublicProfileStore(key),[key]);
 const quoteDrafts=useMemo(()=>createPublicQuoteDraftStore(scope||'isolated-public-view'),[scope]);
 return <PublicRelayContext.Provider value={value}><PublicPlaybackProvider scope={key}><PublicProfileCacheContext.Provider value={cache}><PublicQuoteDraftContext.Provider value={quoteDrafts}>{children}</PublicQuoteDraftContext.Provider></PublicProfileCacheContext.Provider></PublicPlaybackProvider></PublicRelayContext.Provider>;
}
const emptyVersion=()=>0;
function readableProfileName(profile:PublicProfilePresentation|undefined){
 for(const value of [profile?.displayName,profile?.name]){const name=value?.trim();if(name&&!/^[0-9a-f]{64}$/i.test(name)&&!/^(?:nostr:)?(?:npub1|nprofile1)[0-9a-z…_.-]*$/i.test(name))return name;}
 return null;
}
function profileLabel(profile:PublicProfilePresentation|undefined,fallback:string){return readableProfileName(profile)||fallback;}
function useProfileLookup(authors:readonly string[],scope:string,limit=32){
 const inheritedCache=useContext(PublicProfileCacheContext),relays=useContext(PublicRelayContext),authorKey=authors.join(':'),relayKey=JSON.stringify(relays);
 const localCache=useMemo(()=>createPublicProfileStore(JSON.stringify(['isolated',scope,relayKey])),[scope,relayKey]);
 const cache=inheritedCache||localCache;
 const [profileRefresh,setProfileRefresh]=useState(0);
 const revision=useSyncExternalStore(cache.subscribe,cache.getSnapshot,emptyVersion);
 const read=usePublicRead(`public-author-profiles:${cache.scope}:${scope}:${authorKey}`,{content:'profiles',authors:[...authors],limit},authors.length>0,true,undefined,true);
 const received=useMemo(()=>{const result=new Map<string,PublicProfilePresentation>();for(const post of read.snapshot?.posts||[]){try{const profile=presentPublicProfile(post),old=result.get(profile.pubkey);if(!old||newerProfile(profile,old))result.set(profile.pubkey,profile);}catch{}}return result;},[read.snapshot?.posts]);
 useEffect(()=>cache.merge(received),[cache,received]);
 useEffect(()=>{
  if(!authorKey||!relays.includes('wss://relay.primal.net'))return;
  // This request provides signed metadata only. It does not expand the selected
  // post relays or grant any author an authenticated CRAYS identity.
  return cache.acquire({scope:JSON.stringify([scope,profileRefresh]),authors:authorKey.split(':'),relays});
 },[cache,scope,authorKey,relayKey,profileRefresh]);
 const profiles=useMemo(()=>{const result=new Map<string,PublicProfilePresentation>();for(const pubkey of authors){const saved=cache.get(pubkey),fresh=received.get(pubkey);if(fresh&&(!saved||newerProfile(fresh,saved)))result.set(pubkey,fresh);else if(saved)result.set(pubkey,saved);}return result;},[cache,revision,authorKey,received]);
 return {...read,refresh:()=>{read.refresh();setProfileRefresh(value=>value+1);},profiles};
}
export function publicOriginalHasMedia(post:VerifiedPublicOriginal){const view=presentPublicOriginal(post);return view.media.length>0||!!view.coverURL;}
export function publicOriginalIsReply(post:VerifiedPublicOriginal){return post.event.kind===1&&!!presentPublicOriginal(post).thread.parent;}
// Only mounted global feed/reader surfaces may share a read. The complete
// account/query/source key fences this public-only state; last release disposes it.
const sharedPublicReads=new Map<string,{adapter:PublicNostrAdapter;users:number}>();
export function usePublicRead(scope:string,query:PublicQuery,enabled=true,selected=true,relays?:readonly (typeof PUBLIC_RELAYS[number])[],shared=false){
 const inheritedRelays=useContext(PublicRelayContext),selectedRelays=relays??inheritedRelays;
 const key=JSON.stringify([scope,query,enabled,selected,selectedRelays]);
 const [result,setResult]=useState<{key:string;value:PublicFeedSnapshot}|null>(null);
 const current=useRef<{key:string;adapter:PublicNostrAdapter}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let entry=shared?sharedPublicReads.get(key):undefined;
  const first=!entry;
  if(!entry){entry={adapter:createPublicNostrAdapter(),users:0};if(shared)sharedPublicReads.set(key,entry);}
  entry.users++;const adapter=entry.adapter;let active=true;
  current.current={key,adapter};
  const unsubscribe=adapter.subscribe(()=>{if(active)setResult({key,value:adapter.getSnapshot()});});
  setResult({key,value:adapter.getSnapshot()});
  if(first)void adapter.start({...query,scope,relays:selected?[...selectedRelays]:[]}).catch(()=>{});
  return()=>{active=false;if(current.current?.adapter===adapter)current.current=null;unsubscribe();entry!.users--;if(entry!.users===0){adapter.dispose();if(shared&&sharedPublicReads.get(key)===entry)sharedPublicReads.delete(key);}};
 },[key]);
 return {snapshot:enabled&&result?.key===key?result.value:null,
  refresh:()=>{const binding=current.current;if(binding?.key===key)void binding.adapter.refresh(query).catch(()=>{});},
  loadMore:()=>{const binding=current.current;if(binding?.key===key)void binding.adapter.loadMore().catch(()=>{});},
  continueEarlier:()=>{const binding=current.current;if(binding?.key===key)void binding.adapter.continueBeforeCurrentBoundary().catch(()=>{});}};
}
export function usePublicSearchQuery(query:string,scope:string){
 const [search,setSearch]=useState(()=>({scope,value:query.trim()}));
 useEffect(()=>{const timer=setTimeout(()=>setSearch({scope,value:query.trim()}),350);return()=>clearTimeout(timer);},[query,scope]);
 // A different account/profile must never query using the previous context's terms.
 return search.scope===scope?search.value:query.trim();
}
export function useLiveGlobalNostr({enabled,publicSourceSelected,scope,relays,query='',kind='All'}:{enabled:boolean;publicSourceSelected:boolean;scope:string;relays:readonly (typeof PUBLIC_RELAYS[number])[];query?:string;kind?:string}){
 const search=usePublicSearchQuery(query,scope);
 return usePublicRead(scope,{limit:30,...(search?{search}:{}),...(kind==='Article'?{content:'articles' as const}:{})},enabled,publicSourceSelected,relays,true);
}
export function usePublicNostrProfile(pubkey:string,scope:string){
 const read=useProfileLookup([pubkey],scope,1);
 return {...read,profile:read.profiles.get(pubkey)||null};
}
export function usePublicAuthorHistory(pubkey:string,scope:string,section:'authored'|'replies'|'articles',enabled:boolean){
 const relays=useContext(PublicRelayContext),key=JSON.stringify([scope,pubkey,section,enabled,relays]);
 const [revision,setRevision]=useState(0),[state,setState]=useState<{key:string;revision:number;value:PublicAuthorPage|null;failed:boolean}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  const controller=new AbortController();let active=true;
  void readPrimalPublicAuthor({pubkey,relays,section,limit:50,signal:controller.signal}).then(value=>{if(active&&!controller.signal.aborted)setState({key,revision,value,failed:false});}).catch(()=>{if(active&&!controller.signal.aborted)setState({key,revision,value:null,failed:true});});
  return()=>{active=false;controller.abort();};
 },[key,revision]);
 const current=state?.key===key&&state.revision===revision?state:null;
 return {result:enabled?current?.value||null:null,loading:enabled&&relays.includes('wss://relay.primal.net')&&!current,failed:enabled&&!!current?.failed,refresh:()=>setRevision(value=>value+1)};
}
function usePublicProfiles(posts:readonly VerifiedPublicOriginal[],revision=0){
 const authors=[...new Set(posts.map(post=>post.event.pubkey))].sort().slice(0,32);
 return useProfileLookup(authors,`rows:${revision}`).profiles;
}
export function PublicFeedPeople({posts,onAuthor}:{posts:readonly VerifiedPublicOriginal[];onAuthor:(pubkey:string)=>void}){
 const candidates=posts.filter(post=>!presentPublicOriginal(post).mediaRequiresConsent).slice(0,12);
 const profiles=usePublicProfiles(candidates),[dismissed,setDismissed]=useState<readonly string[]>([]);
 const authors=[...new Set(candidates.map(post=>post.event.pubkey))].filter(pubkey=>readableProfileName(profiles.get(pubkey))&&!dismissed.includes(pubkey)).slice(0,3);
 if(!authors.length)return null;
 return <section className="feed-context-section"><h3>People in this feed</h3>{authors.map(pubkey=><div className="feed-context-person" key={pubkey}><WebContextLink route={{name:'publicNostrProfile',id:pubkey}} onOpen={()=>onAuthor(pubkey)}><UsersThree size={28}/><span><strong>{readableProfileName(profiles.get(pubkey))}</strong><small>From your selected public sources</small></span></WebContextLink><button aria-label={`Hide suggestion for ${readableProfileName(profiles.get(pubkey))}`} onClick={()=>setDismissed(ids=>[...ids,pubkey])}><X size={17}/></button></div>)}</section>;
}
export function PublicReadStatus({snapshot,refresh}:{snapshot:PublicFeedSnapshot|null;refresh:()=>void}){
 const failures=snapshot?.phase==='loading'?[]:snapshot?.sources.filter(source=>source.failure)||[];
 const failureText=(source:NonNullable<PublicFeedSnapshot>['sources'][number])=>{
  const name=publicRelayLabel(source.relay);
  if(source.failure==='timed-out')return `${name} did not respond before this request timed out.`;
  if(source.failure==='transport-unavailable')return `A connection to ${name} could not be completed.`;
  if(source.failure==='authentication-required')return `${name} requires authorization for this request.`;
  if(source.failure==='subscription-closed')return `${name} ended this request before it completed.`;
  if(['invalid-frame','message-limit'].includes(source.failure||''))return `${name} returned a response this reader could not use.`;
  return `This request to ${name} did not complete.`;
 };
 return <><div className="feed-direct-actions"><span role="status">{!snapshot||snapshot.phase==='loading'?'Loading public originals…':snapshot.phase==='disabled'?'Public Nostr is not selected.':snapshot.phase==='failed'?snapshot.problem==='invalid-request'?'Please use a search between 2 and 256 characters.':'No public source returned a usable response.':null}</span><button onClick={refresh}>Refresh</button></div>
 {failures.length>0&&<p className="source-caption" role="status">{failures.map(failureText).join(' ')} Results may be incomplete.</p>}</>;
}
export function PublicReadPagination({snapshot,hasHiddenPosts=false,showMore,loadMore,continueEarlier}:{snapshot:PublicFeedSnapshot|null;hasHiddenPosts?:boolean;showMore?:()=>void;loadMore:()=>void;continueEarlier:()=>void}){
 const busy=!snapshot||snapshot.phase==='loading'||snapshot.isLoadingMore;
 return <div className="feed-direct-actions" data-public-pagination>
  {hasHiddenPosts?<button className="secondary" onClick={showMore}>Show more posts</button>:
   snapshot?.mayHaveMore&&(!snapshot.paginationStalled||!!snapshot.paginationProblem)&&<button className="secondary" disabled={busy} onClick={loadMore}>{snapshot.isLoadingMore?'Loading older posts…':snapshot.paginationProblem?'Retry older posts':'Load older posts'}</button>}
  {snapshot?.paginationProblem&&<p role="status">Some public sources could not be reached. Your loaded posts are still available.</p>}
  {snapshot?.paginationStalled&&!snapshot.paginationProblem&&<><p role="status">These sources returned no further posts around this time. Continuing earlier may leave some posts out.</p><button className="secondary" disabled={busy} onClick={continueEarlier}>Continue to earlier posts</button></>}
  {snapshot?.paginationHasGaps&&<p className="source-caption" role="status">Some posts around the point you continued from may be missing.</p>}
  {snapshot?.isLoadingMore&&hasHiddenPosts&&<p role="status">Loading older posts…</p>}
 </div>;
}
type NostrTextLink=NonNullable<ReturnType<typeof publicNostrLink>>;
type ReferenceNavigation={onAuthor?:(pubkey:string)=>void;onReference?:(reference:PublicReadReference)=>void};
function PublicProfileMention({part,onAuthor}:{part:Extract<NostrTextLink,{type:'profile'}>;onAuthor?:ReferenceNavigation['onAuthor']}){
 const profiles=useProfileLookup([part.pubkey],'text-reference',1).profiles;
 const label=profileLabel(profiles.get(part.pubkey),part.text.replace(/^nostr:/,'').slice(0,20)+'…');
 return onAuthor?<button className="text-action" title={part.text} aria-label={`View public profile of ${label}`} onClick={()=>onAuthor(part.pubkey)}>@{label}</button>:<a href={part.text} title={part.text}>@{label}</a>;
}
function PublicReferenceLink({part,onAuthor,onReference,resolveProfile=true}:{part:NostrTextLink;resolveProfile?:boolean}&ReferenceNavigation){
 if(part.type==='profile'){
  if(resolveProfile)return <PublicProfileMention part={part} onAuthor={onAuthor}/>;
  const label='@'+part.text.replace(/^nostr:/,'').slice(0,20)+'…';
  return onAuthor?<button className="text-action" title={part.text} onClick={()=>onAuthor(part.pubkey)}>{label}</button>:<a href={part.text}>{label}</a>;
 }
 return onReference?<button className="text-action" onClick={()=>onReference(part.reference)}>View referenced original</button>:<a href={part.text}>View referenced original</a>;
}
function textWithoutMediaOnlyLines(text:string,urls:ReadonlySet<string>){
 return text.split('\n').filter(line=>!urls.has(publicExternalURL(line.trim())||'')).join('\n');
}
function PublicBody({view,expanded=false,feedPreview=false,onOpen,onAuthor,onReference,onReveal}:{view:Pick<PublicPostPresentation,'contentWarning'|'type'|'coverURL'|'title'|'body'|'summary'|'quotes'|'media'>;expanded?:boolean;feedPreview?:boolean;onOpen?:()=>void;onReveal?:()=>void}&ReferenceNavigation){
 const [consent,setConsent]=useState(false),[showFullText,setShowFullText]=useState(false);
 const preview=feedPreview&&!expanded;
 const mediaURLs=new Set([...view.media.flatMap(item=>[item.url,...item.fallbackURLs,...(item.previewURL?[item.previewURL]:[])]),...(view.coverURL?[view.coverURL]:[])]);
 const text=textWithoutMediaOnlyLines(view.type==='article'&&!expanded?(view.summary||view.body.text.split('\n\n')[0]):view.body.text,mediaURLs);
 const parts=presentPublicText(text);
 const mentionAuthors=new Set([...new Set(parts.flatMap(part=>part.type==='profile'?[part.pubkey]:[]))].slice(0,32));
 const externalLinks=parts.flatMap(part=>part.type==='link'&&!mediaURLs.has(part.url)?[part.url]:[]);
 const link=externalLinks[0],longText=text.length>420||text.split('\n').length>6;
 const readableURL=(value:string)=>{const url=new URL(value);let path=url.pathname;try{path=decodeURIComponent(path);}catch{}return url.hostname+(path==='/'?'':path.length>52?path.slice(0,52)+'…':path);};
 if(view.contentWarning&&!consent)return <section className="feed-empty"><p>{view.contentWarning}</p><button className="secondary" onClick={()=>{setConsent(true);onReveal?.();}}>Show this content</button></section>;
 return <>{view.type==='article'&&view.coverURL&&<img className="post-photo" src={view.coverURL} alt={view.title||''} loading="lazy" referrerPolicy="no-referrer"/>}
 {expanded&&view.body.format==='markdown'?<div className="original-article"><Markdown remarkPlugins={[remarkGfm,remarkPublicNostrReferences]} skipHtml urlTransform={url=>publicNostrLink(url)?url:publicExternalURL(url)||''}
  components={{a:({href,children})=>{const mediaURL=publicExternalURL(href);if(mediaURL&&mediaURLs.has(mediaURL)&&publicExternalURL(String(children))===mediaURL)return null;const part=publicNostrLink(href);return part?<PublicReferenceLink part={part} resolveProfile={part.type!=='profile'||mentionAuthors.has(part.pubkey)} onAuthor={onAuthor} onReference={onReference}/>:<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;},img:({src,alt})=>typeof src==='string'&&publicExternalURL(src)?<img src={src} alt={alt||''} loading="lazy" referrerPolicy="no-referrer"/>:<span>{alt||'Image unavailable'}</span>}}>{textWithoutMediaOnlyLines(view.body.text,mediaURLs)}</Markdown></div>:
 <div className="post-open public-post-body" style={{color:'inherit',overflowWrap:'anywhere'}}><p className={'public-post-copy'+(preview&&longText&&!showFullText?' is-collapsed':'')} style={{whiteSpace:'pre-wrap',maxWidth:expanded?'66ch':undefined}}>{parts.map((part,index)=>part.type==='link'?(mediaURLs.has(part.url)?null:<a key={index} className="public-inline-link" href={part.url} title={part.url} target="_blank" rel="noopener noreferrer">{preview?readableURL(part.url):part.text}</a>):part.type==='profile'||part.type==='reference'?<PublicReferenceLink key={index} part={part} resolveProfile={part.type!=='profile'||mentionAuthors.has(part.pubkey)} onAuthor={onAuthor} onReference={onReference}/>:<span key={index}>{part.text}</span>)}</p>{preview&&longText&&<button className="public-text-toggle" aria-expanded={showFullText} onClick={()=>setShowFullText(value=>!value)}>{showFullText?'Show less':'Show more'}</button>}</div>}
 {preview&&link&&<a className="public-link-card" href={link} target="_blank" rel="noopener noreferrer" title={link}><span className="public-link-domain">{new URL(link).hostname}</span><span>{readableURL(link)}</span><small>Open link ↗</small></a>}

 {view.quotes.length>0&&<div aria-label="Quoted originals">{view.quotes.map((quote,index)=>onReference&&(quote.type==='event'||[30023,34235,34236].includes(quote.kind))?<button className="text-action" key={index} onClick={()=>onReference(quote.type==='event'?{type:'event',eventId:quote.eventId}:{type:'address',pubkey:quote.pubkey,kind:quote.kind as 30023|34235|34236,identifier:quote.identifier})}>Open quoted original</button>:quote.nostrURI?<a key={index} href={quote.nostrURI}>Open quoted original</a>:null)}</div>}

 <PublicMediaGallery media={view.media} feedPreview={feedPreview}/></>;
}
function PublicCachedAuthorCard({view,profile,onAuthor,onReference}:{view:PublicCachedPostPresentation;profile?:PublicProfilePresentation}&ReferenceNavigation){
 const [expanded,setExpanded]=useState(false),[feedback,setFeedback]=useState(''),[failedPhoto,setFailedPhoto]=useState<string|null>(null),[revealedId,setRevealedId]=useState<string|null>(null);
 const publicProfile=profile?.pubkey===view.author.pubkey?profile:undefined;
 const name=profileLabel(publicProfile,`${view.author.npub.slice(0,16)}…${view.author.npub.slice(-6)}`);
 const actions=[['Reply',ChatCircle],['Like',Heart],['Repost',Repeat],['Save',BookmarkSimple],['Share',ShareNetwork]] as const;
 const share=async()=>{try{await navigator.clipboard.writeText(view.reference.nostrURI);setFeedback('Nostr reference copied.');}catch{setFeedback('Copy this Nostr reference: '+view.reference.nostrURI);}};
 return <article className="post-preview" data-public-cache-original={view.reference.eventId}>
  <div className="feed-post-heading"><button className="post-author" onClick={()=>onAuthor?.(view.author.pubkey)}>{publicProfile?.pictureURL&&publicProfile.pictureURL!==failedPhoto&&(!view.mediaRequiresConsent||revealedId===view.reference.eventId)?<img src={publicProfile.pictureURL} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedPhoto(publicProfile?.pictureURL||null)}/>:<UsersThree size={28}/>}<span><strong>{name}</strong><small>Public · {new Date(view.createdAtSeconds*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></span></button></div>
  {view.title&&(!view.contentWarning||revealedId===view.reference.eventId)&&<h2>{view.title}</h2>}
  <PublicBody key={view.reference.eventId} view={view} expanded={expanded} feedPreview={!expanded} onReveal={()=>setRevealedId(view.reference.eventId)} onOpen={()=>setExpanded(true)} onAuthor={onAuthor} onReference={onReference}/>
  {(!view.contentWarning||revealedId===view.reference.eventId)&&<button className="text-action" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show less':'Read full content'}</button>}
  <div className="post-controls feed-direct-actions web-feed-five-actions" role="group" aria-label="Actions for public original">{actions.map(([label,Icon])=><button key={label} aria-label={label+' public original'} onClick={()=>{if(label==='Share'){void share();}else setFeedback('This action is not connected for this original yet. Nothing was changed.');}}><Icon size={21}/></button>)}</div>
  {feedback&&<p role="status">{feedback}</p>}<details><summary>Original &amp; source</summary><p>Signed public original · Primal public cache</p><a href={view.reference.nostrURI}>Open Nostr reference</a></details>
 </article>;
}
export function PublicAuthorCacheRows({originals,existingIds,query,tab,profile,onAuthor,onReference}:{originals:readonly VerifiedPrimalPublicOriginal[];existingIds:readonly string[];query:string;tab:string;profile?:PublicProfilePresentation}&ReferenceNavigation){
 const views=useMemo(()=>originals.map(presentPrimalCachedOriginal),[originals]);
 const shown=views.filter(v=>!!readableProfileName(profile?.pubkey===v.author.pubkey?profile:undefined)&&!existingIds.includes(v.reference.eventId)&&publicSearchMatches(v.original.event,query.trim())&&(tab==='Media'?v.media.length>0||!!v.coverURL:tab==='Reels'?v.shortVideo:true));
 return <section aria-label="Public profile history from Primal">{shown.map(view=><PublicCachedAuthorCard key={view.reference.eventId} view={view} profile={profile} onAuthor={onAuthor} onReference={onReference}/>)}{!shown.length&&!existingIds.length&&<p className="source-caption">No matching public content was returned in this page.</p>}<p className="source-caption">{shown.length} additional public originals from Primal. This page does not include the complete history.</p></section>;
}
type Navigation={open:(post:VerifiedPublicOriginal)=>void;onAuthor?:(pubkey:string)=>void;onReference?:(reference:PublicReadReference)=>void;onBack?:()=>void};
function PublicHeading({view,profile,onAuthor,onOpen}:{view:PublicPostPresentation;profile?:PublicProfilePresentation;onAuthor?:(pubkey:string)=>void;onOpen?:()=>void}){
 const [copyStatus,setCopyStatus]=useState(''),[failedAvatar,setFailedAvatar]=useState<string|null>(null);
 const permalink=`${location.origin}${location.pathname}#/explore/feed/originals/${view.reference.eventId}`;
 const copyLink=async()=>{try{await navigator.clipboard.writeText(permalink);setCopyStatus('Link copied.');}catch{setCopyStatus('Copy this link: '+permalink);}};
 const name=profileLabel(profile,`${view.author.npub.slice(0,16)}…${view.author.npub.slice(-6)}`);
 return <div className="feed-post-heading"><button className="post-author" onClick={()=>onAuthor?.(view.author.pubkey)}>
 {profile?.pictureURL&&profile.pictureURL!==failedAvatar&&!view.mediaRequiresConsent?<img src={profile.pictureURL} alt="" referrerPolicy="no-referrer" loading="lazy" onError={()=>setFailedAvatar(profile.pictureURL||null)}/>:<UsersThree size={28}/>}
 <span><strong>{name}</strong><small>Public · {new Date(view.createdAtSeconds*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></span></button>
 <details><summary aria-label="About this original"><DotsThree size={25}/></summary>{onOpen&&<button className="text-action" onClick={onOpen}>View post &amp; discussion</button>}<p className="source-caption">Public Nostr · {view.original.relays.map(r=>publicRelayLabel(r)).join(', ')}</p><a href={view.reference.nostrURI}>Open Nostr reference</a><button className="text-action" onClick={copyLink}>Copy link</button>{copyStatus&&<p role="status">{copyStatus}</p>}</details></div>;
}
function PublicPropsReview({post,onClose}:{post:VerifiedPublicOriginal;onClose:()=>void}){
 const closeButton=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{closeButton.current?.focus({preventScroll:true});},[]);
 return <section className="public-action-review" aria-label="Props" data-public-props-target={post.event.id}>
  <h3>Props</h3>
  <p>This public original is not linked to a verified CRAYS Props contest.</p>
  <p>Choose a creator’s contest to review its contribution, quantity and total. Each Prop costs USD 1: 50% goes to the creator, 25% to the prize pool and 25% to the event. Confirmed Props count for that exact contest and its creator’s category in the Props season.</p>
  <p>Public Lightning reactions do not establish a CRAYS vote or payment receipt.</p>
  <div className="public-action-review-controls"><a className="secondary" href="#/explore/props">Discover Props contests</a><button ref={closeButton} className="text-action" onClick={onClose}>Close</button></div>
 </section>;
}
function PublicQuoteReview({post,onClose}:{post:VerifiedPublicOriginal;onClose:()=>void}){
 const inheritedDrafts=useContext(PublicQuoteDraftContext),localDrafts=useMemo(()=>createPublicQuoteDraftStore('isolated-quote-view'),[]),drafts=inheritedDrafts||localDrafts;
 const [text,setText]=useState(()=>drafts.get(post.event.id)),[publication,setPublication]=useState<PublicPublicationDraft|null>(null),[problem,setProblem]=useState('');
 const input=useRef<HTMLTextAreaElement|null>(null);
 useEffect(()=>{input.current?.focus({preventScroll:true});},[]);
 const edit=(value:string)=>{try{drafts.set(post.event.id,value);setText(value);setProblem('');}catch{setProblem('This comment could not be kept. Finish or discard another open quote, or shorten your text.');}};
 return <section className="public-action-review" aria-label="Quote original" data-public-quote-target={post.event.id}>
  <h3>Quote with a comment</h3>
  {publication?<LivePublicNostrDraftReview publication={publication} onClose={()=>setPublication(null)}/>:<>
   <label>Your comment<textarea ref={input} value={text} maxLength={63000} onChange={event=>edit(event.target.value)}/></label>
   <p className="source-caption">The exact original will be linked in your public post. Closing keeps this comment in this account until the page reloads.</p>
   <button className="secondary" onClick={()=>{try{setPublication(createPublicQuoteDraft({target:post,text}));setProblem('');}catch{setProblem('This original or comment could not be prepared. Nothing was published.');}}}>Review quote</button>
  </>}
  {problem&&<p role="alert">{problem}</p>}
  <div className="public-action-review-controls"><button className="text-action" onClick={onClose}>Close</button><button className="text-action" onClick={()=>{drafts.discard(post.event.id);setText('');setPublication(null);onClose();}}>Discard quote</button></div>
 </section>;
}
type DisplayEngagement={observed?:PublicEngagementPresentation;reported?:PrimalReportedEngagement};
function publicActionCount(name:string,stats?:DisplayEngagement|null){
 const field=name==='Like'?'likes':name==='Repost'?'reposts':name==='Reply'?'replies':null;
 if(!field)return null;
 if(stats?.reported)return {text:String(stats.reported[field]),description:`${stats.reported[field]} ${field} reported by Primal; not a complete network count`};
 const n=name==='Like'?stats?.observed?.likeProfiles:name==='Repost'?stats?.observed?.repostProfiles:undefined;
 return n?{text:`≥${n}`,description:`At least ${n} ${field} observed from selected relays`}: {text:'—',description:`${field} count unavailable`};
}
function PublicActions({post,title,className,stats,after,onDiscussion}:{post:VerifiedPublicOriginal;title:string;className?:string;stats?:DisplayEngagement|null;after?:ReactNode;onDiscussion?:()=>void}){
 const [feedback,setFeedback]=useState(''),[zapOpen,setZapOpen]=useState(false),[repostChoice,setRepostChoice]=useState(false),[quoteOpen,setQuoteOpen]=useState(false);
 const profileCache=useContext(PublicProfileCacheContext),quoteDrafts=useContext(PublicQuoteDraftContext);
 const [action,setAction]=useState<PublicCommandAction|null>(null);
 const actionOpener=useRef<HTMLButtonElement|null>(null);
 const relays=useContext(PublicRelayContext);
 const share=async()=>{const link=`${location.origin}${location.pathname}#/explore/feed/originals/${post.event.id}`;try{await navigator.clipboard.writeText(link);setFeedback('Link copied.');}catch{setFeedback('Copy this link: '+link);}};
 const actions=[['Reply',ChatCircle],['Props',Lightning],['Like',Heart],['Repost',Repeat],['Save',BookmarkSimple],['Share',ShareNetwork]] as const;
 return <><div className={className||'post-controls feed-direct-actions web-feed-five-actions'} role="group" aria-label={`Actions for ${title}`}>
 {actions.map(([name,Icon])=>{const count=publicActionCount(name,stats);return <button key={name} className={name==='Props'?'public-zap-action':undefined} aria-label={`${name} ${title}${count?`, ${count.description}`:''}`} title={count?.description||name} onClick={event=>{actionOpener.current=event.currentTarget;setQuoteOpen(false);setRepostChoice(false);if(name==='Repost'){setAction(null);setZapOpen(false);setRepostChoice(true);return;}if(name==='Props'){setAction(null);setZapOpen(true);return;}setZapOpen(false);if(name==='Reply'&&onDiscussion){onDiscussion();}else if(name==='Share'){void share();}else if(name==='Save')setFeedback('Save is not connected yet. No action was sent or saved.');else setAction(name==='Reply'?'reply':name==='Like'?'like':'repost');}}><Icon size={21} weight={name==='Props'?'fill':'regular'}/>{name!=='Props'&&<span className="public-action-label">{name==='Save'?'Bookmark':name}</span>}{count&&<span className="public-observed-count" aria-hidden="true">{count.text}</span>}</button>;})}
 </div>{repostChoice&&<section className="public-action-review" aria-label="Share this original"><h3>Share this original</h3><div className="public-action-review-controls"><button className="secondary" onClick={()=>{setRepostChoice(false);setAction('repost');}}>Repost</button><button className="secondary" onClick={()=>{setRepostChoice(false);setQuoteOpen(true);}}>{quoteDrafts?.get(post.event.id)?'Continue quote':'Quote with a comment'}</button><button className="text-action" onClick={()=>{setRepostChoice(false);requestAnimationFrame(()=>actionOpener.current?.focus({preventScroll:true}));}}>Cancel</button></div></section>}{quoteOpen&&<PublicQuoteReview key={JSON.stringify([quoteDrafts?.scope||'',post.event.id])} post={post} onClose={()=>{setQuoteOpen(false);requestAnimationFrame(()=>actionOpener.current?.focus({preventScroll:true}));}}/>}{zapOpen&&<PublicPropsReview key={JSON.stringify([profileCache?.scope||'',relays,post.event.id])} post={post} onClose={()=>{setZapOpen(false);requestAnimationFrame(()=>actionOpener.current?.focus({preventScroll:true}));}}/>}{feedback&&<p role="status">{feedback}</p>}{action&&<PublicActionReview action={action} target={post} relays={relays} onClose={()=>{setAction(null);requestAnimationFrame(()=>actionOpener.current?.focus({preventScroll:true}));}}/>}{after}</>;
}
function usePublicEngagement(posts:readonly VerifiedPublicOriginal[],revision=0){
 const ids=posts.slice(0,50).map(post=>post.event.id),idsKey=ids.join(':');
 const relays=useContext(PublicRelayContext),profileCache=useContext(PublicProfileCacheContext);
 const [cacheRevision,setCacheRevision]=useState(0);
 const cacheKey=JSON.stringify([profileCache?.scope||'',relays,idsKey,revision,cacheRevision]);
 const [cached,setCached]=useState<{key:string;result:PrimalPublicEngagementResult|null}|null>(null);
 useEffect(()=>{
  if(!idsKey||!relays.includes('wss://relay.primal.net'))return;
  const controller=new AbortController();let current=true;
  void readPrimalPublicEngagement({eventIds:idsKey.split(':'),relays,signal:controller.signal}).then(result=>{if(current&&!controller.signal.aborted)setCached({key:cacheKey,result});}).catch(()=>{if(current&&!controller.signal.aborted)setCached({key:cacheKey,result:null});});
  return ()=>{current=false;controller.abort();};
 },[cacheKey]);
 // Render-time fencing also removes old-account/source/refresh counts before
 // effects clean up. Provider metadata is never relabelled as signed reactions.
 const provider=cached?.key===cacheKey?cached.result:null;
 const useProvider=!!provider?.requestComplete&&!provider.problem&&!provider.disabled;
 const providerStats=new Map((useProvider&&provider?provider.entries:[]).map(entry=>[entry.eventId,entry]));
 const providerLoading=!!ids.length&&relays.includes('wss://relay.primal.net')&&cached?.key!==cacheKey;
 const read=usePublicRead(`public-engagement:${revision}:${idsKey}`,{engagementTo:ids,limit:50},ids.length>0);
 const observed=read.snapshot?.posts||[];
 const reactionIDs=observed.slice(0,50).map(post=>post.event.id);
 const deletions=usePublicRead(`public-reaction-removals:${revision}:${reactionIDs.join(':')}`,{deletionsFor:reactionIDs,limit:50},reactionIDs.length>0);
 const observedStats=useMemo(()=>{
  if(read.snapshot?.phase!=='loaded'||reactionIDs.length>0&&deletions.snapshot?.phase!=='loaded')return new Map<string,PublicEngagementPresentation>();
  return new Map(presentPublicEngagementBatch(posts.slice(0,50),[...observed,...(deletions.snapshot?.posts||[])]).map(stat=>[stat.targetEventId,stat]));
 },[posts,read.snapshot,deletions.snapshot]);
 const stats=new Map<string,DisplayEngagement>(ids.map(id=>[id,{observed:observedStats.get(id),reported:providerStats.get(id)}]));
 return {stats,loading:providerLoading||!read.snapshot||read.snapshot.phase==='loading'||reactionIDs.length>0&&(!deletions.snapshot||deletions.snapshot.phase==='loading'),unavailable:read.snapshot?.phase==='failed'||deletions.snapshot?.phase==='failed',partial:cached?.key===cacheKey&&!provider||!!provider?.problem||!!read.snapshot?.sources.some(source=>source.failure)||!!deletions.snapshot?.sources.some(source=>source.failure),refresh:()=>{setCacheRevision(value=>value+1);read.refresh();deletions.refresh();}};
}
function PublicEngagementNotice({state}:{state:ReturnType<typeof usePublicEngagement>}){
 return <p className="source-caption" role="status">{state.loading?'Loading reactions…':state.unavailable||state.partial?'Some reaction counts could not be updated. ':''}{!state.loading&&'Primal totals are shown when available. ≥ means reactions observed from selected relays; — means the count is unavailable.'}</p>;
}
function PublicCompactPreview({view,onOpen,revealed=false}:{view:PublicPostPresentation;onOpen:()=>void;revealed?:boolean}){
 const [failed,setFailed]=useState(false);const first=view.media[0];
 const url=(!view.mediaRequiresConsent||revealed)&&(first?.kind==='image'?first.url:first?.previewURL||view.coverURL);
 if(!first&&!view.coverURL)return null;
 return <button className="public-feed-compact-preview" onClick={onOpen} aria-label={view.mediaRequiresConsent&&!revealed?'Review original media':`Open original ${first?.kind||'image'}`}>
  {url&&!failed?<img src={url} alt={first?.alt||''} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span>{first?.kind==='video'?<Play size={25}/>:first?.kind==='audio'?<MusicNote size={25}/>:view.mediaRequiresConsent?'Review media':'Open media'}</span>}
 </button>;
}
function PublicCompactText({text,mediaURLs}:{text:string;mediaURLs:ReadonlySet<string>}){
 const parts=presentPublicText(textWithoutMediaOnlyLines(text,mediaURLs)).filter(part=>part.type!=='link'||!mediaURLs.has(part.url)),authors=[...new Set(parts.flatMap(part=>part.type==='profile'?[part.pubkey]:[]))].slice(0,32);
 const profiles=useProfileLookup(authors,'compact-text-references').profiles;
 // This is the existing original-opening button's preview, so names remain
 // text here. The opened original supplies individual profile navigation.
 return <p>{parts.map((part,index)=>part.type==='profile'?<span key={index} title={part.text}>@{profileLabel(profiles.get(part.pubkey),part.text.replace(/^nostr:/,'').slice(0,20)+'…')}</span>:<span key={index}>{part.text}</span>)}</p>;
}
function PublicCompactBody({view,onOpen}:{view:PublicPostPresentation;onOpen:()=>void}){
 const [revealed,setRevealed]=useState(false);
 if(view.mediaRequiresConsent&&!revealed)return <div className="public-feed-compact-warning"><p>Content warning{view.contentWarning?': '+view.contentWarning:''}</p><button className="text-action" onClick={()=>setRevealed(true)}>Show content</button></div>;
 return <div className="public-feed-compact-body"><PublicCompactPreview key={view.reference.eventId} view={view} revealed={revealed} onOpen={onOpen}/><div className="public-feed-compact-copy"><button aria-label={`Open original and conversation${view.title?': '+view.title:''}`} onClick={onOpen}>{view.title&&<h2>{view.title}</h2>}<PublicCompactText text={view.body.text} mediaURLs={new Set([...view.media.flatMap(m=>[m.url,...m.fallbackURLs,...(m.previewURL?[m.previewURL]:[])]),...(view.coverURL?[view.coverURL]:[])])}/></button></div></div>;
}
function PublicRowsBatch({views,open,onAuthor,onReference,revision,compact=false,selectedId,filterAutomated=false}:{views:readonly PublicPostPresentation[];revision:number;compact?:boolean;selectedId?:string;filterAutomated?:boolean}&Navigation){
 const originals=useMemo(()=>views.map(view=>view.original),[views]);
 const profiles=usePublicProfiles(originals,revision),engagement=usePublicEngagement(originals,revision);
 const [revealedTitles,setRevealedTitles]=useState<readonly string[]>([]);
 return <>{views.filter(view=>{const profile=profiles.get(view.author.pubkey);return !!readableProfileName(profile)&&(!filterAutomated||!publicAutomationReason(profile,view.author.pubkey));}).map(view=><article className={"post-preview"+(compact?" public-feed-compact-row":"")} key={view.reference.eventId} data-public-nostr-original={view.reference.eventId} data-selected={selectedId===view.reference.eventId||undefined}>
  <PublicHeading view={view} profile={profiles.get(view.author.pubkey)} onAuthor={onAuthor} onOpen={()=>open(view.original)}/>
  {compact?<PublicCompactBody key={view.reference.eventId} view={view} onOpen={()=>open(view.original)}/>:<>
  {view.title&&(!view.mediaRequiresConsent||revealedTitles.includes(view.reference.eventId))&&<button className="post-open" aria-label={`Read ${view.title}`} onClick={()=>open(view.original)}><h2>{view.title}</h2></button>}
  <PublicBody feedPreview view={view} onReveal={()=>setRevealedTitles(ids=>ids.includes(view.reference.eventId)?ids:[...ids,view.reference.eventId])} onOpen={()=>open(view.original)} onAuthor={onAuthor} onReference={onReference}/></>}
  <PublicActions onDiscussion={()=>open(view.original)} post={view.original} title={view.mediaRequiresConsent?'public original':view.title||'public original'} stats={engagement.stats.get(view.reference.eventId)}/>
 </article>)}<PublicEngagementNotice state={engagement}/></>;
}

type Props=Navigation&{countLabel?:string;suppressEmpty?:boolean;showPresentationControls?:boolean;showReadStatus?:boolean;onVisibleLimitChange?:(limit:number)=>void;compact?:boolean;selectedId?:string;showRawPosts?:boolean;onRawPostsChange?:(show:boolean)=>void;onKindChange?:(kind:string)=>void;snapshot:PublicFeedSnapshot|null;query:string;kind:string;period:string;limit:number;refresh:()=>void;loadMore:()=>void;continueEarlier:()=>void};
export function LiveGlobalNostrRows({snapshot,query,kind,period,limit,refresh,loadMore,continueEarlier,open,onAuthor,onReference,onKindChange,showRawPosts=false,onRawPostsChange,compact=false,selectedId,onVisibleLimitChange,suppressEmpty=false,showPresentationControls=true,showReadStatus=true,countLabel='posts loaded'}:Props){
 const [visibleLimit,setVisibleLimit]=useState(Math.max(limit,30));
 const [reactionGeneration,setReactionGeneration]=useState(0);
 const expandWindow=(amount:number)=>{const next=visibleLimit+amount;setVisibleLimit(next);onVisibleLimitChange?.(next);};
 useEffect(()=>setVisibleLimit(Math.max(limit,30)),[limit,query,kind,period]);
 const originals=snapshot?.posts||[];
 const views=useMemo(()=>originals.map(p=>presentPublicOriginal(p)),[snapshot?.posts]);
 const now=Date.now(),maxAge=period==='Last 24 hours'?86400000:period==='Last 7 days'?604800000:null;
 const matchedPosts=views.filter(v=>publicSearchMatches(v.original.event,query.trim())&&
  (!kind||kind==='All'||kind==='Image'&&(v.type==='image'||v.media.some(m=>m.kind==='image'))||kind==='Video'&&(v.type==='video'||v.media.some(m=>m.kind==='video'))||kind==='Audio'&&v.media.some(m=>m.kind==='audio')||kind.toLowerCase()===v.type)&&(!maxAge||now-v.createdAtSeconds*1000<=maxAge));
 // These transparent presentation filters do not alter originals or their source selection.
 const seenPayloads=new Set<string>();
 const applyPresentationFilter=!!onRawPostsChange&&!showRawPosts;
 const posts=!applyPresentationFilter?matchedPosts:matchedPosts.filter(view=>{
  const text=view.body.text.trim();
  if(view.original.event.kind===1&&!view.media.length&&/^[{[]/.test(text)){try{const value=JSON.parse(text);if(value&&typeof value==='object')return false;}catch{}}
  const attachmentURLs=new Set(view.media.flatMap(media=>[media.url,...media.fallbackURLs]));
  if(view.original.event.kind===1&&presentPublicText(text).filter(part=>part.type==='link'&&!attachmentURLs.has(part.url)).length>4)return false;
  const event=view.original.event,payload=JSON.stringify([event.pubkey,event.kind,event.tags,event.content]);
  if(seenPayloads.has(payload))return false;seenPayloads.add(payload);return true;
 });
 const hiddenCount=matchedPosts.length-posts.length;
 const feedStatus=<>
  {showPresentationControls&&<p className="source-caption">Only posts with a readable profile name are shown.</p>}{onRawPostsChange&&showPresentationControls&&<div className="public-feed-presentation-choice"><span title="Repeated posts, link lists, app messages and explicitly automated profiles can be filtered. Choose Include filtered content to include them. Posts still need a readable profile name.">{compact?(showRawPosts?'Content filters off; named profiles only.':hiddenCount?`${hiddenCount} posts hidden by content filters.`:'Content filters are on.'):(showRawPosts?'Content filters off; named profiles only.':hiddenCount?`${hiddenCount} link lists, duplicate posts or app-data posts hidden; automated profiles are also filtered.`:'Link lists, duplicate posts, app-data posts and automated profiles are filtered.')}</span><button onClick={()=>onRawPostsChange(!showRawPosts)}>{showRawPosts?'Apply content filters':'Include filtered content'}</button></div>}
  {showReadStatus&&<PublicReadStatus snapshot={snapshot} refresh={()=>{setReactionGeneration(value=>value+1);refresh();}}/>}
 </>;
 return <section aria-label="Global public Nostr originals" data-live-nostr="global" aria-busy={!snapshot||snapshot.phase==='loading'||snapshot.isLoadingMore}>
  {onKindChange&&!compact&&<nav className="public-feed-content-tabs" aria-label="Public feed content">{[['All','All posts'],['Image','Photos'],['Video','Videos'],['Audio','Audio'],['Article','Articles']].map(([value,label])=><button key={value} aria-pressed={(kind||'All')===value} onClick={()=>onKindChange(value)}>{label}</button>)}</nav>}
  {compact?<div className="public-feed-toolbar">{feedStatus}</div>:feedStatus}{query&&<p className="source-caption">Search results from your selected public sources. Coverage varies by source.</p>}
  {Array.from({length:Math.ceil(Math.min(posts.length,visibleLimit)/30)},(_,page)=><PublicRowsBatch key={posts[page*30].reference.eventId} views={posts.slice(page*30,Math.min((page+1)*30,visibleLimit))} revision={reactionGeneration} open={open} onAuthor={onAuthor} onReference={onReference} compact={compact} selectedId={selectedId} filterAutomated={applyPresentationFilter}/>)}
  {snapshot?.phase==='loaded'&&!posts.length&&!suppressEmpty&&<div className="feed-empty"><h2>No public originals here yet</h2><p>Try refreshing, loading older posts or adjusting your filters.</p></div>}
  {(snapshot?.phase==='loaded'||posts.length>0)&&<p className="source-caption" role="status" aria-atomic="true">{Math.min(visibleLimit,posts.length)} {countLabel}.</p>}
  <PublicReadPagination snapshot={snapshot} hasHiddenPosts={posts.length>visibleLimit} showMore={()=>expandWindow(30)} loadMore={()=>{expandWindow(50);loadMore();}} continueEarlier={continueEarlier}/>
 </section>;
}

function PublicCommentBatch({comments,rootTarget,onAuthor,onReference,depth,revision,expanded,onExpanded}:{comments:readonly VerifiedPublicOriginal[];rootTarget:PublicCommentTarget;onAuthor?:(pubkey:string)=>void;onReference?:(reference:PublicReadReference)=>void;depth:number;revision:number;expanded:string|null;onExpanded:(id:string|null)=>void}){
 const profiles=usePublicProfiles(comments,revision),setExpanded=onExpanded;
 return <>  {comments.filter(post=>!!readableProfileName(profiles.get(post.event.pubkey))).map(post=>{
   const comment=presentPublicComment(post),profile=profiles.get(comment.authorPubkey),name=profileLabel(profile,`${comment.authorPubkey.slice(0,12)}…${comment.authorPubkey.slice(-6)}`);
   return <article className="post-preview" key={post.event.id} data-public-comment={post.event.id}>
    <header className="feed-post-heading"><button className="post-author" onClick={()=>onAuthor?.(comment.authorPubkey)}>
     {profile?.pictureURL&&!comment.mediaRequiresConsent?<img src={profile.pictureURL} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<UsersThree size={28}/>}
     <span><strong>{name}</strong><small>Public · {new Date(post.event.created_at*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</small></span>
    </button></header>
    <PublicBody key={post.event.id} view={{...comment,type:'note',coverURL:null,title:null,summary:null,quotes:[]}} onAuthor={onAuthor} onReference={onReference}/>
    <button className="text-action" aria-expanded={expanded===post.event.id} onClick={()=>setExpanded(expanded===post.event.id?null:post.event.id)}>{expanded===post.event.id?'Hide replies':'View replies'}</button>
    {expanded===post.event.id&&<PublicCommentBranch key={post.event.id} target={{type:'event',eventId:post.event.id,kind:1111,author:post.event.pubkey}} rootTarget={rootTarget} depth={depth+1} onAuthor={onAuthor} onReference={onReference}/>}
   </article>;
  })}
</>;
}
function PublicCommentBranch({target,rootTarget,onAuthor,onReference,depth=0}:{target:PublicCommentTarget;rootTarget:PublicCommentTarget;onAuthor?:(pubkey:string)=>void;onReference?:(reference:PublicReadReference)=>void;depth?:number}){
 const read=usePublicRead(`public-comments:${JSON.stringify([target,rootTarget])}`,{commentsTo:target,limit:30});
 const comments=(read.snapshot?.posts||[]).filter(post=>publicCommentMatchesTarget(post,target,rootTarget));
 const [expanded,setExpanded]=useState<string|null>(null),[profileRevision,setProfileRevision]=useState(0);
 return <section aria-label={depth?'Replies to comment':'Public comments'} data-public-comments>
  <PublicReadStatus snapshot={read.snapshot} refresh={()=>{read.refresh();setProfileRevision(n=>n+1);}}/>
  {Array.from({length:Math.ceil(comments.length/32)},(_,i)=><PublicCommentBatch key={i} comments={comments.slice(i*32,(i+1)*32)} rootTarget={rootTarget} depth={depth} revision={profileRevision} expanded={expanded} onExpanded={setExpanded} onAuthor={onAuthor} onReference={onReference}/>)}
  {read.snapshot?.phase==='loaded'&&!comments.length&&<p className="source-caption">No direct comments were returned by these public sources.</p>}
  {comments.length>0&&<p className="source-caption">Comments without a readable profile name are hidden.</p>}
  <PublicReadPagination snapshot={read.snapshot} loadMore={read.loadMore} continueEarlier={read.continueEarlier}/>
 </section>;
}
function PublicOriginalComments({view,onAuthor,onReference}:{view:PublicPostPresentation;onAuthor?:(pubkey:string)=>void;onReference?:(reference:PublicReadReference)=>void}){
 const target:PublicCommentTarget=view.address?{type:'address',kind:view.address.kind as 30023|34235|34236,pubkey:view.address.pubkey,identifier:view.address.identifier}:{type:'event',eventId:view.reference.eventId,kind:view.kind as 20|21|22|30023|34235|34236,author:view.author.pubkey};
 return <PublicCommentBranch key={JSON.stringify(target)} target={target} rootTarget={target} onAuthor={onAuthor} onReference={onReference}/>;
}

export function LiveGlobalNostrOriginal({post,open,onAuthor,onReference,onBack}:{post:VerifiedPublicOriginal}&Partial<Navigation>){
 const selected=useContext(PublicRelayContext);
 const eligible=useMemo(()=>{const relays=post.relays.filter(relay=>selected.includes(relay));return relays.length?{event:post.event,relays}:null;},[post,selected]);
 // A retained flow entry must not display a deselected-source original after a
 // context change. Resolve it again using only the current source choice.
 return eligible?<PublicOriginalContent post={eligible} open={open} onAuthor={onAuthor} onReference={onReference} onBack={onBack}/>:<LiveGlobalNostrReference reference={{type:'event',eventId:post.event.id}} open={next=>open?.(next)} onAuthor={onAuthor} onReference={onReference} onBack={onBack}/>;
}
function PublicReplyBatch({posts,revision,open,onAuthor,onReference}:{posts:readonly VerifiedPublicOriginal[];revision:number}&Partial<Navigation>){
 const profiles=usePublicProfiles(posts,revision);
 return <>{posts.filter(reply=>!!readableProfileName(profiles.get(reply.event.pubkey))).map(reply=><article className="post-preview" key={reply.event.id}><PublicHeading view={presentPublicOriginal(reply)} profile={profiles.get(reply.event.pubkey)} onAuthor={onAuthor}/><PublicBody view={presentPublicOriginal(reply)} onOpen={()=>open?.(reply)} onAuthor={onAuthor} onReference={onReference}/><button className="text-action" onClick={()=>open?.(reply)}>Open reply</button></article>)}</>;
}
function PublicOriginalContent({post,open,onAuthor,onReference,onBack}:{post:VerifiedPublicOriginal}&Partial<Navigation>){
 const view=useMemo(()=>presentPublicOriginal(post),[post]);
 const [revealedOriginal,setRevealedOriginal]=useState<string|null>(null);
 const profileRead=useProfileLookup([post.event.pubkey],`original:${post.event.id}`,1),profiles=profileRead.profiles;
 const engagementPosts=useMemo(()=>[post],[post]);
 const engagement=usePublicEngagement(engagementPosts);
 const replies=usePublicRead(`public-replies:${view.reference.eventId}`,{replyTo:[view.reference.eventId],limit:50},view.kind===1);
 const directReplies=(replies.snapshot?.posts||[]).filter(reply=>presentPublicOriginal(reply).thread.parent?.eventId===view.reference.eventId);
 const [replyProfileRevision,setReplyProfileRevision]=useState(0);
 const profile=profiles.get(view.author.pubkey),name=profileLabel(profile,`${view.author.npub.slice(0,16)}…${view.author.npub.slice(-6)}`);
 if(!readableProfileName(profile))return <MobileScroll><section className="detail-content" aria-label="Hidden public original"><h1>Public original</h1><p>This post is hidden until a readable author profile name is available.</p><button className="text-action" onClick={profileRead.refresh}>Retry profile lookup</button>{onBack&&<button className="text-action" onClick={onBack}>Back</button>}</section></MobileScroll>;
 return <MobileScroll><article className="original-content web-original-container"><WebOriginalLayout web authorImage={view.mediaRequiresConsent?undefined:profile?.pictureURL||undefined} hasReplies={view.kind!==1||replies.snapshot?.phase!=='loaded'||!!replies.snapshot?.posts.length||!!replies.snapshot?.sources.some(s=>s.failure)} onBack={()=>onBack?.()} backLabel="Back" postedDate={new Date(view.createdAtSeconds*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}>
  <h1 className={!view.title||view.mediaRequiresConsent&&revealedOriginal!==view.reference.eventId?'crays-screen-reader-only':undefined}>{view.mediaRequiresConsent&&revealedOriginal!==view.reference.eventId?'Public original':view.title||'Public original'}</h1><button className="author-link" onClick={()=>onAuthor?.(view.author.pubkey)}>{name}</button><div className="original-source-label">Public Nostr</div>
  {view.kind===1&&view.thread.parent&&<button className="text-action" onClick={()=>onReference?.({type:'event',eventId:view.thread.parent!.eventId})}>In reply to another original</button>}
  <PublicBody key={view.reference.eventId} view={view} expanded onReveal={()=>setRevealedOriginal(view.reference.eventId)} onAuthor={onAuthor} onReference={onReference}/><PublicActions post={view.original} className="product-action-bar web-original-five-actions" title={view.mediaRequiresConsent?'public original':view.title||'public original'} stats={engagement.stats.get(view.reference.eventId)} after={<div className="public-original-engagement-status"><PublicEngagementNotice state={engagement}/><button className="text-action" onClick={engagement.refresh}>Refresh reactions</button></div>}/>
  <details className="original-metadata"><summary>Original &amp; source</summary><p>{view.original.relays.map(r=>publicRelayLabel(r)).join(', ')}</p><a href={view.reference.nostrURI}>Open Nostr reference</a></details>
  <h2>Discussion</h2>
  <button title="View this author’s profile" className="text-action" onClick={()=>onAuthor?.(view.author.pubkey)}>View this author’s profile</button>
  {view.kind===1?<section aria-label="Public conversation"><PublicReadStatus snapshot={replies.snapshot} refresh={()=>{replies.refresh();setReplyProfileRevision(n=>n+1);}}/>
   {Array.from({length:Math.ceil(directReplies.length/32)},(_,i)=><PublicReplyBatch key={i} posts={directReplies.slice(i*32,(i+1)*32)} revision={replyProfileRevision} open={open} onAuthor={onAuthor} onReference={onReference}/>)}
   {replies.snapshot?.phase==='loaded'&&!directReplies.length&&<p className="source-caption">No direct replies were returned by these public sources.</p>}
   {directReplies.length>0&&<p className="source-caption">Replies without a readable profile name are hidden.</p>}
   <PublicReadPagination snapshot={replies.snapshot} loadMore={replies.loadMore} continueEarlier={replies.continueEarlier}/>
  </section>:<PublicOriginalComments view={view} onAuthor={onAuthor} onReference={onReference}/>}
 </WebOriginalLayout></article></MobileScroll>;
}
export function LiveGlobalNostrReference({reference,...navigation}:{reference:PublicReadReference}&Navigation){
 const read=usePublicRead(`public-reference:${JSON.stringify(reference)}`,{reference,limit:30});
 const post=read.snapshot?.posts[0];
 return post?<LiveGlobalNostrOriginal key={post.event.id} post={post} {...navigation}/>:<section className="detail-content"><h1>Public original</h1><PublicReadStatus snapshot={read.snapshot} refresh={read.refresh}/>{read.snapshot?.phase==='loaded'&&<p>This original was not returned by the selected public sources.</p>}</section>;
}

export function PublicFollowingList({pubkey,scope,onAuthor}:{pubkey:string;scope:string;onAuthor:(pubkey:string)=>void}){
 const following=usePublicRead(`public-following:${scope}:${pubkey}`,{content:'following',authors:[pubkey],limit:1});
 const people=useMemo(()=>{const post=following.snapshot?.posts[0];if(!post)return [];try{return presentPublicFollowing(post).people;}catch{return [];}},[following.snapshot?.posts]);
 const [limit,setLimit]=useState(32);
 useEffect(()=>setLimit(32),[pubkey,scope]);
 const shown=people.slice(Math.max(0,limit-32),limit),authors=shown.map(person=>person.pubkey);
 const profiles=useProfileLookup(authors,`following:${scope}:${pubkey}`),metadata=profiles.profiles;
 return <section aria-label="Public following"><h2>Following</h2><PublicReadStatus snapshot={following.snapshot} refresh={following.refresh}/>
 {following.snapshot?.phase==='loaded'&&<p className="source-caption">{people.length?`${people.length} ${people.length===1?'profile':'profiles'} in this author's public following list.`:'No public following list was returned by these sources.'}</p>}
 {shown.map(person=>{const profile=metadata.get(person.pubkey);return <button key={person.pubkey} className="post-author" aria-label={`View public profile of ${profileLabel(profile,person.npub)}`} onClick={()=>onAuthor(person.pubkey)}>
  {profile?.pictureURL?<img src={profile.pictureURL} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<UsersThree size={28}/>}
  <span><strong>{profileLabel(profile,`${person.npub.slice(0,16)}…${person.npub.slice(-6)}`)}</strong><small>Public Nostr profile</small></span>
 </button>;})}
 <div className="feed-direct-actions">{limit>32&&<button className="secondary" onClick={()=>setLimit(n=>Math.max(32,n-32))}>Previous profiles</button>}{people.length>limit&&<button className="secondary" onClick={()=>setLimit(n=>n+32)}>Next profiles</button>}</div>
 <p className="source-caption">Public follows do not grant private contact or messaging permissions.</p>
 </section>;
}


export function LivePublicNostrDraftReview({publication,onClose}:{publication:PublicPublicationDraft;onClose:()=>void}){
 const relays=useContext(PublicRelayContext);
 return <section aria-label="Public draft preview"><h2>{publication.title||'Your public draft'}</h2>{publication.format==='article'&&publication.summary&&<p>{publication.summary}</p>}{publication.warning!==undefined&&<p role="note">Content warning: {publication.warning||'Sensitive content'}</p>}
  {publication.format==='article'?<Markdown skipHtml remarkPlugins={[remarkGfm]} urlTransform={url=>publicExternalURL(url)||''} components={{a:({children,href})=><a href={href} rel="noopener noreferrer" target="_blank">{children}</a>,img:({src,alt})=><img src={src} alt={alt||''} referrerPolicy="no-referrer"/>}}>{publication.text}</Markdown>:<p className="public-action-review-text">{publication.text}</p>}
  {!!publication.media.length&&<PublicMediaGallery media={publication.media.map(item=>({url:item.url,kind:item.mimeType.startsWith('image/')?'image':item.mimeType.startsWith('audio/')?'audio':'video',mimeType:item.mimeType,alt:item.alt||null,previewURL:item.previewURL||null,fallbackURLs:[]}))}/>}
  <PublicActionReview action="publish" publication={publication} relays={relays} onClose={onClose}/>
 </section>;
}
