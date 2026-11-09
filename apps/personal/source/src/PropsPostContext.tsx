import type {Post,ProductWorld} from './productModel';
import {storyPostBinding} from './awardStoryFeed';
import {storyContestStanding,storyStanding} from './awardStoryReporting';
export function PropsPostContext({world,post}:{world:ProductWorld;post:Post}){
 const bound=storyPostBinding(world,post);if(!bound)return null;
 const contest=storyContestStanding(world,bound.campaign.id,bound.contestId),annual=storyStanding(world,bound.campaign.id);
 const primary=bound.contestId===bound.campaign.id;
 return <section className="feed-props-summary" aria-label="This contest’s Props progress"><span>{bound.campaign.category} · PROPS CONTEST · DEMO</span><strong>{post.title}</strong>{primary&&<progress value={Math.min(contest.votes,bound.campaign.target)} max={bound.campaign.target} aria-label="Shared contest goal"/>}<small>{contest.votes.toLocaleString('en-US')} Props in this contest{primary?` · ${contest.remaining.toLocaleString('en-US')} to the shared reveal`:''}</small><small>Current {bound.campaign.category} rank: {annual.rank?`#${annual.rank}`:'unranked'} · $1 = 1 Prop</small></section>;
}
