import type {ProductWorld} from './productModel';
import {exactConversation} from './conversationTools';
import {vifTimer,vifTimerKey,vifTimerOptions} from './vifDisappearing';
export function saveVifTimer(w:ProductWorld,owner:string,id:string,expected:string,seconds:number,confirmed:boolean,at=Date.now()){
 if(w.owner!==owner||!w.identity.signedIn||confirmed!==true)throw Error('Review your account and this conversation’s timer.');const c=exactConversation(w,id);if(!c.canRead||!c.canSend||c.kind==='agent')throw Error('A current private connection or Circle membership is required to change this timer.');
 if(!vifTimerOptions.includes(seconds as typeof vifTimerOptions[number]))throw Error('Choose Off, 24 hours, 7 days or 90 days.');const current=vifTimer(w,id);if(current.expected!==expected)throw Error('The timer changed in another view. Reopen its review.');if(current.seconds===seconds)return w;if(current.changes.length>=2000)throw Error('The local timer history is full. No change was made.');if(!Number.isSafeInteger(at)||at<=0||at>Date.now())throw Error('Review the recorded clock before changing this timer.');if(current.changes.at(-1)&&current.changes.at(-1)!.at>at)throw Error('The recorded clock changed. Review before updating this timer.');return {...w,settings:{...w.settings,[vifTimerKey(w,id)]:JSON.stringify({version:1,changes:[...current.changes,{at,seconds}]})}};
}
