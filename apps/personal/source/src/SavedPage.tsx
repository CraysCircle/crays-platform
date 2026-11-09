import {usePreviewExpiry} from './usePreviewExpiry';
import {nextPaidOriginalExpiry} from './paidContentAccess';
import {useRef,useState} from 'react';
import {BookmarkSimple,CaretRight,MagnifyingGlass,Plus,ArrowSquareOut,FileText,Play,FolderSimple,LockKey,Microphone,ArrowRight} from '@phosphor-icons/react';
import type {Post,ProductWorld} from './productModel';
import {libraryCollection,libraryAccessLabel} from './libraryCollection';
import {ownPersonalContentCollections,personalCollectionItems} from './personalContentCollections';
import {resolveCraysMedia} from './craysMedia';
import {canReadPaidOriginal,readableOriginalMedia} from './paidContentAccess';
import {PaidMediaCover} from './PaidMediaCover';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import './saved.css';
type Props={world:ProductWorld;onOpen:(id:string)=>void;onBookmark:(id:string)=>void;onCollections:(id?:string,create?:boolean)=>void;onSignIn:()=>void;onExplore:()=>void};
/** Resolve authorised source attachments; selected-mock artwork is scoped to one public demo original. */
export function savedArtwork(world:ProductWorld,p:Post){
 if(!canReadPaidOriginal(world,p)||!p.mediaAvailable)return '';
 if(!p.protected&&world.identity.destination==='Demo account'&&p.id==='demo-original-maya-creator-0')return '/assets/crays/web-saved-lisbon.png';
 const media=readableOriginalMedia(world,p).find(m=>m.kind==='image'&&m.state==='uploaded-preview'&&m.url);
 if(media?.url)return resolveCraysMedia(media.url);
 if(p.image)return resolveCraysMedia(p.image);
 return '';
}
export default function SavedPage({world,onOpen,onBookmark,onCollections,onSignIn,onExplore}:Props){
 usePreviewExpiry(nextPaidOriginalExpiry(world));
 const [query,setQuery]=useState(''),[selected,setSelected]=useState('');
 const detailRef=useRef<HTMLElement>(null);
 const selectOriginal=(id:string)=>{setSelected(id);if(window.matchMedia('(max-width:1000px)').matches)requestAnimationFrame(()=>detailRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'}));};
 const posts=libraryCollection(world,'Saved',query).posts;
 const active=posts.find(p=>p.id===selected)||posts[0];
 const collections=ownPersonalContentCollections(world).filter(c=>c.state==='active');
 const author=(p:Post)=>world.people.find(person=>person.id===p.author);
 const format=(p:Post)=>p.type==='note'?'POST':p.type.toUpperCase();
 const preview=(p:Post)=>p.protected&&!savedArtwork(world,p)?canReadPaidOriginal(world,p)&&!p.mediaAvailable?<span className="saved-format-art saved-unavailable-media"><FileText size={30}/><small>Media unavailable</small></span>:<PaidMediaCover/>:savedArtwork(world,p)?<img src={savedArtwork(world,p)} alt=""/>:<span className="saved-format-art">{['video','live'].includes(p.type)?<Play size={34}/>:p.type==='audio'?<Microphone size={34}/>:<FileText size={34}/>}</span>;
 if(world.identity.signedIn!==true||typeof world.owner!=='string'||!world.owner.trim()||world.owner!==world.owner.trim()||!Object.hasOwn(world.profiles,world.owner))return <main className="web-saved saved-private"><LockKey size={32}/><h1>Your saved originals stay private.</h1><p>Sign in to open your own saved content and collections.</p><button className="saved-primary" onClick={onSignIn}>Sign in</button></main>;
 const list=<section className="saved-list"><label className="saved-search"><MagnifyingGlass size={20}/><input aria-label="Search your saved content" placeholder="Search your saved content…" value={query} onChange={e=>setQuery(e.target.value)}/></label>{posts.length?<div className="saved-originals">{posts.map(p=><article key={p.id} className={'saved-original-row '+(p.id===active?.id?'is-selected':'')}><button className="saved-select-original" aria-label={'Preview saved original: '+p.title} aria-pressed={p.id===active?.id} onClick={()=>selectOriginal(p.id)}><span className="saved-thumb">{preview(p)}</span><span className="saved-row-copy"><small>{format(p)}</small><strong>{p.title}</strong><span className="saved-author">{author(p)?.avatar?<img src={resolveCraysMedia(author(p)!.avatar)} alt=""/>:null}{author(p)?.name||'Original creator'}</span><span className="saved-row-caption">{p.protected?libraryAccessLabel(world,p):p.text}</span></span></button><button className="saved-bookmark" aria-label={'Remove bookmark: '+p.title} title="Remove bookmark" onClick={()=>onBookmark(p.id)}><BookmarkSimple size={22} weight="fill"/></button><button className="saved-open-row" aria-label={'Open saved original: '+p.title} onClick={()=>onOpen(p.id)}><CaretRight size={19}/></button></article>)}</div>:<section className="saved-empty"><BookmarkSimple size={34}/><h2>{query?'No saved originals match.':'Keep something worth coming back to.'}</h2><p>{query?'Try another title or phrase.':'Save an original post, article or piece of media to find it here.'}</p>{query?<button onClick={()=>setQuery('')}>Clear search</button>:<button className="saved-primary" onClick={onExplore}>Explore originals<ArrowRight size={18}/></button>}</section>}</section>;
 const detail=<aside ref={detailRef} className="saved-detail"><ClubAdjustableRegion id="personal-web:you:saved:detail" labels={['Selected original','My collections']} className="saved-detail-regions" basis={['100%','100%']} minWidth={200}><section className="saved-selected-original">{active?<><div className="saved-preview-media">{preview(active)}</div><small className="saved-format">{format(active)}</small><h2>{active.title}</h2><div className="saved-author">{author(active)?.avatar?<img src={resolveCraysMedia(author(active)!.avatar)} alt=""/>:null}{author(active)?.name||'Original creator'}</div><p className="saved-description">{active.protected?libraryAccessLabel(world,active):active.text}</p><button className="saved-primary" onClick={()=>onOpen(active.id)}>{canReadPaidOriginal(world,active)&&active.mediaAvailable?'Open original':'Review original access'}<ArrowSquareOut size={18}/></button></>:<p className="saved-quiet">Choose a saved original to see it here.</p>}</section><section className="saved-collections"><h2>My collections</h2>{collections.length?collections.map(c=>{const item=personalCollectionItems(world,c.id).find(x=>x.status==='available');const p=item?world.posts.find(p=>p.id===item.postId):undefined;return <button className="saved-collection-row" key={c.id} onClick={()=>onCollections(c.id)}><span className="saved-collection-thumb">{p?preview(p):<FolderSimple size={25}/>}</span><span><strong>{c.name}</strong><small>{c.items.length} {c.items.length===1?'reference':'references'} · Private</small></span><CaretRight size={18}/></button>}):<p className="saved-quiet">Bring saved originals together in a private collection.</p>}<button className="saved-create" onClick={()=>onCollections('',true)}><Plus size={20}/>Create collection</button><button className="saved-all-collections" onClick={()=>onCollections()}>All collections & archived<CaretRight size={16}/></button></section></ClubAdjustableRegion></aside>;
 return <main className="web-saved"><header className="saved-heading"><div><h1>Saved</h1><p>Good things, kept close.</p></div><button className="saved-heading-create" onClick={()=>onCollections('',true)}><Plus size={19}/>Create collection</button></header><ClubAdjustableRegion id="personal-web:you:saved:columns" labels={['Saved originals','Preview and collections']} className="saved-columns" basis={['54%','44%']} minWidth={220}>{list}{detail}</ClubAdjustableRegion></main>;
}
