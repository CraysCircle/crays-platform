import {ArrowRight} from '@phosphor-icons/react';
import type {ProductWorld} from './productModel';
import {resolveCraysMedia} from './craysMedia';
import {ClubAdjustableRegion} from './WebAdjustableRegion';
import {ownPrivateAccount} from './ownPrivateAccount';
import './web-creator-studio.css';
export const studioDestinations=[
 {key:'profile',title:'Your public creator profile',text:'Your introduction and public links.',image:'web-content-workshop.png'},
 {key:'offers',title:'Offers & subscriptions',text:'Your original content and access terms.',image:'web-content-session.png'},
 {key:'subscribers',title:'Subscribers',text:'Review your content relationships.',image:'circle.png'},
 {key:'earnings',title:'Earnings & statements',text:'Original transactions and statements.',image:'web-commerce-receipts.png'},
 {key:'providers',title:'Media providers',text:'Original files and their sources.',image:'web-discover-camera.png'},
 {key:'recovery',title:'Rights & recovery',text:'Access evidence, backups and recovery.',image:'web-studio-rights-recovery.png'},
 {key:'membership',title:'Creator membership',text:'Creator plans and your memberships.',image:'award-creator-illustration.png'},
] as const;
export type StudioDestination=typeof studioDestinations[number]['key'];
export default function WebCreatorStudio({world,onOpen}:{world:ProductWorld;onOpen:(destination:StudioDestination)=>void}){
 if(!ownPrivateAccount(world))return <section className="web-creator-studio"><h2>Your studio stays private.</h2><p>Sign in to review your own creator workspace.</p></section>;
 return <section className="web-creator-studio"><header><h2>Creator studio</h2><p>Your content, files and offers use the same Nostr identity. Publishing, payments and access rights remain separate.</p></header><ClubAdjustableRegion id="personal-web:library:creator-studio:sections" labels={studioDestinations.map(item=>item.title)} className="web-studio-destinations" minWidth={280} basis={studioDestinations.map(()=> '48%')}>{studioDestinations.map(item=>{
 const ownPhoto=item.key==='profile'?resolveCraysMedia(world.profiles[world.owner]?.photo):'',image=ownPhoto||resolveCraysMedia(item.image);
 return <button key={item.key} aria-label={item.title} data-content-return={'studio:'+item.key} className={'web-studio-destination'+(ownPhoto?' is-own-portrait':'')} onClick={()=>onOpen(item.key)}><img src={image} alt={ownPhoto?'Your profile photo':'Illustrative '+item.title.toLowerCase()+' scene'}/><span><strong>{item.title}</strong><span>{item.text}</span></span><ArrowRight size={22}/></button>;
 })}</ClubAdjustableRegion></section>;
}
