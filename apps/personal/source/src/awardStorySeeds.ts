import {awardCategories, awardSubcategories} from './awardCategories';

/** Existing clickdummy only. Every creator, counter, chapter and outcome is
 * fictional. This module is immutable seed metadata, never a vote/payment store.
 * Only the canonical counted ledger may derive exact-contest goals and annual nominee totals. An order buys votes for one named contest; only the annual ranking aggregates contests.
 */
export type StoryMomentType = 'community-unlock' | 'guaranteed-benefit' | 'creator-selection' | 'prize-draw';
export type StoryIdea = {title:string; description:string; type:StoryMomentType; world:string; source:string};
export type StoryChapter = {id:string; title:string; summary:string; body:string; lockedUntilVotes?:number; image:string; video?:string};
export type StoryMoment = {id:string; type:StoryMomentType; title:string; summary:string; terms:string; status:string};
export type StoryCreatorAction = {id:string; parentCampaignId:string; nominationId:string; competitionId:string; seasonId:string; creatorId:string; contestId:string; contestTitle:string; baseVotes:number; target?:number; status:'open'|'closed'|'non-voting'; format:'story'|'reel'|'post'|'challenge'; title:string; description:string; state:'active-demo'|'delivered-demo'; chapterId:string; momentId:string};
export type StoryCampaign = {
  id:string; nominationId:string; competitionId:string; seasonId:string; creatorId:string;
  name:string; category:string; subcategory:string; title:string; description:string; image:string; imageLabel:string; videoTeaser?:string;
  baseVotes:number; annualBaseVotes:number; defaultContestId:string; supporters:number; target:number; unlockTitle:string;
  chapters:StoryChapter[]; moments:StoryMoment[];
  seedCompetitors:{id:string;name:string;votes:number}[]; ideas:StoryIdea[];
  creatorActions:StoryCreatorAction[]; cadence:string;
  status:'active'|'closed'|'pending'; seasonStatus:'open'|'closed';
};

/** Original workbook structure remains authoritative; no 90 fake competitions.
 * Display Digital & Web3 is distinct from source spelling Digitel & Web3.
 */
export const storyAwardWorlds = awardCategories;
export const storyAwardSubcategories = awardSubcategories;
export const storyTaxonomySource = {file:'Categories for Award.xlsx', sheet:'Tabelle1', range:'B2:J14', sourceDigitalLabel:'Digitel & Web3', mainCategories:9, subcategories:90} as const;
export const storyCeremony = {
  url:'https://www.craysaward.com/',
  title:'The annual CRAYS Props Award live event',
  prizes:'The final Top 3 in each selected category receive their prizes in person at the annual event.',
  honour:'Only the final first-place winner receives a permanent star and handprint in the floor of every global CRAYS Club.',
  boundary:'Live positions are provisional. No qualification, prize, ticket, travel, membership, installed honour, date or venue is confirmed by these demo rankings.',
} as const;

/** Research specification L174–182: exactly four templates in each of nine worlds. */
export const storyIdeaLibrary: StoryIdea[] = [
  {
    "world": "Entrepreneurship",
    "title": "A day inside the founder team",
    "description": "Follow a product decision from user problem to prototype. A separate fit-based application selects the demo guest.",
    "type": "creator-selection",
    "source": "research-spec:L174"
  },
  {
    "world": "Entrepreneurship",
    "title": "Live pitch clinic",
    "description": "Submit one problem and receive a written example critique with the published scope. No investor introduction or funding promise.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L174"
  },
  {
    "world": "Entrepreneurship",
    "title": "Take the product apart",
    "description": "A shared goal opens a public product teardown, including what failed and what changed.",
    "type": "community-unlock",
    "source": "research-spec:L174"
  },
  {
    "world": "Entrepreneurship",
    "title": "A small founders table",
    "description": "Apply for a limited dinner conversation with a defined agenda and a published outcome. No vote buys a seat.",
    "type": "creator-selection",
    "source": "research-spec:L174"
  },
  {
    "world": "Digital & Web3",
    "title": "Build something open",
    "description": "Help shape a small open-source feature through a separately selected contribution. No token, investment or project endorsement.",
    "type": "creator-selection",
    "source": "research-spec:L175"
  },
  {
    "world": "Digital & Web3",
    "title": "First look at an application",
    "description": "A community threshold opens a written walkthrough of an early application, with known limitations.",
    "type": "community-unlock",
    "source": "research-spec:L175"
  },
  {
    "world": "Digital & Web3",
    "title": "Read the code together",
    "description": "A clearly scoped example code-review session explains a selected snippet. It is not a security certification.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L175"
  },
  {
    "world": "Digital & Web3",
    "title": "A feature for the community",
    "description": "Submit a nonfinancial feature proposal; selection uses usefulness, feasibility and accessibility rather than spending.",
    "type": "creator-selection",
    "source": "research-spec:L175"
  },
  {
    "world": "Content Creator",
    "title": "Produce the next episode",
    "description": "Submit a 30-second story pitch; the creator chooses by originality, fit and permission to use it.",
    "type": "creator-selection",
    "source": "research-spec:L176"
  },
  {
    "world": "Content Creator",
    "title": "A short film, carefully watched",
    "description": "A defined written critique is the benefit in this local example, not unlimited private access to the creator.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L176"
  },
  {
    "world": "Content Creator",
    "title": "The guest microphone",
    "description": "Apply to co-host one podcast segment with format, recording scope and credits reviewed independently.",
    "type": "creator-selection",
    "source": "research-spec:L176"
  },
  {
    "world": "Content Creator",
    "title": "Your script, our mini-documentary",
    "description": "Follow the selected script through the edit; a shared goal opens the written premiere chapter for everyone.",
    "type": "community-unlock",
    "source": "research-spec:L176"
  },
  {
    "world": "Living",
    "title": "Walk through the architect’s thinking",
    "description": "A described concept walkthrough explains one room and the choices behind it; it is not a confirmed property tour.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L177"
  },
  {
    "world": "Living",
    "title": "Design a room together",
    "description": "Submit a room sketch and explain one practical need. Selection is based on fit, not purchased Props.",
    "type": "creator-selection",
    "source": "research-spec:L177"
  },
  {
    "world": "Living",
    "title": "Test a way of living",
    "description": "Apply for a separately approved concept test day. Property, date, accessibility and capacity need confirmation.",
    "type": "creator-selection",
    "source": "research-spec:L177"
  },
  {
    "world": "Living",
    "title": "A community week, clearly described",
    "description": "Explore a planned week with exact inclusions and availability. This is a separate benefit concept, not a stay or membership won by voting.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L177"
  },
  {
    "world": "Fashion",
    "title": "Number one from the collection",
    "description": "One numbered item is a separate giveaway concept. Size, alterations, delivery region and stock must be defined.",
    "type": "prize-draw",
    "source": "research-spec:L178"
  },
  {
    "world": "Fashion",
    "title": "Inside the atelier",
    "description": "Apply for a fitting and studio day; selection criteria and image consent are independent from Props spending.",
    "type": "creator-selection",
    "source": "research-spec:L178"
  },
  {
    "world": "Fashion",
    "title": "Step into the campaign",
    "description": "Submit a short shooting application. Availability, creative fit and usage rights determine selection.",
    "type": "creator-selection",
    "source": "research-spec:L178"
  },
  {
    "world": "Fashion",
    "title": "Choose a design detail",
    "description": "A free creative poll shapes a colour detail; the shared look reveal is distinct from paid Props.",
    "type": "community-unlock",
    "source": "research-spec:L178"
  },
  {
    "world": "Art",
    "title": "Leave a line in the mural",
    "description": "A separate application selects a small group to help create a shared work; location and permissions remain a concept.",
    "type": "creator-selection",
    "source": "research-spec:L179"
  },
  {
    "world": "Art",
    "title": "The original sketch",
    "description": "A signed original sketch is a limited separate draw concept, not an item acquired with an Props.",
    "type": "prize-draw",
    "source": "research-spec:L179"
  },
  {
    "world": "Art",
    "title": "A portrait with a story",
    "description": "Apply for a personal photo project with a clear brief, image consent and selected-use terms.",
    "type": "creator-selection",
    "source": "research-spec:L179"
  },
  {
    "world": "Art",
    "title": "A small exhibition, a close look",
    "description": "A written curator’s tour is the example benefit, with artwork context and no claim of physical admission.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L179"
  },
  {
    "world": "Lifestyle",
    "title": "Train with a coach",
    "description": "Apply for one defined coaching example; suitability, timing and permissions are separate. No health guarantee follows.",
    "type": "creator-selection",
    "source": "research-spec:L180"
  },
  {
    "world": "Lifestyle",
    "title": "Find the rhythm",
    "description": "A shared goal opens the written DJ or dance workshop chapter. Actual tuition, attendance or playback is not claimed.",
    "type": "community-unlock",
    "source": "research-spec:L180"
  },
  {
    "world": "Lifestyle",
    "title": "Make the club evening yours",
    "description": "Submit a small programme idea; the creator selects by practical fit. There is no automatic club entry.",
    "type": "creator-selection",
    "source": "research-spec:L180"
  },
  {
    "world": "Lifestyle",
    "title": "A moment at a CRAYS Spot",
    "description": "Explore a clearly scoped gathering concept; a separate benefit would need confirmed place, date and included services.",
    "type": "guaranteed-benefit",
    "source": "research-spec:L180"
  },
  {
    "world": "Music",
    "title": "Before the doors open",
    "description": "A community goal reveals the soundcheck chapter and a written Q&A for all campaign visitors.",
    "type": "community-unlock",
    "source": "research-spec:L181"
  },
  {
    "world": "Music",
    "title": "Notes before the song",
    "description": "A handwritten song-note page is a separate limited keepsake concept, with rights and delivery still to approve.",
    "type": "prize-draw",
    "source": "research-spec:L181"
  },
  {
    "world": "Music",
    "title": "Listen before release",
    "description": "A shared milestone opens an annotated listening-story example, not a fabricated unreleased audio file.",
    "type": "community-unlock",
    "source": "research-spec:L181"
  },
  {
    "world": "Music",
    "title": "Let the fan cover be heard",
    "description": "Submit a cover idea; the creator selects it using published criteria and explicit permission to feature it.",
    "type": "creator-selection",
    "source": "research-spec:L181"
  },
  {
    "world": "Actors",
    "title": "See how the set works",
    "description": "A production-approved set visit needs its own application, capacity and conditions. No payment buys a role.",
    "type": "creator-selection",
    "source": "research-spec:L182"
  },
  {
    "world": "Actors",
    "title": "Around the table",
    "description": "The shared target unlocks a written table-read chapter for all visitors, without a casting advantage.",
    "type": "community-unlock",
    "source": "research-spec:L182"
  },
  {
    "world": "Actors",
    "title": "One scene, one audition",
    "description": "A separately reviewed casting application uses suitability, production approval and rights. Vote quantity is irrelevant.",
    "type": "creator-selection",
    "source": "research-spec:L182"
  },
  {
    "world": "Actors",
    "title": "A premiere, precisely promised",
    "description": "A premiere concept states ticket count, guest rules and whether travel is included. It remains a separate draw until approved.",
    "type": "prize-draw",
    "source": "research-spec:L182"
  }
];

/** Initial concept’s full24idea breadth retained alongside the refined library. */
export const originalCreatorIdeas: StoryIdea[] = [
  {
    "world": "Music",
    "title": "The concert jacket",
    "description": "A one-item stage-jacket giveaway concept; independent rules and no automatic vote entry.",
    "type": "prize-draw",
    "source": "concept-original:L345; strategy:L214"
  },
  {
    "world": "Music",
    "title": "Two backstage passes",
    "description": "A separately scoped two-person backstage experience, with show/date/age/accessibility still to approve.",
    "type": "creator-selection",
    "source": "concept-original:L346; strategy:L215"
  },
  {
    "world": "Music",
    "title": "At the soundcheck",
    "description": "A soundcheck-attendance application, separate from the community written soundcheck unlock.",
    "type": "creator-selection",
    "source": "concept-original:L347; strategy:L216"
  },
  {
    "world": "Music",
    "title": "The unreleased demo",
    "description": "A milestone reveals an annotated song-demo story; no genuine unreleased audio is claimed.",
    "type": "community-unlock",
    "source": "concept-original:L348; strategy:L217"
  },
  {
    "world": "Music",
    "title": "A cover, together",
    "description": "A fan-cover selection for a shared post needs fit-based criteria and explicit usage consent.",
    "type": "creator-selection",
    "source": "concept-original:L349; strategy:L218"
  },
  {
    "world": "Music",
    "title": "After the concert",
    "description": "A limited meet-and-greet concept states guest count, timing and boundaries independently.",
    "type": "creator-selection",
    "source": "concept-original:L350; strategy:L219"
  },
  {
    "world": "Fashion",
    "title": "The first piece",
    "description": "One numbered new-collection item remains a separate draw concept with stock, size and delivery terms.",
    "type": "prize-draw",
    "source": "concept-original:L367; strategy:L236"
  },
  {
    "world": "Fashion",
    "title": "The designer’s shoot",
    "description": "A separately selected studio photo session with usage consent; voting never reserves a place.",
    "type": "creator-selection",
    "source": "concept-original:L368; strategy:L237"
  },
  {
    "world": "Fashion",
    "title": "Behind fashion week",
    "description": "A separately approved backstage day with exact date, venue and access limitations.",
    "type": "creator-selection",
    "source": "concept-original:L369; strategy:L238"
  },
  {
    "world": "Fashion",
    "title": "Our colour detail",
    "description": "A free creative poll influences the reveal, clearly distinct from paid Props.",
    "type": "community-unlock",
    "source": "concept-original:L370; strategy:L239"
  },
  {
    "world": "Fashion",
    "title": "A signed runway outfit",
    "description": "One signed outfit is a draw concept with condition, size and shipping disclosed separately.",
    "type": "prize-draw",
    "source": "concept-original:L371; strategy:L240"
  },
  {
    "world": "Fashion",
    "title": "Join the production",
    "description": "A creative-fit application selects a fan for one campaign production, with credits/rights reviewed.",
    "type": "creator-selection",
    "source": "concept-original:L372; strategy:L241"
  },
  {
    "world": "Actors",
    "title": "A small part, properly cast",
    "description": "A possible cameo requires casting, suitability and production approval; no role is sold by voting.",
    "type": "creator-selection",
    "source": "concept-original:L389; strategy:L258"
  },
  {
    "world": "Actors",
    "title": "A real set, a separate invitation",
    "description": "A set-visit concept with production consent, guest count and no filming guarantee.",
    "type": "creator-selection",
    "source": "concept-original:L390; strategy:L259"
  },
  {
    "world": "Actors",
    "title": "The premiere moment",
    "description": "A separate premiere-ticket concept with guest/travel conditions, never guaranteed by an Props.",
    "type": "prize-draw",
    "source": "concept-original:L391; strategy:L260"
  },
  {
    "world": "Content Creator",
    "title": "Make a video together",
    "description": "One selected fan collaborates under an agreed brief, credit and usage rights.",
    "type": "creator-selection",
    "source": "concept-original:L392; strategy:L261"
  },
  {
    "world": "Content Creator",
    "title": "The unseen making-of",
    "description": "A community goal reveals a written behind-the-scenes episode, not falsely labelled real footage.",
    "type": "community-unlock",
    "source": "concept-original:L393; strategy:L262"
  },
  {
    "world": "Content Creator",
    "title": "Choose the next project",
    "description": "Free idea submission and creative selection shape a project; paid Props support does not buy the outcome.",
    "type": "creator-selection",
    "source": "concept-original:L394; strategy:L263"
  },
  {
    "world": "Entrepreneurship",
    "title": "A mentoring day",
    "description": "A separate limited session based on professional fit, not an investment or guaranteed private relationship.",
    "type": "creator-selection",
    "source": "concept-original:L411; strategy:L280"
  },
  {
    "world": "Entrepreneurship",
    "title": "Pitch your startup",
    "description": "A reviewed pitch opportunity with defined audience; no promised investor participation or funding.",
    "type": "creator-selection",
    "source": "concept-original:L412; strategy:L281"
  },
  {
    "world": "Entrepreneurship",
    "title": "The founders dinner",
    "description": "A defined discussion and documented takeaways; a separate application handles scarce seats.",
    "type": "creator-selection",
    "source": "concept-original:L413; strategy:L282"
  },
  {
    "world": "Digital & Web3",
    "title": "Build in the hackathon team",
    "description": "A contribution-based application for a conceptual team place with no token entitlement.",
    "type": "creator-selection",
    "source": "concept-original:L414; strategy:L283"
  },
  {
    "world": "Digital & Web3",
    "title": "Our next useful feature",
    "description": "A shared nonfinancial feature idea and public reveal; consent precedes any publishing.",
    "type": "community-unlock",
    "source": "concept-original:L415; strategy:L284"
  },
  {
    "world": "Entrepreneurship",
    "title": "A workshop worth keeping",
    "description": "A complete written masterclass example in this demo; physical attendance is a separate offering.",
    "type": "guaranteed-benefit",
    "source": "concept-original:L416; strategy:L285"
  }
];

/** The six campaign IDs and exact nomination identities are separate from all historical award-preview records. */
export const storyCampaigns: StoryCampaign[] = [
  {
    "id": "campaign-jax",
    "nominationId": "nomination-jax-music",
    "competitionId": "competition-music",
    "seasonId": "season-demo-2026",
    "creatorId": "creator-jax",
    "name": "JAX NOVA",
    "category": "Music",
    "subcategory": "Male Artist of the Year",
    "title": "The Jacket. The Story. Your Chapter.",
    "description": "One seam. One story. Follow the story, help the shared chapter open and explore separate creator moments. Fictional creator · local demo.",
    "image": "award-jax-jacket-illustration.png",
    "videoTeaser": "award-jax-motion-teaser.mp4",
    "imageLabel": "Original campaign illustration · fictional creator demo, not a confirmed event.",
    "baseVotes": 9995,
    "supporters": 3420,
    "target": 10000,
    "unlockTitle": "Soundcheck film · written demo",
    "chapters": [
      {
        "id": "jax-chapter-1",
        "title": "The jacket remembers",
        "summary": "One seam. One story.",
        "body": "Fictional story: “That repair by the cuff is the night I nearly missed my cue. Nobody in the crowd saw it. The people behind the curtain did.” JAX invites the community into the work behind a performance. The existing CRAYS image is atmosphere only; it is not JAX or an actual jacket.",
        "video": "award-jax-motion-teaser.mp4",
        "image": "award-jax-jacket-illustration.png"
      },
      {
        "id": "jax-chapter-2",
        "title": "The first room that listened",
        "summary": "The beginning before the big stage.",
        "body": "Fictional scene: a small room, one borrowed microphone and a friend making the lights work. JAX remembers the people who stayed for the last song. This written episode is the demo original; no concert archive footage is available.",
        "video": "award-jax-motion-teaser.mp4",
        "image": "award-jax-jacket-illustration.png"
      },
      {
        "id": "jax-chapter-3",
        "title": "Five Props to the next chapter",
        "summary": "9,995 of 10,000. One shared soundcheck.",
        "body": "The next goal is a shared chapter for every campaign visitor. Ten valid demo Props take JAX from 9,995 to 10,005; they do not buy a private film licence, the jacket or a draw entry. The preview’s counted ledger, not opening this page, controls the reveal.",
        "video": "award-jax-motion-teaser.mp4",
        "image": "award-jax-jacket-illustration.png"
      },
      {
        "id": "jax-chapter-4",
        "title": "Before the doors open",
        "summary": "The soundcheck story opens for everyone.",
        "body": "Unlocked written scene: “We tried the quiet version first. You could hear the drummer counting through the empty room. Then the chorus arrived and everyone looked up.” JAX explains why the second take became the show’s opening. This is a written soundcheck-film stand-in, not a playable or unreleased real film.",
        "video": "award-jax-motion-teaser.mp4",
        "image": "award-jax-jacket-illustration.png",
        "lockedUntilVotes": 10000
      },
      {
        "id": "jax-chapter-5",
        "title": "Ask about that night",
        "summary": "A question can open a different story.",
        "body": "Fictional Q&A: “What would you keep if the jacket disappeared?” “The people who made that show possible.” Read the reply, suggest another question through the demo application and follow the next chapter without paying or sharing your identity publicly.",
        "video": "award-jax-motion-teaser.mp4",
        "image": "award-jax-jacket-illustration.png"
      },
      {
        "id": "jax-chapter-6",
        "title": "The jacket is its own promise",
        "summary": "A reveal is not a prize ticket.",
        "body": "One signed jacket remains a separately governed giveaway concept. Quantity, condition, eligibility, delivery and approval must be known before any real entry opens. The film-story reveal and the eventual fulfilment story remain independent; no winner is announced by this demo.",
        "video": "award-jax-motion-teaser.mp4",
        "image": "award-jax-jacket-illustration.png"
      }
    ],
    "moments": [
      {
        "id": "jax-moment-unlock",
        "type": "community-unlock",
        "title": "Before the doors open",
        "summary": "Read the soundcheck story at 10,000 counted Props.",
        "terms": "Only valid counted Props in the exact main contest campaign-jax advance its 10,000-vote target and written demo unlock. Props in another contest count toward the same annual nomination but do not advance this contest’s unlock. The chapter is for all campaign visitors, with no purchase or follow prerequisite. No genuine film, audio or live stream is claimed.",
        "status": "Awaiting community goal"
      },
      {
        "id": "jax-moment-notes",
        "type": "guaranteed-benefit",
        "title": "A rehearsal note, yours to read",
        "summary": "The complete local note is shown in this card: count in quietly, listen to the empty room, then let the chorus arrive.",
        "terms": "Guaranteed only within this local example: opening this card supplies the complete written note described above. No physical service, personal reply, booking, paid-content licence or creator contact is promised. It is available without buying Props.",
        "status": "Available written demo"
      },
      {
        "id": "jax-moment-application",
        "type": "creator-selection",
        "title": "A fan cover for the next chapter",
        "summary": "Submit a cover idea. Fit, originality and usage permission are the criteria.",
        "terms": "Local application example only. Criteria: creative or professional fit, practical availability and explicit permission to review the submission. Submitted, under review and selected remain separate. Buying Props gives no advantage. No real application is sent, no seat/role/visit confirmed, no private contact or travel included.",
        "status": "Application example"
      },
      {
        "id": "jax-moment-giveaway",
        "type": "prize-draw",
        "title": "One signed stage jacket",
        "summary": "One keepsake concept, separate from the soundcheck reveal.",
        "terms": "Concept only; entries are not open and no real draw is run. A vote creates zero tickets and changes no odds. Eligibility, age/country, free entry route if applicable, deadline, inventory, organiser and delivery terms require separate approval. No winner, date or partnership is claimed.",
        "status": "Concept · entries closed"
      }
    ],
    "seedCompetitors": [
      {
        "id": "music-rival-1",
        "name": "Fictional Music nominee 1",
        "votes": 12000
      },
      {
        "id": "music-rival-2",
        "name": "Fictional Music nominee 2",
        "votes": 11000
      },
      {
        "id": "music-rival-3",
        "name": "Fictional Music nominee 3",
        "votes": 10002
      }
    ],
    "ideas": [
      {
        "world": "Music",
        "title": "Before the doors open",
        "description": "A community goal reveals the soundcheck chapter and a written Q&A for all campaign visitors.",
        "type": "community-unlock",
        "source": "research-spec:L181"
      },
      {
        "world": "Music",
        "title": "Notes before the song",
        "description": "A handwritten song-note page is a separate limited keepsake concept, with rights and delivery still to approve.",
        "type": "prize-draw",
        "source": "research-spec:L181"
      },
      {
        "world": "Music",
        "title": "Listen before release",
        "description": "A shared milestone opens an annotated listening-story example, not a fabricated unreleased audio file.",
        "type": "community-unlock",
        "source": "research-spec:L181"
      },
      {
        "world": "Music",
        "title": "Let the fan cover be heard",
        "description": "Submit a cover idea; the creator selects it using published criteria and explicit permission to feature it.",
        "type": "creator-selection",
        "source": "research-spec:L181"
      },
      {
        "world": "Lifestyle",
        "title": "Train with a coach",
        "description": "Apply for one defined coaching example; suitability, timing and permissions are separate. No health guarantee follows.",
        "type": "creator-selection",
        "source": "research-spec:L180"
      },
      {
        "world": "Lifestyle",
        "title": "Find the rhythm",
        "description": "A shared goal opens the written DJ or dance workshop chapter. Actual tuition, attendance or playback is not claimed.",
        "type": "community-unlock",
        "source": "research-spec:L180"
      }
    ],
    "status": "active",
    "seasonStatus": "open",
    "defaultContestId": "campaign-jax",
    "annualBaseVotes": 9995,
    "creatorActions": [
      {
        "id": "action-jax-jacket-closeup",
        "parentCampaignId": "campaign-jax",
        "nominationId": "nomination-jax-music",
        "competitionId": "competition-music",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-jax",
        "contestId": "action-jax-jacket-closeup",
        "contestTitle": "The jacket remembers",
        "baseVotes": 0,
        "status": "open",
        "format": "story",
        "title": "The jacket remembers",
        "description": "One seam. One story. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "jax-chapter-1",
        "momentId": "jax-moment-notes"
      },
      {
        "id": "action-jax-soundcheck-storyboard",
        "parentCampaignId": "campaign-jax",
        "nominationId": "nomination-jax-music",
        "competitionId": "competition-music",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-jax",
        "contestId": "action-jax-soundcheck-storyboard",
        "contestTitle": "Before the doors open",
        "baseVotes": 0,
        "status": "open",
        "format": "reel",
        "title": "Before the doors open",
        "description": "Written Reel storyboard — no real clip. The soundcheck story opens for everyone. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "jax-chapter-4",
        "momentId": "jax-moment-unlock"
      },
      {
        "id": "action-jax-fan-cover",
        "parentCampaignId": "campaign-jax",
        "nominationId": "nomination-jax-music",
        "competitionId": "competition-music",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-jax",
        "contestId": "action-jax-fan-cover",
        "contestTitle": "Your cover, our next chapter",
        "baseVotes": 0,
        "status": "open",
        "format": "challenge",
        "title": "Your cover, our next chapter",
        "description": "A question can open a different story. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "jax-chapter-5",
        "momentId": "jax-moment-application"
      },
      {
        "id": "action-jax-first-room",
        "parentCampaignId": "campaign-jax",
        "nominationId": "nomination-jax-music",
        "competitionId": "competition-music",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-jax",
        "contestId": "action-jax-first-room",
        "contestTitle": "The first room that listened",
        "baseVotes": 0,
        "status": "non-voting",
        "format": "post",
        "title": "The first room that listened",
        "description": "The beginning before the big stage. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "delivered-demo",
        "chapterId": "jax-chapter-2",
        "momentId": "jax-moment-notes"
      }
    ],
    "cadence": "Creators can run hundreds of Props campaigns through Stories, Reels, Posts and Challenges during one year. These four fictional examples share one annual nomination total; they are not a fabricated year of completed activity."
  },
  {
    "id": "campaign-nera",
    "nominationId": "nomination-nera-fashion",
    "competitionId": "competition-fashion",
    "seasonId": "season-demo-2026",
    "creatorId": "creator-nera",
    "name": "STUDIO NERA",
    "category": "Fashion",
    "subcategory": "Fashion Designer of the Year",
    "title": "Wear Chapter One.",
    "description": "A collection starts before the finished photograph. Follow the story, help the shared chapter open and explore separate creator moments. Fictional creator · local demo.",
    "image": "award-fashion-illustration.png",
    "videoTeaser": "award-fashion-motion-teaser.mp4",
    "imageLabel": "Original campaign illustration · fictional creator demo, not a confirmed event.",
    "baseVotes": 4780,
    "supporters": 1260,
    "target": 5000,
    "unlockTitle": "The complete look · written demo",
    "chapters": [
      {
        "id": "nera-chapter-1",
        "title": "Three materials, one beginning",
        "summary": "A collection starts before the finished photograph.",
        "body": "Fictional studio brief: linen for movement, a dark woven sample for structure, a soft lining for comfort. STUDIO NERA explains what each material changes. This is a written collection concept with an illustrative CRAYS interior, not a photograph of actual sample fabrics.",
        "video": "award-fashion-motion-teaser.mp4",
        "image": "award-fashion-illustration.png"
      },
      {
        "id": "nera-chapter-2",
        "title": "Choose the detail",
        "summary": "Creative poll — not Props.",
        "body": "The community can propose midnight blue, warm sand or a small red seam for one detail. This free creative choice does not add Props, buy reach or improve a shooting application. The creator explains the chosen direction in the next episode.",
        "video": "award-fashion-motion-teaser.mp4",
        "image": "award-fashion-illustration.png"
      },
      {
        "id": "nera-chapter-3",
        "title": "The sketch takes shape",
        "summary": "Why the line moved.",
        "body": "Fictional studio note: “We moved the seam because the sleeve needed room. The silhouette should work when you walk, not only when you stand still.” Fans can follow the design decision before deciding whether to support the nomination.",
        "video": "award-fashion-motion-teaser.mp4",
        "image": "award-fashion-illustration.png"
      },
      {
        "id": "nera-chapter-4",
        "title": "Wear chapter one",
        "summary": "At 5,000, the first complete look.",
        "body": "Unlocked written reveal: a structured outer layer, a moving sleeve and the community’s small colour detail, described from front to back. The reveal is available to all campaign visitors after the common goal. No real garment image, ownership or digital purchase licence is implied.",
        "video": "award-fashion-motion-teaser.mp4",
        "image": "award-fashion-illustration.png",
        "lockedUntilVotes": 5000
      },
      {
        "id": "nera-chapter-5",
        "title": "Step into the campaign",
        "summary": "A photo session has its own selection.",
        "body": "The fictional shooting brief asks for a short introduction, availability and comfort with the image-use terms. Creative fit and consent determine the selection. Purchased Props never appear in the selection criteria, and applying does not confirm a trip or shoot.",
        "video": "award-fashion-motion-teaser.mp4",
        "image": "award-fashion-illustration.png"
      },
      {
        "id": "nera-chapter-6",
        "title": "The first numbered piece",
        "summary": "One item, precise conditions.",
        "body": "The separate giveaway concept specifies one item, example size to be agreed, alterations not confirmed and delivery region pending. Its opening requires approved rules. Follow the design story freely; no Props creates an entry or purchases the garment.",
        "video": "award-fashion-motion-teaser.mp4",
        "image": "award-fashion-illustration.png"
      }
    ],
    "moments": [
      {
        "id": "nera-moment-unlock",
        "type": "community-unlock",
        "title": "The first complete look",
        "summary": "At 5,000, reveal the written collection chapter for all visitors.",
        "terms": "Only valid counted Props in the exact main contest campaign-nera advance its 5,000-vote target and written demo unlock. Props in another contest count toward the same annual nomination but do not advance this contest’s unlock. The chapter is for all campaign visitors, with no purchase or follow prerequisite. No genuine film, audio or live stream is claimed.",
        "status": "Awaiting community goal"
      },
      {
        "id": "nera-moment-notes",
        "type": "guaranteed-benefit",
        "title": "The atelier’s written guide",
        "summary": "The local guide explains three materials, the moving sleeve and the red seam; read it here without buying Props.",
        "terms": "Guaranteed only within this local example: opening this card supplies the complete written note described above. No physical service, personal reply, booking, paid-content licence or creator contact is promised. It is available without buying Props.",
        "status": "Available written demo"
      },
      {
        "id": "nera-moment-application",
        "type": "creator-selection",
        "title": "The collection shoot",
        "summary": "Apply with your creative idea, availability and image-use consent.",
        "terms": "Local application example only. Criteria: creative or professional fit, practical availability and explicit permission to review the submission. Submitted, under review and selected remain separate. Buying Props gives no advantage. No real application is sent, no seat/role/visit confirmed, no private contact or travel included.",
        "status": "Application example"
      },
      {
        "id": "nera-moment-giveaway",
        "type": "prize-draw",
        "title": "The first numbered piece",
        "summary": "One item concept; size, alterations and shipping need separate approval.",
        "terms": "Concept only; entries are not open and no real draw is run. A vote creates zero tickets and changes no odds. Eligibility, age/country, free entry route if applicable, deadline, inventory, organiser and delivery terms require separate approval. No winner, date or partnership is claimed.",
        "status": "Concept · entries closed"
      }
    ],
    "seedCompetitors": [
      {
        "id": "fashion-rival-1",
        "name": "Fictional Fashion nominee 1",
        "votes": 6200
      },
      {
        "id": "fashion-rival-2",
        "name": "Fictional Fashion nominee 2",
        "votes": 5600
      },
      {
        "id": "fashion-rival-3",
        "name": "Fictional Fashion nominee 3",
        "votes": 5002
      }
    ],
    "ideas": [
      {
        "world": "Fashion",
        "title": "Number one from the collection",
        "description": "One numbered item is a separate giveaway concept. Size, alterations, delivery region and stock must be defined.",
        "type": "prize-draw",
        "source": "research-spec:L178"
      },
      {
        "world": "Fashion",
        "title": "Inside the atelier",
        "description": "Apply for a fitting and studio day; selection criteria and image consent are independent from Props spending.",
        "type": "creator-selection",
        "source": "research-spec:L178"
      },
      {
        "world": "Fashion",
        "title": "Step into the campaign",
        "description": "Submit a short shooting application. Availability, creative fit and usage rights determine selection.",
        "type": "creator-selection",
        "source": "research-spec:L178"
      },
      {
        "world": "Fashion",
        "title": "Choose a design detail",
        "description": "A free creative poll shapes a colour detail; the shared look reveal is distinct from paid Props.",
        "type": "community-unlock",
        "source": "research-spec:L178"
      },
      {
        "world": "Living",
        "title": "Walk through the architect’s thinking",
        "description": "A described concept walkthrough explains one room and the choices behind it; it is not a confirmed property tour.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L177"
      },
      {
        "world": "Living",
        "title": "Design a room together",
        "description": "Submit a room sketch and explain one practical need. Selection is based on fit, not purchased Props.",
        "type": "creator-selection",
        "source": "research-spec:L177"
      }
    ],
    "status": "active",
    "seasonStatus": "open",
    "defaultContestId": "campaign-nera",
    "annualBaseVotes": 4780,
    "creatorActions": [
      {
        "id": "action-nera-material-story",
        "parentCampaignId": "campaign-nera",
        "nominationId": "nomination-nera-fashion",
        "competitionId": "competition-fashion",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-nera",
        "contestId": "action-nera-material-story",
        "contestTitle": "Three materials, one beginning",
        "baseVotes": 0,
        "status": "open",
        "format": "story",
        "title": "Three materials, one beginning",
        "description": "A collection starts before the finished photograph. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "nera-chapter-1",
        "momentId": "nera-moment-notes"
      },
      {
        "id": "action-nera-atelier-storyboard",
        "parentCampaignId": "campaign-nera",
        "nominationId": "nomination-nera-fashion",
        "competitionId": "competition-fashion",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-nera",
        "contestId": "action-nera-atelier-storyboard",
        "contestTitle": "Inside the atelier",
        "baseVotes": 0,
        "status": "open",
        "format": "reel",
        "title": "Inside the atelier",
        "description": "Written Reel storyboard — no real clip. Why the line moved. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "nera-chapter-3",
        "momentId": "nera-moment-notes"
      },
      {
        "id": "action-nera-shooting-brief",
        "parentCampaignId": "campaign-nera",
        "nominationId": "nomination-nera-fashion",
        "competitionId": "competition-fashion",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-nera",
        "contestId": "action-nera-shooting-brief",
        "contestTitle": "Step into the collection",
        "baseVotes": 0,
        "status": "open",
        "format": "challenge",
        "title": "Step into the collection",
        "description": "A photo session has its own selection. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "nera-chapter-5",
        "momentId": "nera-moment-application"
      },
      {
        "id": "action-nera-colour-post",
        "parentCampaignId": "campaign-nera",
        "nominationId": "nomination-nera-fashion",
        "competitionId": "competition-fashion",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-nera",
        "contestId": "action-nera-colour-post",
        "contestTitle": "Choose the design detail",
        "baseVotes": 0,
        "status": "non-voting",
        "format": "post",
        "title": "Choose the design detail",
        "description": "Creative poll — not Props. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "delivered-demo",
        "chapterId": "nera-chapter-2",
        "momentId": "nera-moment-notes"
      }
    ],
    "cadence": "Creators can run hundreds of Props campaigns through Stories, Reels, Posts and Challenges during one year. These four fictional examples share one annual nomination total; they are not a fabricated year of completed activity."
  },
  {
    "id": "campaign-mira",
    "nominationId": "nomination-mira-actors",
    "competitionId": "competition-actors",
    "seasonId": "season-demo-2026",
    "creatorId": "creator-mira",
    "name": "MIRA VALE",
    "category": "Actors",
    "subcategory": "Female Movie Star of the Year",
    "title": "One Scene. Your Story.",
    "description": "A line has to sound like someone means it. Follow the story, help the shared chapter open and explore separate creator moments. Fictional creator · local demo.",
    "image": "award-film-illustration.png",
    "videoTeaser": "award-film-motion-teaser.mp4",
    "imageLabel": "Original campaign illustration · fictional creator demo, not a confirmed event.",
    "baseVotes": 7620,
    "supporters": 2410,
    "target": 8000,
    "unlockTitle": "The table-read · written demo",
    "chapters": [
      {
        "id": "mira-chapter-1",
        "title": "One page before the scene",
        "summary": "A line has to sound like someone means it.",
        "body": "Fictional script excerpt: “You kept the key?” “I thought you might come back.” MIRA VALE talks through the pause between the lines. This original written scene was created for the demo; there is no claimed released film or celebrity participation.",
        "video": "award-film-motion-teaser.mp4",
        "image": "award-film-illustration.png"
      },
      {
        "id": "mira-chapter-2",
        "title": "Find the room",
        "summary": "A location changes the story.",
        "body": "A bright room makes the pause feel ordinary; a narrow corridor makes it feel like a decision. MIRA describes the two options and the prop that gives the scene its clue. The CRAYS lounge picture is illustrative, not a confirmed filming location.",
        "video": "award-film-motion-teaser.mp4",
        "image": "award-film-illustration.png"
      },
      {
        "id": "mira-chapter-3",
        "title": "The rehearsal question",
        "summary": "What should the audience notice?",
        "body": "Fictional rehearsal notes compare a hurried reading with a quiet one. Fans may submit a question or a brief audition introduction through a separate casting example. The Props supports the nomination; it is not an audition fee.",
        "video": "award-film-motion-teaser.mp4",
        "image": "award-film-illustration.png"
      },
      {
        "id": "mira-chapter-4",
        "title": "Around the table",
        "summary": "At 8,000, read the scene together.",
        "body": "Unlocked table-read example: “You kept the key?” A long pause. “I thought you might come back.” The accompanying notes explain how the pause changed in rehearsal. This is a written stand-in for a cast table-read, available to all campaign visitors, not fabricated playable footage.",
        "video": "award-film-motion-teaser.mp4",
        "image": "award-film-illustration.png",
        "lockedUntilVotes": 8000
      },
      {
        "id": "mira-chapter-5",
        "title": "A part is not a purchase",
        "summary": "Casting remains a separate decision.",
        "body": "The sample brief lists availability, comfort with the role and explicit permission to review an audition. The production team must approve casting and rights. No amount of Props support promises a role, a final-cut appearance or a response from an actual production.",
        "video": "award-film-motion-teaser.mp4",
        "image": "award-film-illustration.png"
      },
      {
        "id": "mira-chapter-6",
        "title": "From page to memory",
        "summary": "A set visit has its own terms.",
        "body": "A separate set-visit concept must name the approved production, date, location, guest count, age and accessibility limits. Until those exist it is not bookable. The story can still continue with rehearsal notes and a production-approved making-of chapter.",
        "video": "award-film-motion-teaser.mp4",
        "image": "award-film-illustration.png"
      }
    ],
    "moments": [
      {
        "id": "mira-moment-unlock",
        "type": "community-unlock",
        "title": "Around the table",
        "summary": "At 8,000, the written table-read chapter opens for every visitor.",
        "terms": "Only valid counted Props in the exact main contest campaign-mira advance its 8,000-vote target and written demo unlock. Props in another contest count toward the same annual nomination but do not advance this contest’s unlock. The chapter is for all campaign visitors, with no purchase or follow prerequisite. No genuine film, audio or live stream is claimed.",
        "status": "Awaiting community goal"
      },
      {
        "id": "mira-moment-notes",
        "type": "guaranteed-benefit",
        "title": "A page of rehearsal notes",
        "summary": "Read the complete local note here: take the first line slowly, keep the pause, let the second line answer the memory rather than the question.",
        "terms": "Guaranteed only within this local example: opening this card supplies the complete written note described above. No physical service, personal reply, booking, paid-content licence or creator contact is promised. It is available without buying Props.",
        "status": "Available written demo"
      },
      {
        "id": "mira-moment-application",
        "type": "creator-selection",
        "title": "A scene, properly cast",
        "summary": "Apply under the production’s sample suitability and availability criteria.",
        "terms": "Local application example only. Criteria: creative or professional fit, practical availability and explicit permission to review the submission. Submitted, under review and selected remain separate. Buying Props gives no advantage. No real application is sent, no seat/role/visit confirmed, no private contact or travel included.",
        "status": "Application example"
      },
      {
        "id": "mira-moment-giveaway",
        "type": "prize-draw",
        "title": "The premiere invitation",
        "summary": "A separate two-ticket concept, not a role or a reward earned by voting.",
        "terms": "Concept only; entries are not open and no real draw is run. A vote creates zero tickets and changes no odds. Eligibility, age/country, free entry route if applicable, deadline, inventory, organiser and delivery terms require separate approval. No winner, date or partnership is claimed.",
        "status": "Concept · entries closed"
      }
    ],
    "seedCompetitors": [
      {
        "id": "actors-rival-1",
        "name": "Fictional Actors nominee 1",
        "votes": 9200
      },
      {
        "id": "actors-rival-2",
        "name": "Fictional Actors nominee 2",
        "votes": 8600
      },
      {
        "id": "actors-rival-3",
        "name": "Fictional Actors nominee 3",
        "votes": 8002
      }
    ],
    "ideas": [
      {
        "world": "Actors",
        "title": "See how the set works",
        "description": "A production-approved set visit needs its own application, capacity and conditions. No payment buys a role.",
        "type": "creator-selection",
        "source": "research-spec:L182"
      },
      {
        "world": "Actors",
        "title": "Around the table",
        "description": "The shared target unlocks a written table-read chapter for all visitors, without a casting advantage.",
        "type": "community-unlock",
        "source": "research-spec:L182"
      },
      {
        "world": "Actors",
        "title": "One scene, one audition",
        "description": "A separately reviewed casting application uses suitability, production approval and rights. Vote quantity is irrelevant.",
        "type": "creator-selection",
        "source": "research-spec:L182"
      },
      {
        "world": "Actors",
        "title": "A premiere, precisely promised",
        "description": "A premiere concept states ticket count, guest rules and whether travel is included. It remains a separate draw until approved.",
        "type": "prize-draw",
        "source": "research-spec:L182"
      },
      {
        "world": "Lifestyle",
        "title": "Make the club evening yours",
        "description": "Submit a small programme idea; the creator selects by practical fit. There is no automatic club entry.",
        "type": "creator-selection",
        "source": "research-spec:L180"
      },
      {
        "world": "Lifestyle",
        "title": "A moment at a CRAYS Spot",
        "description": "Explore a clearly scoped gathering concept; a separate benefit would need confirmed place, date and included services.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L180"
      }
    ],
    "status": "active",
    "seasonStatus": "open",
    "defaultContestId": "campaign-mira",
    "annualBaseVotes": 7620,
    "creatorActions": [
      {
        "id": "action-mira-script-story",
        "parentCampaignId": "campaign-mira",
        "nominationId": "nomination-mira-actors",
        "competitionId": "competition-actors",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-mira",
        "contestId": "action-mira-script-story",
        "contestTitle": "The line before the pause",
        "baseVotes": 0,
        "status": "open",
        "format": "story",
        "title": "The line before the pause",
        "description": "A line has to sound like someone means it. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "mira-chapter-1",
        "momentId": "mira-moment-notes"
      },
      {
        "id": "action-mira-rehearsal-storyboard",
        "parentCampaignId": "campaign-mira",
        "nominationId": "nomination-mira-actors",
        "competitionId": "competition-actors",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-mira",
        "contestId": "action-mira-rehearsal-storyboard",
        "contestTitle": "Read it a different way",
        "baseVotes": 0,
        "status": "open",
        "format": "reel",
        "title": "Read it a different way",
        "description": "Written Reel storyboard — no real clip. What should the audience notice? Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "mira-chapter-3",
        "momentId": "mira-moment-unlock"
      },
      {
        "id": "action-mira-casting-brief",
        "parentCampaignId": "campaign-mira",
        "nominationId": "nomination-mira-actors",
        "competitionId": "competition-actors",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-mira",
        "contestId": "action-mira-casting-brief",
        "contestTitle": "One scene, your audition",
        "baseVotes": 0,
        "status": "open",
        "format": "challenge",
        "title": "One scene, your audition",
        "description": "Casting remains a separate decision. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "mira-chapter-5",
        "momentId": "mira-moment-application"
      },
      {
        "id": "action-mira-location-notes",
        "parentCampaignId": "campaign-mira",
        "nominationId": "nomination-mira-actors",
        "competitionId": "competition-actors",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-mira",
        "contestId": "action-mira-location-notes",
        "contestTitle": "Find the room",
        "baseVotes": 0,
        "status": "non-voting",
        "format": "post",
        "title": "Find the room",
        "description": "A location changes the story. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "delivered-demo",
        "chapterId": "mira-chapter-2",
        "momentId": "mira-moment-notes"
      }
    ],
    "cadence": "Creators can run hundreds of Props campaigns through Stories, Reels, Posts and Challenges during one year. These four fictional examples share one annual nomination total; they are not a fabricated year of completed activity."
  },
  {
    "id": "campaign-atlas",
    "nominationId": "nomination-atlas-content",
    "competitionId": "competition-content",
    "seasonId": "season-demo-2026",
    "creatorId": "creator-atlas",
    "name": "ATLAS REED",
    "category": "Content Creator",
    "subcategory": "Most innovative Creator of the Year",
    "title": "Make the Next Episode With Me.",
    "description": "Thirty seconds is enough to share an idea. Follow the story, help the shared chapter open and explore separate creator moments. Fictional creator · local demo.",
    "image": "award-creator-illustration.png",
    "videoTeaser": "award-creator-motion-teaser.mp4",
    "imageLabel": "Original campaign illustration · fictional creator demo, not a confirmed event.",
    "baseVotes": 3860,
    "supporters": 980,
    "target": 4000,
    "unlockTitle": "The shared premiere · written demo",
    "chapters": [
      {
        "id": "atlas-chapter-1",
        "title": "Give the next episode a beginning",
        "summary": "Thirty seconds is enough to share an idea.",
        "body": "ATLAS REED’s fictional brief: tell a small story about someone who quietly changed your day. Submit a short written pitch in the local example; no real recording upload or publication follows. A strong idea can come from a fan who never buys a vote.",
        "video": "award-creator-motion-teaser.mp4",
        "image": "award-creator-illustration.png"
      },
      {
        "id": "atlas-chapter-2",
        "title": "Three ways into one story",
        "summary": "Originality, fit and permission.",
        "body": "The demo criteria are specific: a clear hook, a manageable setting, permission to tell the story and a reason the audience should care. The creator compares a bus-stop meeting, a repaired bicycle and an unexpected letter without ranking their authors by spending.",
        "video": "award-creator-motion-teaser.mp4",
        "image": "award-creator-illustration.png"
      },
      {
        "id": "atlas-chapter-3",
        "title": "Why this idea",
        "summary": "The choice should be understandable.",
        "body": "Fictional creator reaction: “The bicycle story has a moment we can actually show: the first turn of the wheel.” The selected idea is a narrative example; an actual user application keeps its own Submitted / Under review / Selected state and never inherits this outcome automatically.",
        "video": "award-creator-motion-teaser.mp4",
        "image": "award-creator-illustration.png"
      },
      {
        "id": "atlas-chapter-4",
        "title": "The shared premiere",
        "summary": "At 4,000, the next chapter opens.",
        "body": "Unlocked written premiere: a neighbour notices a broken bicycle, brings back one small part and waits for the first ride. The scene ends with the rider looking back. This local written episode is available to every campaign visitor after the shared milestone; it is not a real released video.",
        "video": "award-creator-motion-teaser.mp4",
        "image": "award-creator-illustration.png",
        "lockedUntilVotes": 4000
      },
      {
        "id": "atlas-chapter-5",
        "title": "Credit is part of the work",
        "summary": "The fan’s contribution stays theirs.",
        "body": "A selected collaborator reviews their credit and permitted usage before any publication. Selection, consent and fulfilment are independent from financial support. This demo does not publish a real name, transfer copyright or create a private chat.",
        "video": "award-creator-motion-teaser.mp4",
        "image": "award-creator-illustration.png"
      },
      {
        "id": "atlas-chapter-6",
        "title": "What we learned making it",
        "summary": "The next episode starts with a response.",
        "body": "Fictional production note: the shortest ending worked best. ATLAS thanks the community’s questions and invites another brief. Follow the next chapter, read the selected example or prepare your own application without buying additional Props.",
        "video": "award-creator-motion-teaser.mp4",
        "image": "award-creator-illustration.png"
      }
    ],
    "moments": [
      {
        "id": "atlas-moment-unlock",
        "type": "community-unlock",
        "title": "Our shared premiere",
        "summary": "At 4,000, the written premiere opens for the campaign community.",
        "terms": "Only valid counted Props in the exact main contest campaign-atlas advance its 4,000-vote target and written demo unlock. Props in another contest count toward the same annual nomination but do not advance this contest’s unlock. The chapter is for all campaign visitors, with no purchase or follow prerequisite. No genuine film, audio or live stream is claimed.",
        "status": "Awaiting community goal"
      },
      {
        "id": "atlas-moment-notes",
        "type": "guaranteed-benefit",
        "title": "The story-pitch guide",
        "summary": "Read the complete local brief here: one person, one small change, one visible ending; share only a story you have permission to tell.",
        "terms": "Guaranteed only within this local example: opening this card supplies the complete written note described above. No physical service, personal reply, booking, paid-content licence or creator contact is promised. It is available without buying Props.",
        "status": "Available written demo"
      },
      {
        "id": "atlas-moment-application",
        "type": "creator-selection",
        "title": "Make the next episode with me",
        "summary": "Submit a 30-second pitch; originality, feasibility and rights determine selection.",
        "terms": "Local application example only. Criteria: creative or professional fit, practical availability and explicit permission to review the submission. Submitted, under review and selected remain separate. Buying Props gives no advantage. No real application is sent, no seat/role/visit confirmed, no private contact or travel included.",
        "status": "Application example"
      },
      {
        "id": "atlas-moment-giveaway",
        "type": "prize-draw",
        "title": "A premiere-night place",
        "summary": "A limited invitation concept, separate from the public written premiere.",
        "terms": "Concept only; entries are not open and no real draw is run. A vote creates zero tickets and changes no odds. Eligibility, age/country, free entry route if applicable, deadline, inventory, organiser and delivery terms require separate approval. No winner, date or partnership is claimed.",
        "status": "Concept · entries closed"
      }
    ],
    "seedCompetitors": [
      {
        "id": "content-rival-1",
        "name": "Fictional Content Creator nominee 1",
        "votes": 5200
      },
      {
        "id": "content-rival-2",
        "name": "Fictional Content Creator nominee 2",
        "votes": 4600
      },
      {
        "id": "content-rival-3",
        "name": "Fictional Content Creator nominee 3",
        "votes": 4002
      }
    ],
    "ideas": [
      {
        "world": "Content Creator",
        "title": "Produce the next episode",
        "description": "Submit a 30-second story pitch; the creator chooses by originality, fit and permission to use it.",
        "type": "creator-selection",
        "source": "research-spec:L176"
      },
      {
        "world": "Content Creator",
        "title": "A short film, carefully watched",
        "description": "A defined written critique is the benefit in this local example, not unlimited private access to the creator.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L176"
      },
      {
        "world": "Content Creator",
        "title": "The guest microphone",
        "description": "Apply to co-host one podcast segment with format, recording scope and credits reviewed independently.",
        "type": "creator-selection",
        "source": "research-spec:L176"
      },
      {
        "world": "Content Creator",
        "title": "Your script, our mini-documentary",
        "description": "Follow the selected script through the edit; a shared goal opens the written premiere chapter for everyone.",
        "type": "community-unlock",
        "source": "research-spec:L176"
      },
      {
        "world": "Digital & Web3",
        "title": "Read the code together",
        "description": "A clearly scoped example code-review session explains a selected snippet. It is not a security certification.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L175"
      },
      {
        "world": "Digital & Web3",
        "title": "A feature for the community",
        "description": "Submit a nonfinancial feature proposal; selection uses usefulness, feasibility and accessibility rather than spending.",
        "type": "creator-selection",
        "source": "research-spec:L175"
      }
    ],
    "status": "active",
    "seasonStatus": "open",
    "defaultContestId": "campaign-atlas",
    "annualBaseVotes": 3860,
    "creatorActions": [
      {
        "id": "action-atlas-episode-brief",
        "parentCampaignId": "campaign-atlas",
        "nominationId": "nomination-atlas-content",
        "competitionId": "competition-content",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-atlas",
        "contestId": "action-atlas-episode-brief",
        "contestTitle": "Give the next episode a beginning",
        "baseVotes": 0,
        "status": "open",
        "format": "story",
        "title": "Give the next episode a beginning",
        "description": "Thirty seconds is enough to share an idea. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "atlas-chapter-1",
        "momentId": "atlas-moment-notes"
      },
      {
        "id": "action-atlas-premiere-storyboard",
        "parentCampaignId": "campaign-atlas",
        "nominationId": "nomination-atlas-content",
        "competitionId": "competition-content",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-atlas",
        "contestId": "action-atlas-premiere-storyboard",
        "contestTitle": "Our shared premiere",
        "baseVotes": 0,
        "status": "open",
        "format": "reel",
        "title": "Our shared premiere",
        "description": "Written Reel storyboard — no real clip. At 4,000, the next chapter opens. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "atlas-chapter-4",
        "momentId": "atlas-moment-unlock"
      },
      {
        "id": "action-atlas-pitch-challenge",
        "parentCampaignId": "campaign-atlas",
        "nominationId": "nomination-atlas-content",
        "competitionId": "competition-content",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-atlas",
        "contestId": "action-atlas-pitch-challenge",
        "contestTitle": "Thirty seconds, one idea",
        "baseVotes": 0,
        "status": "open",
        "format": "challenge",
        "title": "Thirty seconds, one idea",
        "description": "Originality, fit and permission. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "atlas-chapter-2",
        "momentId": "atlas-moment-application"
      },
      {
        "id": "action-atlas-creator-reaction",
        "parentCampaignId": "campaign-atlas",
        "nominationId": "nomination-atlas-content",
        "competitionId": "competition-content",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-atlas",
        "contestId": "action-atlas-creator-reaction",
        "contestTitle": "Why this idea",
        "baseVotes": 0,
        "status": "non-voting",
        "format": "post",
        "title": "Why this idea",
        "description": "The choice should be understandable. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "delivered-demo",
        "chapterId": "atlas-chapter-3",
        "momentId": "atlas-moment-notes"
      }
    ],
    "cadence": "Creators can run hundreds of Props campaigns through Stories, Reels, Posts and Challenges during one year. These four fictional examples share one annual nomination total; they are not a fabricated year of completed activity."
  },
  {
    "id": "campaign-eli",
    "nominationId": "nomination-eli-entrepreneurship",
    "competitionId": "competition-entrepreneurship",
    "seasonId": "season-demo-2026",
    "creatorId": "creator-eli",
    "name": "ELI ROWAN",
    "category": "Entrepreneurship",
    "subcategory": "Entrepreneur of the year",
    "title": "Build in the Room.",
    "description": "A problem before a pitch. Follow the story, help the shared chapter open and explore separate creator moments. Fictional creator · local demo.",
    "image": "award-founder-illustration.png",
    "videoTeaser": "award-founder-motion-teaser.mp4",
    "imageLabel": "Original campaign illustration · fictional creator demo, not a confirmed event.",
    "baseVotes": 1860,
    "supporters": 640,
    "target": 2000,
    "unlockTitle": "The public product teardown",
    "chapters": [
      {
        "id": "eli-chapter-1",
        "title": "Build in the room",
        "summary": "A problem before a pitch.",
        "body": "ELI ROWAN’s fictional product dilemma: new users can see every feature but cannot find their next useful action. The team must decide what to remove from the first screen. This is a demo working scenario, not a real company, investor meeting or investment opportunity.",
        "video": "award-founder-motion-teaser.mp4",
        "image": "award-founder-illustration.png"
      },
      {
        "id": "eli-chapter-2",
        "title": "One prototype, two choices",
        "summary": "Keep the list or show the next step?",
        "body": "Work update one: test a single next-action card. Update two: show the original result before advanced tools. Update three: explain why the quieter layout helps. Fans can follow the reasoning and submit a practical problem independently of Props support.",
        "video": "award-founder-motion-teaser.mp4",
        "image": "award-founder-illustration.png"
      },
      {
        "id": "eli-chapter-3",
        "title": "Bring a problem worth solving",
        "summary": "Fit matters more than purchased Props.",
        "body": "The sample application asks what is stuck, who needs the result and what can be shared publicly. Selection uses relevance, scope and consent. An Props does not buy advice, a private mentor, an investor introduction or equity.",
        "video": "award-founder-motion-teaser.mp4",
        "image": "award-founder-illustration.png"
      },
      {
        "id": "eli-chapter-4",
        "title": "The teardown table",
        "summary": "At 2,000, open the product review.",
        "body": "Unlocked written teardown: start with the user’s intended outcome, keep one clear action, show the actual saved result, then reveal advanced settings on demand. The example explains three trade-offs and one failure. It is public to campaign visitors, not a real consultancy or investment service.",
        "video": "award-founder-motion-teaser.mp4",
        "image": "award-founder-illustration.png",
        "lockedUntilVotes": 2000
      },
      {
        "id": "eli-chapter-5",
        "title": "Inside the session",
        "summary": "A clear scope protects a good conversation.",
        "body": "The conceptual limited session covers one product question and a written takeaway. Date, participant capacity and responsible host require approval before a real offer exists. The local application can be reviewed without any financial ranking.",
        "video": "award-founder-motion-teaser.mp4",
        "image": "award-founder-illustration.png"
      },
      {
        "id": "eli-chapter-6",
        "title": "A decision we can point to",
        "summary": "Document the result, not just the promise.",
        "body": "Fictional outcome report: the prototype now opens the original result first, with settings behind a small disclosure. The story names what changed, what stayed uncertain and the next test. No performance statistic or live customer result is invented.",
        "video": "award-founder-motion-teaser.mp4",
        "image": "award-founder-illustration.png"
      }
    ],
    "moments": [
      {
        "id": "eli-moment-unlock",
        "type": "community-unlock",
        "title": "The teardown table",
        "summary": "At 2,000, the public written product teardown opens for everyone.",
        "terms": "Only valid counted Props in the exact main contest campaign-eli advance its 2,000-vote target and written demo unlock. Props in another contest count toward the same annual nomination but do not advance this contest’s unlock. The chapter is for all campaign visitors, with no purchase or follow prerequisite. No genuine film, audio or live stream is claimed.",
        "status": "Awaiting community goal"
      },
      {
        "id": "eli-moment-notes",
        "type": "guaranteed-benefit",
        "title": "A practical review checklist",
        "summary": "Read the complete local checklist here: name the user’s intended outcome, show the original result, keep one next action, then test what remains unclear.",
        "terms": "Guaranteed only within this local example: opening this card supplies the complete written note described above. No physical service, personal reply, booking, paid-content licence or creator contact is promised. It is available without buying Props.",
        "status": "Available written demo"
      },
      {
        "id": "eli-moment-application",
        "type": "creator-selection",
        "title": "Bring your product problem",
        "summary": "Apply with one problem and a safe-to-share prototype; professional fit determines selection.",
        "terms": "Local application example only. Criteria: creative or professional fit, practical availability and explicit permission to review the submission. Submitted, under review and selected remain separate. Buying Props gives no advantage. No real application is sent, no seat/role/visit confirmed, no private contact or travel included.",
        "status": "Application example"
      },
      {
        "id": "eli-moment-giveaway",
        "type": "prize-draw",
        "title": "A seat at the founders table",
        "summary": "A separate limited dinner concept with no investor, funding or return promise.",
        "terms": "Concept only; entries are not open and no real draw is run. A vote creates zero tickets and changes no odds. Eligibility, age/country, free entry route if applicable, deadline, inventory, organiser and delivery terms require separate approval. No winner, date or partnership is claimed.",
        "status": "Concept · entries closed"
      }
    ],
    "seedCompetitors": [
      {
        "id": "entrepreneurship-rival-1",
        "name": "Fictional Entrepreneurship nominee 1",
        "votes": 3200
      },
      {
        "id": "entrepreneurship-rival-2",
        "name": "Fictional Entrepreneurship nominee 2",
        "votes": 2600
      },
      {
        "id": "entrepreneurship-rival-3",
        "name": "Fictional Entrepreneurship nominee 3",
        "votes": 2002
      }
    ],
    "ideas": [
      {
        "world": "Entrepreneurship",
        "title": "A day inside the founder team",
        "description": "Follow a product decision from user problem to prototype. A separate fit-based application selects the demo guest.",
        "type": "creator-selection",
        "source": "research-spec:L174"
      },
      {
        "world": "Entrepreneurship",
        "title": "Live pitch clinic",
        "description": "Submit one problem and receive a written example critique with the published scope. No investor introduction or funding promise.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L174"
      },
      {
        "world": "Entrepreneurship",
        "title": "Take the product apart",
        "description": "A shared goal opens a public product teardown, including what failed and what changed.",
        "type": "community-unlock",
        "source": "research-spec:L174"
      },
      {
        "world": "Entrepreneurship",
        "title": "A small founders table",
        "description": "Apply for a limited dinner conversation with a defined agenda and a published outcome. No vote buys a seat.",
        "type": "creator-selection",
        "source": "research-spec:L174"
      },
      {
        "world": "Digital & Web3",
        "title": "Build something open",
        "description": "Help shape a small open-source feature through a separately selected contribution. No token, investment or project endorsement.",
        "type": "creator-selection",
        "source": "research-spec:L175"
      },
      {
        "world": "Digital & Web3",
        "title": "First look at an application",
        "description": "A community threshold opens a written walkthrough of an early application, with known limitations.",
        "type": "community-unlock",
        "source": "research-spec:L175"
      }
    ],
    "status": "active",
    "seasonStatus": "open",
    "defaultContestId": "campaign-eli",
    "annualBaseVotes": 1860,
    "creatorActions": [
      {
        "id": "action-eli-product-problem",
        "parentCampaignId": "campaign-eli",
        "nominationId": "nomination-eli-entrepreneurship",
        "competitionId": "competition-entrepreneurship",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-eli",
        "contestId": "action-eli-product-problem",
        "contestTitle": "A problem before a pitch",
        "baseVotes": 0,
        "status": "open",
        "format": "story",
        "title": "A problem before a pitch",
        "description": "A problem before a pitch. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "eli-chapter-1",
        "momentId": "eli-moment-notes"
      },
      {
        "id": "action-eli-prototype-storyboard",
        "parentCampaignId": "campaign-eli",
        "nominationId": "nomination-eli-entrepreneurship",
        "competitionId": "competition-entrepreneurship",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-eli",
        "contestId": "action-eli-prototype-storyboard",
        "contestTitle": "One prototype, two choices",
        "baseVotes": 0,
        "status": "open",
        "format": "reel",
        "title": "One prototype, two choices",
        "description": "Written Reel storyboard — no real clip. Keep the list or show the next step? Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "eli-chapter-2",
        "momentId": "eli-moment-unlock"
      },
      {
        "id": "action-eli-problem-clinic",
        "parentCampaignId": "campaign-eli",
        "nominationId": "nomination-eli-entrepreneurship",
        "competitionId": "competition-entrepreneurship",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-eli",
        "contestId": "action-eli-problem-clinic",
        "contestTitle": "Bring a problem worth solving",
        "baseVotes": 0,
        "status": "open",
        "format": "challenge",
        "title": "Bring a problem worth solving",
        "description": "Fit matters more than purchased Props. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "eli-chapter-3",
        "momentId": "eli-moment-application"
      },
      {
        "id": "action-eli-decision-report",
        "parentCampaignId": "campaign-eli",
        "nominationId": "nomination-eli-entrepreneurship",
        "competitionId": "competition-entrepreneurship",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-eli",
        "contestId": "action-eli-decision-report",
        "contestTitle": "A decision we can point to",
        "baseVotes": 0,
        "status": "non-voting",
        "format": "post",
        "title": "A decision we can point to",
        "description": "Document the result, not just the promise. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "delivered-demo",
        "chapterId": "eli-chapter-6",
        "momentId": "eli-moment-notes"
      }
    ],
    "cadence": "Creators can run hundreds of Props campaigns through Stories, Reels, Posts and Challenges during one year. These four fictional examples share one annual nomination total; they are not a fabricated year of completed activity."
  },
  {
    "id": "campaign-solen",
    "nominationId": "nomination-solen-art",
    "competitionId": "competition-art",
    "seasonId": "season-demo-2026",
    "creatorId": "creator-solen",
    "name": "SOLEN ARTS",
    "category": "Art",
    "subcategory": "Art Piece of the Year",
    "title": "Leave Your Mark.",
    "description": "A wall can tell a shared story. Follow the story, help the shared chapter open and explore separate creator moments. Fictional creator · local demo.",
    "image": "award-art-illustration.png",
    "videoTeaser": "award-art-motion-teaser.mp4",
    "imageLabel": "Original campaign illustration · fictional creator demo, not a confirmed event.",
    "baseVotes": 2850,
    "supporters": 810,
    "target": 3000,
    "unlockTitle": "The making-of · written demo",
    "chapters": [
      {
        "id": "solen-chapter-1",
        "title": "Leave your mark",
        "summary": "A wall can tell a shared story.",
        "body": "SOLEN ARTS imagines a community artwork built from small lines that meet in the centre. Fans see the written sketch and the question behind it: what makes a place feel shared? The existing architecture image is illustration, not a confirmed mural site.",
        "video": "award-art-motion-teaser.mp4",
        "image": "award-art-illustration.png"
      },
      {
        "id": "solen-chapter-2",
        "title": "Choose what the work is made of",
        "summary": "Material has a story too.",
        "body": "Fictional studio notes compare a painted panel, a removable surface and a small permanent study. The creator explains durability, access and permission rather than claiming an installation already exists. A free idea does not confer authorship rights or ownership.",
        "video": "award-art-motion-teaser.mp4",
        "image": "award-art-illustration.png"
      },
      {
        "id": "solen-chapter-3",
        "title": "Prepare the space",
        "summary": "A place, a host and permission still matter.",
        "body": "The concept requires a named approved host, safe setup, accessibility and a responsible artist. No CRAYS Club location or date is confirmed. Follow the process while those details remain open; Props support does not reserve accommodation or admission.",
        "video": "award-art-motion-teaser.mp4",
        "image": "award-art-illustration.png"
      },
      {
        "id": "solen-chapter-4",
        "title": "Watch the lines come together",
        "summary": "At 3,000, open the making-of chapter.",
        "body": "Unlocked written making-of: the first line starts at the edge, a second meets it, then small contributions turn the centre into a shared shape. The creator explains each decision. This is an original written demo scene rather than a real live stream, for all campaign visitors.",
        "video": "award-art-motion-teaser.mp4",
        "image": "award-art-illustration.png",
        "lockedUntilVotes": 3000
      },
      {
        "id": "solen-chapter-5",
        "title": "Work beside the artist",
        "summary": "A limited invitation is a separate application.",
        "body": "The sample application asks what you would contribute, accessibility needs you choose to share and your availability. Selection depends on fit, consent, safety and capacity, not Props. No real host receives this local application.",
        "video": "award-art-motion-teaser.mp4",
        "image": "award-art-illustration.png"
      },
      {
        "id": "solen-chapter-6",
        "title": "The work after the moment",
        "summary": "Fulfilment becomes a new chapter.",
        "body": "A fictional outcome note describes the finished study, thanks contributors who chose to be credited and records what remains to approve for a real installation. It does not claim a permanent club artwork, an Props winner’s star or the first-place handprint honour.",
        "video": "award-art-motion-teaser.mp4",
        "image": "award-art-illustration.png"
      }
    ],
    "moments": [
      {
        "id": "solen-moment-unlock",
        "type": "community-unlock",
        "title": "Watch the lines meet",
        "summary": "At 3,000, the written making-of chapter opens for all visitors.",
        "terms": "Only valid counted Props in the exact main contest campaign-solen advance its 3,000-vote target and written demo unlock. Props in another contest count toward the same annual nomination but do not advance this contest’s unlock. The chapter is for all campaign visitors, with no purchase or follow prerequisite. No genuine film, audio or live stream is claimed.",
        "status": "Awaiting community goal"
      },
      {
        "id": "solen-moment-notes",
        "type": "guaranteed-benefit",
        "title": "The curator’s written tour",
        "summary": "Read the complete local tour here: follow the first line from the edge, notice where the second interrupts it, then look at the space the two leave together.",
        "terms": "Guaranteed only within this local example: opening this card supplies the complete written note described above. No physical service, personal reply, booking, paid-content licence or creator contact is promised. It is available without buying Props.",
        "status": "Available written demo"
      },
      {
        "id": "solen-moment-application",
        "type": "creator-selection",
        "title": "Work beside the artist",
        "summary": "Apply with your proposed contribution; safety, capacity, consent and creative fit are reviewed.",
        "terms": "Local application example only. Criteria: creative or professional fit, practical availability and explicit permission to review the submission. Submitted, under review and selected remain separate. Buying Props gives no advantage. No real application is sent, no seat/role/visit confirmed, no private contact or travel included.",
        "status": "Application example"
      },
      {
        "id": "solen-moment-giveaway",
        "type": "prize-draw",
        "title": "One signed original sketch",
        "summary": "A separate one-item concept. It is not artwork ownership conferred by an Props.",
        "terms": "Concept only; entries are not open and no real draw is run. A vote creates zero tickets and changes no odds. Eligibility, age/country, free entry route if applicable, deadline, inventory, organiser and delivery terms require separate approval. No winner, date or partnership is claimed.",
        "status": "Concept · entries closed"
      }
    ],
    "seedCompetitors": [
      {
        "id": "art-rival-1",
        "name": "Fictional Art nominee 1",
        "votes": 4200
      },
      {
        "id": "art-rival-2",
        "name": "Fictional Art nominee 2",
        "votes": 3600
      },
      {
        "id": "art-rival-3",
        "name": "Fictional Art nominee 3",
        "votes": 3002
      }
    ],
    "ideas": [
      {
        "world": "Art",
        "title": "Leave a line in the mural",
        "description": "A separate application selects a small group to help create a shared work; location and permissions remain a concept.",
        "type": "creator-selection",
        "source": "research-spec:L179"
      },
      {
        "world": "Art",
        "title": "The original sketch",
        "description": "A signed original sketch is a limited separate draw concept, not an item acquired with an Props.",
        "type": "prize-draw",
        "source": "research-spec:L179"
      },
      {
        "world": "Art",
        "title": "A portrait with a story",
        "description": "Apply for a personal photo project with a clear brief, image consent and selected-use terms.",
        "type": "creator-selection",
        "source": "research-spec:L179"
      },
      {
        "world": "Art",
        "title": "A small exhibition, a close look",
        "description": "A written curator’s tour is the example benefit, with artwork context and no claim of physical admission.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L179"
      },
      {
        "world": "Living",
        "title": "Test a way of living",
        "description": "Apply for a separately approved concept test day. Property, date, accessibility and capacity need confirmation.",
        "type": "creator-selection",
        "source": "research-spec:L177"
      },
      {
        "world": "Living",
        "title": "A community week, clearly described",
        "description": "Explore a planned week with exact inclusions and availability. This is a separate benefit concept, not a stay or membership won by voting.",
        "type": "guaranteed-benefit",
        "source": "research-spec:L177"
      }
    ],
    "status": "active",
    "seasonStatus": "open",
    "defaultContestId": "campaign-solen",
    "annualBaseVotes": 2850,
    "creatorActions": [
      {
        "id": "action-solen-first-sketch",
        "parentCampaignId": "campaign-solen",
        "nominationId": "nomination-solen-art",
        "competitionId": "competition-art",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-solen",
        "contestId": "action-solen-first-sketch",
        "contestTitle": "Leave your first line",
        "baseVotes": 0,
        "status": "open",
        "format": "story",
        "title": "Leave your first line",
        "description": "A wall can tell a shared story. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "solen-chapter-1",
        "momentId": "solen-moment-notes"
      },
      {
        "id": "action-solen-making-of-storyboard",
        "parentCampaignId": "campaign-solen",
        "nominationId": "nomination-solen-art",
        "competitionId": "competition-art",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-solen",
        "contestId": "action-solen-making-of-storyboard",
        "contestTitle": "Watch the lines come together",
        "baseVotes": 0,
        "status": "open",
        "format": "reel",
        "title": "Watch the lines come together",
        "description": "Written Reel storyboard — no real clip. At 3,000, open the making-of chapter. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "solen-chapter-4",
        "momentId": "solen-moment-unlock"
      },
      {
        "id": "action-solen-collaborator-brief",
        "parentCampaignId": "campaign-solen",
        "nominationId": "nomination-solen-art",
        "competitionId": "competition-art",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-solen",
        "contestId": "action-solen-collaborator-brief",
        "contestTitle": "Work beside the artist",
        "baseVotes": 0,
        "status": "open",
        "format": "challenge",
        "title": "Work beside the artist",
        "description": "A limited invitation is a separate application. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "active-demo",
        "chapterId": "solen-chapter-5",
        "momentId": "solen-moment-application"
      },
      {
        "id": "action-solen-material-notes",
        "parentCampaignId": "campaign-solen",
        "nominationId": "nomination-solen-art",
        "competitionId": "competition-art",
        "seasonId": "season-demo-2026",
        "creatorId": "creator-solen",
        "contestId": "action-solen-material-notes",
        "contestTitle": "Choose what it is made of",
        "baseVotes": 0,
        "status": "non-voting",
        "format": "post",
        "title": "Choose what it is made of",
        "description": "Material has a story too. Fictional campaign example; all valid Props count toward the same annual nomination.",
        "state": "delivered-demo",
        "chapterId": "solen-chapter-2",
        "momentId": "solen-moment-notes"
      }
    ],
    "cadence": "Creators can run hundreds of Props campaigns through Stories, Reels, Posts and Challenges during one year. These four fictional examples share one annual nomination total; they are not a fabricated year of completed activity."
  }
];

/** Daily campaign examples are source attribution, not independent annual vote totals. */
export const storyCreatorActions: StoryCreatorAction[] = storyCampaigns.flatMap(campaign => campaign.creatorActions);
