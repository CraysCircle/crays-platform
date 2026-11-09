import {storyCampaigns,type StoryCampaign} from './awardStorySeeds';
const jax=storyCampaigns[0],rival=jax.seedCompetitors[2];
/** One fully playable same-category rival; baseline identity matches the shared annual race. */
const id='campaign-music-rival',creatorId='creator-music-rival';
const chapters=[
 ['The empty room','Every chorus started somewhere.','The rehearsal room was empty when the first line arrived. This fictional chapter follows the choices behind a new song, before the stage lights.'],
 ['A chorus in progress','The note we almost left out.','Listen with your eyes in this illustrated production example: a melody idea, the words that changed, and why the first version was left behind. The motion teaser is illustrative, not an unreleased audio recording.'],
 ['A question for the room','Your creative question belongs here.','Submit a question about the songwriting process through the separate creator-selection moment. Votes support this exact contest; they do not select the questions or purchase a song credit.'],
 ['Inside the rehearsal','Our next shared chapter.','The community reached this contest’s 10,020-vote goal. Open the original animated rehearsal teaser and the written production notes. This free chapter grants no backstage ticket or music licence.'],
 ['The handwritten setlist','A separate concept, clearly described.','A signed setlist could become a separate prize-draw concept. No entry is issued when you vote; terms, eligibility, inventory and release remain separate.'],
 ['What happens next','A room becomes a community.','The story continues with the next rehearsal question. Follow freely for the next chapter. The annual Music race stays open until its published closing rules apply.'],
];
const nominationId=rival.id;
export const storyRivalCampaigns:StoryCampaign[]=[{
 ...jax,id,creatorId,nominationId,name:rival.name,title:'An Empty Room. A New Song.',
 description:'Follow a song from its first line to the rehearsal room. A different creator. The same annual Music race.',
 image:'award-creator-illustration.png',imageLabel:'Original rehearsal-room illustration · fictional creator, no real recording.',videoTeaser:'award-creator-motion-teaser.mp4',
 baseVotes:rival.votes,annualBaseVotes:rival.votes,defaultContestId:id,supporters:3140,target:10020,unlockTitle:'Inside the rehearsal · demo chapter',
 chapters:chapters.map(([title,summary,body],i)=>({id:`music-rival-chapter-${i+1}`,title,summary,body,image:'award-creator-illustration.png',video:'award-creator-motion-teaser.mp4',...(i===3?{lockedUntilVotes:10020}:{})})),
 moments:[
  {id:'rival-rehearsal-unlock',type:'community-unlock',title:'Inside the rehearsal',summary:'At10,020 Props in this contest, the next illustrated rehearsal chapter opens for all visitors.',terms:'One shared free demo chapter, scoped to this exact contest. No purchase is needed to watch once open. No actual concert or private session is confirmed.',status:'Planned local unlock'},
  {id:'rival-notes',type:'guaranteed-benefit',title:'The writing-room notes',summary:'A free written note: start with one image, remove the line that says too much, and test the chorus out loud.',terms:'The stated written note is available now to every visitor. This is a written benefit, not a promise of personal coaching, music rights or admission.',status:'Available written demo'},
  {id:'rival-question-selection',type:'creator-selection',title:'Ask about the chorus',summary:'Submit a focused songwriting question. Three example questions are selected for relevance, clarity and variety.',terms:'Free application. Vote spending is not a criterion. Creator response, selection, production rights and any subsequent recording need separate agreement.',status:'Local application example'},
  {id:'rival-setlist-draw',type:'prize-draw',title:'The signed setlist · concept',summary:'One signed setlist, separately proposed. No active draw or automatic entries.',terms:'One illustrative item. Inventory, signature, shipping, eligibility, closing and draw rules need separate release. Zero entries are created by Props.',status:'Concept · not approved'},
 ],
 creatorActions:[
  {id:'rival-new-chorus',contestId:'rival-new-chorus',contestTitle:'The line before the chorus',parentCampaignId:id,nominationId,competitionId:jax.competitionId,seasonId:jax.seasonId,creatorId,format:'story',title:'The line before the chorus',description:'A daily songwriting question, separate from the featured rehearsal goal.',baseVotes:0,status:'open',state:'active-demo',chapterId:'music-rival-chapter-1',momentId:'rival-question-selection'},
  {id:'rival-rehearsal-cut',contestId:'rival-rehearsal-cut',contestTitle:'An early rehearsal cut',parentCampaignId:id,nominationId,competitionId:jax.competitionId,seasonId:jax.seasonId,creatorId,format:'reel',title:'An early rehearsal cut',description:'A playable illustrative teaser and a new daily contest.',baseVotes:0,status:'open',state:'active-demo',chapterId:'music-rival-chapter-2',momentId:'rival-notes'},
  {id:'rival-first-room',contestId:'rival-first-room',contestTitle:'The first writing room',parentCampaignId:id,nominationId,competitionId:jax.competitionId,seasonId:jax.seasonId,creatorId,format:'post',title:'The first writing room',description:'A completed illustrated story, available without voting.',baseVotes:0,status:'non-voting',state:'delivered-demo',chapterId:'music-rival-chapter-1',momentId:'rival-notes'},
 ],
 seedCompetitors:[...jax.seedCompetitors.filter(n=>n.id!==nominationId),{id:jax.nominationId,name:jax.name,votes:jax.baseVotes}],
 cadence:'Many daily contests. One annual Music nomination. Every vote stays attached to its selected contest.',
}];
