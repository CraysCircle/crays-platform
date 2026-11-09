import {ArrowUpRight,FilmSlate,Trophy} from '@phosphor-icons/react';
import type {ProductWorld} from './productModel';
import {storyCampaignsFor} from './awardStoryRegistry';
import {storyStanding} from './awardStoryReporting';
import './awardStory.css';

/** Repeated, useful story entry. No paid reach and no automatic financial action. */
export function AwardStorySpotlight({world,asset,onOpen,compact=false}:{world:ProductWorld;asset:(name:string)=>string;onOpen:(campaignId:string)=>void;compact?:boolean}){
 const campaign=storyCampaignsFor(world).find(c=>!world.people.some(p=>p.id===c.creatorId&&(p.blocked||p.blockedByOther)));if(!campaign)return null;const score=storyStanding(world,campaign.id);
 return <button className={`award-story-spotlight${compact?' is-compact':''}`} onClick={()=>onOpen(campaign.id)}>
   {!compact&&<img src={asset(campaign.image)} alt={campaign.imageLabel}/>}
   <span><small><Trophy size={15}/>CRAYS PROPS · DEMO</small><strong>{compact?'The next chapter is yours.':campaign.title}</strong>
     <span>{compact?'Follow your creators. Watch the race.':campaign.name+' · '+campaign.category+' · '+score.votes.toLocaleString('en-US')+' annual Props · #'+score.rank}</span>
     {!compact&&<span>One creator. Many contests. A year of stories.</span>}
     <b>{compact?'Your stories & the race':'Open the story'} <ArrowUpRight size={16}/></b>
   </span>{compact&&<FilmSlate size={24} aria-hidden="true"/>}
 </button>;
}
