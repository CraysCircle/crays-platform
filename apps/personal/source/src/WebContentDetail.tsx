import {useEffect,useRef,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,Eye,FileText} from '@phosphor-icons/react';
import type {Post,ProductWorld} from './productModel';
import {savedArtwork} from './SavedPage';
import {canReadPaidOriginal} from './paidContentAccess';
import {resolveCraysMedia} from './craysMedia';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import {contentStatus,contentAccessLabel} from './WebContentManager';
import './web-content-detail.css';
export default function WebContentDetail({world,post,onBack,onPreview,children}:{world:ProductWorld;post:Post;onBack:()=>void;onPreview:()=>void;children:ReactNode}){
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const timer=setTimeout(()=>{const root=heading.current?.closest('.web-content-detail');if(root&&!root.contains(document.activeElement))heading.current?.focus({preventScroll:true});},350);return()=>clearTimeout(timer);},[]);
 const readable=canReadPaidOriginal(world,post),image=savedArtwork(world,post),own=post.author===world.owner?world.profiles[world.owner]:undefined,authors=world.people.filter(p=>p.id===post.author),author=own?{name:own.name,photo:own.photo}:authors.length===1?{name:authors[0].name,photo:authors[0].avatar}:undefined;
 return <main className="web-desktop-page web-content-detail" data-content-owner={world.owner} data-content-post={post.id}><button className="web-content-detail-back" onClick={onBack}><ArrowLeft size={20}/>Back to your content</button><ClubAdjustableRegion id="personal-web:library:content-detail:columns" labels={['Original content preview','Manage this original']} className="web-content-detail-columns" basis={['56%','42%']} minWidth={280}><section className="web-content-detail-original"><p className="web-content-detail-format">{post.type==='note'?'POST':post.type.toUpperCase()} · {contentAccessLabel(post).toUpperCase()}</p><h1 ref={heading} tabIndex={-1}>{post.title}</h1><div className="web-content-detail-author">{author&&<>{author.photo&&<img src={resolveCraysMedia(author.photo)} alt=""/>}<span>{author.name}</span></>}<span>{post.archived?'Archived':post.status==='draft'?'Private draft':contentStatus(post)}</span></div>{image?<img className="web-content-detail-cover" src={image} alt={post.alt||post.title}/>:<div className="web-content-detail-no-media"><FileText size={36}/><p>Original preview unavailable</p></div>}<p className="web-content-detail-excerpt">{readable?post.text.slice(0,300):'The original content is unavailable with current access. Review its original rights and source before opening it.'}</p><button className="web-content-detail-preview" onClick={onPreview}><Eye size={24}/><span>Preview full content</span><ArrowRight size={22}/></button></section><aside className="web-content-detail-actions">{children}</aside></ClubAdjustableRegion></main>;
}
