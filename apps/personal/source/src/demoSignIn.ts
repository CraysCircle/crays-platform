import type {ActionContext,ProductWorld} from './productModel.ts';
import {localPreviewId} from './localPreviewId.ts';
export type DemoCodeChallenge={id:string;owner:string;method:'Email'|'Phone';target:string;requestedAt:number;expiresAt:number;status:'pending'|'used'|'invalidated';fictional:true};
export const DEMO_CODE_TTL_MS=5*60_000,DEMO_RESEND_DELAY_MS=10_000;
const challenge=(w:ProductWorld)=>w.identity.demoCodeChallenge;
export function demoCodeReady(w:ProductWorld,now=Date.now()){
 const c=challenge(w);return !!c&&c.fictional===true&&c.owner===w.owner&&c.status==='pending'&&c.target===w.identity.codeTarget&&c.target===w.identity.destination&&c.method===w.identity.method&&c.requestedAt<=now&&now<c.expiresAt;
}
function invalidate(w:ProductWorld,status:'used'|'invalidated'='invalidated'){const c=challenge(w);if(c)c.status=status;w.identity.codeTarget='';w.identity.resendAt=0;}
function destination(method:string,input:string){
 const target=(input||'').trim();
 if(method==='Email'){if(target.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target))throw Error('Enter an email address for the email-code preview.');}
 else if(method==='Phone'){if(target.length>50||!/^\+?[0-9][0-9\s()-]*$/.test(target)||target.replace(/\D/g,'').length<7||target.replace(/\D/g,'').length>15)throw Error('Enter a phone number with 7–15 digits for the phone-code preview.');}
 else throw Error('Choose Email or Phone for a code preview.');
 return target;
}
function sameAttempt(w:ProductWorld,data:Record<string,string>){const c=challenge(w);if(!c||c.fictional!==true||c.owner!==w.owner||c.status!=='pending'||!w.identity.codeTarget||data.challengeId!==c.id||data.method!==c.method||(data.destination||'').trim()!==c.target||w.identity.destination!==c.target||w.identity.codeTarget!==c.target||w.identity.method!==c.method)throw Error('This code belongs to a different or completed preview request. Review the current destination and request a new code.');return c;}
export function applyDemoSignIn(w:ProductWorld,op:string,data:Record<string,string>,ctx:ActionContext,now=Date.now()):{objectId:string;message:string}|null {
 if(!['auth.code','auth.verify','auth.resend','auth.correct','auth.passkey','auth.signout'].includes(op))return null;
 if(ctx.personId&&ctx.personId!==w.owner)throw Error('Use your own CRAYS sign-in context.');
 if(op==='auth.signout'){w.identity.signedIn=false;w.identity.signer='locked';invalidate(w);return {objectId:w.owner,message:'Demo session signed out. Your separate Nostr identity and original records are retained.'};}
 if(w.identity.signedIn)throw Error('Your CRAYS account is already signed in. Manage its current methods without signing into another account.');
 if(op==='auth.correct'){invalidate(w);return {objectId:w.owner,message:'Earlier preview code invalidated. Correct the destination, then request a new code.'};}
 if(op==='auth.passkey'){
  if(data.outcome!=='Approved')throw Error('Device prompt cancelled. Your session was not changed.');
  invalidate(w);w.identity.signedIn=true;w.identity.method='Demo device credential';return {objectId:w.owner,message:'Sample device credential approved. No real passkey, email proof or Nostr signing permission was created.'};
 }
 if(op==='auth.verify'){
  const c=sameAttempt(w,data);if(now<c.requestedAt)throw Error('Check this device clock before verifying the preview code.');if(now>=c.expiresAt)throw Error('This preview code expired. Request a new one for the same reviewed destination.');
  if(data.code!=='123456')throw Error('That preview code is not correct. Review the code and try again.');
  invalidate(w,'used');w.identity.signedIn=true;return {objectId:w.owner,message:'Signed in to this same demo account. This is not real email or phone verification.'};
 }
 if(op==='auth.resend'){
  const c=sameAttempt(w,data);if(now<c.requestedAt||now<w.identity.resendAt)throw Error('Please wait for the preview resend timer.');
 }else if(challenge(w)?.status==='pending'&&now<w.identity.resendAt)throw Error('Wait for the current code request or choose Correct destination first.');
 const method=data.method,target=destination(method,data.destination),c:DemoCodeChallenge={id:localPreviewId(),owner:w.owner,method:method as 'Email'|'Phone',target,requestedAt:now,expiresAt:now+DEMO_CODE_TTL_MS,status:'pending',fictional:true};
 w.identity.demoCodeChallenge=c;w.identity.destination=target;w.identity.codeTarget=target;w.identity.method=method;w.identity.resendAt=now+DEMO_RESEND_DELAY_MS;
 return {objectId:w.owner,message:op==='auth.resend'?'A new preview code replaces the previous request. No email or SMS was sent.':'Preview code prepared for this destination. Use 123456; no email or SMS was sent.'};
}
