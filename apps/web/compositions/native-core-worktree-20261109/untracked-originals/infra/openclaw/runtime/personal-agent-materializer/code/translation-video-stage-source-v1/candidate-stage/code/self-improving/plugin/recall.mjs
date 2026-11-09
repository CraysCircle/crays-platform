/** Authorized native wrapper; ordinary prompts need no raw confirmation shortcode. */
import {createAuthorizedPrivateMemoryActor} from './native-confirmation-connector.mjs';
import {readConfirmedPreferenceContext} from './recall-core.mjs';
export function createConfirmedPreferenceRecall({getRuntimeConfig,now=Date.now}){if(typeof getRuntimeConfig!=='function'||typeof now!=='function')throw Error('PREFERENCE_RECALL_HOST_REQUIRED');return(event,ctx)=>{let actor;try{actor=createAuthorizedPrivateMemoryActor(ctx,getRuntimeConfig,['crays_personal_records','crays_personal_preferences']);}catch{return;}return readConfirmedPreferenceContext({actor,event,now});};}
