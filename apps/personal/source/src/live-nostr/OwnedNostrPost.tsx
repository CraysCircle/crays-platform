import{useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type ReactNode}from'react';
import{ChatCircle,Lightning,Heart,Repeat,BookmarkSimple,ShareNetwork,UsersThree,DotsThree}from'@phosphor-icons/react';
import Markdown from'react-markdown';import remarkGfm from'remark-gfm';
// Host imports, installed only with the separately qualified integration patch.
import{PublicMediaGallery}from'./PublicMediaGallery';
import{publicExternalURL,publicNostrLink,remarkPublicNostrReferences}from'./public-feed.mjs';
import type{OwnedPostView,OwnedTextPart,OwnedReference}from'./OwnedPostTypes';
type Action='reply'|'props'|'like'|'repost'|'bookmark'|'share';
type Target={type:'profile';pubkey:string}|{type:'reference';reference:OwnedReference};
type Props={view:OwnedPostView;spotLabel:string;expanded?:boolean;isCurrent:(view:OwnedPostView)=>boolean;ownedVideoURL:(url:string,mime:string|null)=>string|null;
 onNavigate:(target:Target,view:OwnedPostView)=>void|Promise<void>;onReveal:(view:OwnedPostView)=>void|Promise<void>;onAction:(action:Action,view:OwnedPostView,current:Readonly<{isCurrent:()=>boolean}>)=>void|Promise<void>;
 available:Readonly<Partial<Record<Action,boolean>>>;counts?:Readonly<Partial<Record<Action,number>>>;pressed?:Readonly<Partial<Record<'like'|'bookmark',boolean>>>};
type InternalLinkProps={href:string|null;children:ReactNode;open:()=>void|Promise<void>;className?:string;isCurrent:()=>boolean;onUnavailable:()=>void;run:(open:()=>void|Promise<void>)=>void};
function OwnedInternalLink({href,children,open,className='text-action',isCurrent,onUnavailable,run}:InternalLinkProps){
 const click=(event:MouseEvent<HTMLAnchorElement>)=>{if(!isCurrent()){event.preventDefault();onUnavailable();return;}if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();run(open);};
 return href?<a className={className} style={className==='post-author'?{textDecoration:'none'}:undefined} href={'#'+href} onClick={click}>{children}</a>:<button className={className} onClick={()=>{if(isCurrent())run(open);else onUnavailable();}}>{children}</button>;
}
const actions=[['reply','Reply',ChatCircle],['like','Like',Heart],['repost','Repost',Repeat],['bookmark','Bookmark',BookmarkSimple],['props','Review Props contest',Lightning],['share','Share',ShareNetwork]]as const;
/** Existing selected feed classes/gallery only. No public query hooks, fallback
 * actor, signer, payment simulation or permission inference belongs here. */
export function OwnedNostrPost({view:v,spotLabel,expanded=false,isCurrent,ownedVideoURL,onNavigate,onReveal,onAction,available,counts,pressed}:Props){
 const[showText,setShowText]=useState(false),[failedPicture,setFailedPicture]=useState<string|null>(null),[feedback,setFeedback]=useState(''),[pendingAction,setPendingAction]=useState<Action|null>(null);
 useEffect(()=>{setShowText(false);setFailedPicture(null);setFeedback('');setPendingAction(null);},[v.contextKey,v.original.id]);
 const committed=useRef<Readonly<{view:OwnedPostView;isCurrent:Props['isCurrent']}>|null>(null);
 useLayoutEffect(()=>{committed.current={view:v,isCurrent};return()=>{committed.current=null;};},[v,isCurrent]);
 const current=()=>{try{const latest=committed.current;return latest?.view===v&&latest.isCurrent(v);}catch{return false;}};
 let renderCurrent=false;try{renderCurrent=isCurrent(v);}catch{}
 if(!renderCurrent)return <p role="status" className="source-caption">This post is no longer available in your current feed.</p>;
 const unavailable=()=>setFeedback('This post is no longer available in your current feed.');
 const run=(callback:()=>void|Promise<void>)=>{try{void Promise.resolve(callback()).catch(()=>{if(current())setFeedback('This destination could not be opened. Try again.');});}catch{if(current())setFeedback('This destination could not be opened. Try again.');}};
 const openOriginal=()=>onNavigate({type:'reference',reference:{type:'event',eventId:v.original.id}},v);
 const linkState={isCurrent:current,onUnavailable:unavailable,run};
 const part=(p:OwnedTextPart,index:number):ReactNode=>p.type==='profile'?<OwnedInternalLink {...linkState} key={index} href={p.href} open={()=>onNavigate({type:'profile',pubkey:p.pubkey},v)}>{p.label}</OwnedInternalLink>:p.type==='reference'?<OwnedInternalLink {...linkState} key={index} href={p.href} open={()=>onNavigate({type:'reference',reference:p.reference},v)}>{p.label}</OwnedInternalLink>:p.type==='link'?<a key={index} className="public-inline-link" href={p.url} target="_blank" rel="noopener noreferrer">{p.text}</a>:<span key={index}>{p.text}</span>;
 const credits=[...new Map([...v.credits,...(v.author.pictureCredit?[v.author.pictureCredit]:[])].filter(c=>c.required).map(c=>[c.assetId,c])).values()];
 const date=new Date(v.createdAtSeconds*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'}),articleSummary=!expanded&&v.body.format==='markdown'&&!!v.summary,longText=!articleSummary&&(v.body.text.length>420||v.body.text.split('\n').length>6),Heading=expanded?'h1':'h2';
 return <article className={expanded?'original-content web-original-container':'post-preview'} data-live-nostr data-source-realm="crays-isolated-demo" data-owned-original={v.original.id}>
  <div className="feed-post-heading"><OwnedInternalLink {...linkState} className="post-author" href={v.author.profilePath} open={()=>onNavigate({type:'profile',pubkey:v.author.pubkey},v)}>
   {v.author.pictureURL&&failedPicture!==v.author.pictureURL?<img src={v.author.pictureURL} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailedPicture(v.author.pictureURL)}/>:<UsersThree size={28} aria-hidden="true"/>}<span><strong>{v.author.name}</strong><small>{spotLabel} · {date}</small></span>
  </OwnedInternalLink><details><summary aria-label="Post options"><DotsThree size={21}/></summary><OwnedInternalLink {...linkState} href={v.originalPath} open={openOriginal}>Open original</OwnedInternalLink><OwnedInternalLink {...linkState} href={v.author.profilePath} open={()=>onNavigate({type:'profile',pubkey:v.author.pubkey},v)}>View profile</OwnedInternalLink></details></div>
  {v.requiresReveal?<section className="feed-empty"><p>{v.contentWarning}</p><button className="secondary" onClick={()=>{if(current())run(()=>onReveal(v));else unavailable();}}>Show this content</button></section>:<>
   {v.title&&<Heading>{v.title}</Heading>}
   {v.inReplyTo&&<OwnedInternalLink {...linkState} href={v.inReplyTo.href} open={()=>onNavigate({type:'reference',reference:v.inReplyTo!.reference},v)}>In reply to another original</OwnedInternalLink>}
   {v.body.format==='markdown'&&(expanded||!v.summary)?<><div className={'original-article'+(!expanded&&longText&&!showText?' public-post-copy is-collapsed':'')}><Markdown remarkPlugins={[remarkGfm,remarkPublicNostrReferences]} skipHtml urlTransform={url=>publicNostrLink(url)?url:publicExternalURL(url)||''} components={{
    a:({href,children})=>{const target=publicNostrLink(href);if(target){const found=v.parts.find(p=>target.type==='profile'?p.type==='profile'&&p.pubkey===target.pubkey:p.type==='reference'&&JSON.stringify(p.reference)===JSON.stringify(target.reference));return found?part(found,0):<span>{children}</span>;}const url=publicExternalURL(href);return url?<a className="public-inline-link" href={url} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>;},
    img:({alt})=><span>{alt||'Image unavailable'}</span>,
   }}>{v.body.text}</Markdown></div>{!expanded&&longText&&<button className="public-text-toggle" aria-expanded={showText} onClick={()=>setShowText(s=>!s)}>{showText?'Show less':'Show more'}</button>}</>:<div className="post-open public-post-body"><p className={'public-post-copy'+(!expanded&&longText&&!showText?' is-collapsed':'')} style={{whiteSpace:'pre-wrap'}}>{articleSummary?v.summary:v.parts.map(part)}</p>{!expanded&&longText&&<button className="public-text-toggle" aria-expanded={showText} onClick={()=>setShowText(s=>!s)}>{showText?'Show less':'Show more'}</button>}</div>}
   {v.quotes.length>0&&<div aria-label="Quoted originals">{v.quotes.map((q,i)=><OwnedInternalLink {...linkState} key={i} href={q.href} open={()=>onNavigate({type:'reference',reference:q.reference},v)}>{q.label}</OwnedInternalLink>)}</div>}
   <PublicMediaGallery media={v.media} feedPreview={!expanded} ownedVideoURL={ownedVideoURL}/>
   {credits.length>0&&<aside className="source-caption" aria-label="Media credits">{credits.map(c=><p key={c.assetId}>{c.text} <a href={c.sourceURL} target="_blank" rel="noopener noreferrer">Source</a> · <a href={c.licenseURL} target="_blank" rel="noopener noreferrer">Licence</a></p>)}</aside>}
   {!expanded&&v.body.format==='markdown'&&<OwnedInternalLink {...linkState} href={v.originalPath} open={openOriginal}>Read full article</OwnedInternalLink>}
  </>}
  <div className={'post-controls feed-direct-actions '+(expanded?'web-original-five-actions':'web-feed-five-actions')} role="group" aria-label="Post actions">{actions.filter(([id])=>id!=='props'||available.props===true).map(([id,label,Icon])=>{
   const count=counts?.[id],countKnown=typeof count==='number'&&Number.isSafeInteger(count)&&count>=0;
   return <button key={id} className={id==='props'?'award-zap-icon':undefined} aria-label={label} title={available[id]?label:label+' is unavailable for this post'} disabled={!available[id]||pendingAction!==null} aria-busy={pendingAction===id} aria-pressed={id==='like'||id==='bookmark'?pressed?.[id]:undefined} onClick={async()=>{if(!current()||!available[id]||pendingAction!==null){unavailable();return;}setPendingAction(id);try{await onAction(id,v,{isCurrent:current});}catch{if(current())setFeedback(id==='props'?'This Props contest could not be opened. Review your selected Props sources.':'The result could not be confirmed. Review your activity before retrying.');}finally{if(current())setPendingAction(null);}}}><Icon size={21} weight={id==='props'?'fill':'regular'}/>{id!=='props'&&<span className="public-action-label">{label}</span>}{countKnown&&<span className="public-action-count">{count.toLocaleString()}</span>}</button>;
  })}</div>{feedback&&<p role="status" className="source-caption">{feedback}</p>}
 </article>;
}
