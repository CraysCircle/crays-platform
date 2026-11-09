/** Public, fixed request starters copied from the existing Chuck Ideas UI.
 * This is local draft composition, never agent/tool/source/execution authority.
 */
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const chuckPublicStarterGroups=freeze({
  "Plan": {
    "title": "Make room for what matters.",
    "description": "A day, a trip or something good with your VIFs. Start with the outcome.",
    "examples": [
      [
        "Plan a trip",
        "Help me plan a relaxed weekend, including travel, places to stay and a packing list.",
        "AL-273",
        "plan-trip"
      ],
      [
        "Bring people together",
        "Help me plan a small gathering with my VIFs in one of my Spots.",
        "AL-305",
        "bring-people-together"
      ],
      [
        "Organise my week",
        "Help me organise my week around the tasks I choose to share.",
        "AL-293",
        "organise-week"
      ]
    ]
  },
  "Discover": {
    "title": "A good question is a start.",
    "description": "Get a useful answer, compare the options and keep the original sources.",
    "examples": [
      [
        "Research something",
        "Research a question for me and keep the sources attached to your answer.",
        "AL-293",
        "research-topic"
      ],
      [
        "Explore my Spots",
        "Help me find an experience in the CRAYS Spots I can access.",
        "AL-035",
        "explore-spots"
      ],
      [
        "Meet someone relevant",
        "Prepare a purposeful introduction. Show me why and what I would share first.",
        "AL-269",
        "meet-person"
      ]
    ]
  },
  "Create": {
    "title": "Turn an idea into something.",
    "description": "Work with your own words, files and originals. Review before anything is shared.",
    "examples": [
      [
        "Work on a document",
        "Help me make a document from the notes I choose to share.",
        "AL-293",
        "work-document"
      ],
      [
        "Publish an original",
        "Help me prepare a new original. Keep the draft private until I review and sign it.",
        "AL-113",
        "prepare-original"
      ],
      [
        "Build my creator page",
        "Help me shape my own creator page and content offers.",
        "AL-198",
        "creator-page"
      ]
    ]
  },
  "Everyday": {
    "title": "Less life admin. More life.",
    "description": "Small things add up. Keep the plan, checklist or result connected to your conversation.",
    "examples": [
      [
        "Food & shopping",
        "Help me make a meal plan from the ingredients and preferences I choose to share.",
        "AL-248",
        "food-shopping"
      ],
      [
        "Movement & wellbeing",
        "Help me plan a movement routine that fits my week.",
        "AL-248",
        "movement-wellbeing"
      ],
      [
        "Notes & reminders",
        "Help me remember something. Show me exactly what will be saved and when I want a reminder.",
        "AL-293",
        "notes-reminders"
      ]
    ]
  }
});
const entries=Object.values(chuckPublicStarterGroups).flatMap(group=>group.examples).map(([label,text,previewFeature,id])=>[id,freeze({id,label,text,previewFeature})]);
entries.push(['work-project',freeze({id:'work-project',label:'Work on a project',text:'Help me plan and work on a project. Ask me about the goal, desired result and timing.',previewFeature:'AL-293'})]);
const starters=new Map(entries);
export function publicChuckStarter(id){const item=typeof id==='string'?starters.get(id):null;if(!item)throw Error('starter-unavailable');return item;}
const contextKey=value=>JSON.stringify(value??null);
const valid=s=>s&&s.signedIn===true&&typeof s.owner==='string'&&s.owner.trim()===s.owner&&s.owner.length>0&&Number.isSafeInteger(s.revision)&&s.revision>=0&&typeof s.draft==='string';
function hasOtherContext(context){
 if(context==null)return false;
 if(typeof context!=='object'||Array.isArray(context))return true;
 const entries=Object.entries(context);return entries.length>0&&!(entries.length===1&&entries[0][0]==='sourceId'&&entries[0][1]==='web-global-chuck');
}
export function capturePublicChuckStarter(id,snapshot){
 const starter=publicChuckStarter(id);if(!valid(snapshot))throw Error('draft-unavailable');
 return freeze({id:starter.id,label:starter.label,text:starter.text,owner:snapshot.owner,revision:snapshot.revision,before:snapshot.draft,beforeContext:contextKey(snapshot.context),requiresReview:(!!snapshot.draft.trim()&&snapshot.draft!==starter.text)||hasOtherContext(snapshot.context)});
}
export function publicChuckStarterIsCurrent(choice,snapshot){
 if(!choice||!valid(snapshot))return false;
 try{const starter=publicChuckStarter(choice.id);
 return choice.text===starter.text&&choice.label===starter.label&&choice.requiresReview===((!!snapshot.draft.trim()&&snapshot.draft!==starter.text)||hasOtherContext(snapshot.context))&&snapshot.owner===choice.owner&&snapshot.revision===choice.revision&&snapshot.draft===choice.before&&contextKey(snapshot.context)===choice.beforeContext;
 }catch{return false;}
}
/** Only exact static text selected by the user; never reclassify an old private
 * body or source as public. The existing source guard remains unchanged. */
export function publicChuckStarterPreview(choice,snapshot){
 if(!publicChuckStarterIsCurrent(choice,snapshot))throw Error('draft-changed');
 return {text:choice.text,label:choice.label,context:{sourceId:'web-global-chuck'}};
}
