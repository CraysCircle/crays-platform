import type {ProductWorld} from './productModel';
import {awardCampaigns,awardQualifiedVotes,canManageAward} from './awardPreview';
import {ownAwardRecords,assertAwardSlot,awardRecord,awardText,awardVersion} from './awardRecords';
export type AwardGame={id:string;campaignId:string;creatorId:string;type:'Challenge'|'Prize draw';title:string;reward:string;rules:string;status:'draft'|'published-demo';version:number};
export type AwardEntryRecord={id:string;gameId:string;gameVersion:number;voteId:string;quantity:number;submission:string;status:'entered-preview'};
function storedGame(value:unknown,id:string):value is AwardGame{
 return awardRecord(value)&&value.id===id&&['campaignId','creatorId','title','reward','rules'].every(k=>awardText(value[k]))&&['Challenge','Prize draw'].includes(String(value.type))&&['draft','published-demo'].includes(String(value.status))&&awardVersion(value.version);
}
function storedEntry(value:unknown,id:string):value is AwardEntryRecord{
 return awardRecord(value)&&value.id===id&&awardText(value.gameId)&&awardText(value.voteId)&&awardVersion(value.gameVersion)&&awardVersion(value.quantity)&&Number(value.quantity)<=1000&&typeof value.submission==='string'&&value.status==='entered-preview';
}
export function awardGames(w:ProductWorld):AwardGame[]{
 const seed:AwardGame={id:'award-game-maya',campaignId:'award-maya',creatorId:'maya-creator',type:'Prize draw',title:'Behind the lens.',reward:'A fictional backstage experience with Maya.',rules:'Eligible test profile only. One entry per valid preview vote. No real draw, guaranteed win, confirmed trip or personal contact is included.',status:'published-demo',version:1};
 return[...(!w.objects.some(o=>o.id===seed.id)&&awardCampaigns(w).some(c=>c.id===seed.campaignId)?[seed]:[]),...ownAwardRecords(w,'award-preview-game').filter(o=>storedGame(o.game,o.id)&&(w.identity.signedIn||(o.game as AwardGame).status==='published-demo')).map(o=>o.game as AwardGame)];
}
export function awardEntries(w:ProductWorld):AwardEntryRecord[]{return w.identity.signedIn?ownAwardRecords(w,'award-preview-entry').filter(o=>storedEntry(o.entry,o.id)).map(o=>o.entry as AwardEntryRecord):[];}
export function validAwardEntries(w:ProductWorld,game:AwardGame){return awardEntries(w).filter(e=>e.gameId===game.id&&e.gameVersion===game.version&&awardQualifiedVotes(w).some(v=>v.id===e.voteId&&v.quantity===e.quantity&&v.campaignId===game.campaignId&&v.status==='confirmed-demo'&&v.proof==='verified-preview'));}
export function saveAwardGame(w:ProductWorld,campaignId:string,input:Pick<AwardGame,'type'|'title'|'reward'|'rules'>,publish:boolean){
 if(!w.identity.signedIn)throw Error('Sign in before managing an action.');
 const c=awardCampaigns(w).find(c=>c.id===campaignId&&canManageAward(w,c)&&c.status==='published-demo');if(!c)throw Error('Only your own published campaign can run an action.');
 if(!['Challenge','Prize draw'].includes(input.type)||!input.title.trim()||!input.reward.trim()||input.rules.trim().length<20)throw Error('Add an action title, specific reward and meaningful participation rules.');
 const id=`award-game-own-${campaignId}`,previous=awardGames(w).find(g=>g.id===id);if(previous&&w.objects.some(o=>o.kind==='award-preview-entry'&&awardRecord(o.entry)&&o.entry.gameId===id))throw Error('Entries already refer to these rules. They cannot be silently replaced.');
 assertAwardSlot(w,id,'award-preview-game',Boolean(previous));
 const game:AwardGame={...input,id,campaignId,creatorId:c.creatorId,status:publish?'published-demo':'draft',version:(previous?.version||0)+1};
 return{...w,objects:[...w.objects.filter(o=>o.id!==id),{id,owner:w.owner,kind:'award-preview-game',game}]};
}
export function enterAwardGame(w:ProductWorld,gameId:string,voteId:string,eligibility:'eligible-example'|'ineligible-example',submission=''){
 if(!w.identity.signedIn)throw Error('Sign in before joining an action.');
 const game=awardGames(w).find(g=>g.id===gameId&&g.status==='published-demo');if(!game)throw Error('This action is not open.');
 if(eligibility!=='eligible-example')throw Error('This fictional profile is not eligible. No entry was created.');
 const vote=awardQualifiedVotes(w).find(v=>v.id===voteId&&v.campaignId===game.campaignId&&v.status==='confirmed-demo'&&v.proof==='verified-preview');if(!vote)throw Error('Choose your own confirmed votes with a verified preview proof for this exact campaign.');
 if(awardEntries(w).some(e=>e.gameId===gameId&&e.voteId===voteId))throw Error('These votes already have an entry in this action.');
 if(game.type==='Challenge'&&!submission.trim())throw Error('Add your challenge entry before submitting.');
 const id=`award-entry-${gameId}-${voteId}`,entry:AwardEntryRecord={id,gameId,gameVersion:game.version,voteId,quantity:vote.quantity,submission:submission.trim(),status:'entered-preview'};
 assertAwardSlot(w,id,'award-preview-entry',false);
 return{...w,objects:[...w.objects,{id,owner:w.owner,kind:'award-preview-entry',entry}]};
}
export function sampleAwardDraw(w:ProductWorld,gameId:string){
 if(!w.identity.signedIn)throw Error('Sign in before reviewing an organiser result.');
 const game=awardGames(w).find(g=>g.id===gameId&&awardCampaigns(w).some(c=>c.id===g.campaignId&&canManageAward(w,c))&&g.status==='published-demo'&&g.type==='Prize draw');if(!game)throw Error('Only the organiser of this preview draw can review a sample result.');
 const entries=validAwardEntries(w,game);if(!entries.length)throw Error('No valid preview entries are available.');
 const id=`award-draw-${gameId}`;if(w.objects.some(o=>o.id===id&&o.owner===w.owner))throw Error('This sample result already exists. No second draw was created.');
 assertAwardSlot(w,id,'award-preview-draw',false);
 // Deterministic local demonstration, never represented as an actual random,
 // audited, blockchain-backed or whole-population draw.
 return{...w,objects:[...w.objects,{id,owner:w.owner,kind:'award-preview-draw',gameId,entryId:entries[0].id,status:'sample-only-not-an-official-winner',createdAt:Date.now()}]};
}
