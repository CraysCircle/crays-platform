import {ownPrivateAccount} from '../ownPrivateAccount';
import type {ProductWorld} from '../productModel';

/** Same preview eligibility as canDirectMessage, evaluated once per current
 * render instead of rescanning every person for every row. No cached rights:
 * duplicates, consent changes and account changes are read afresh each time.
 * Actual messaging authority remains the original SDK/Core transport. */
export function directMessagePeople(world:ProductWorld){
 if(!ownPrivateAccount(world))return [];
 const counts=new Map<string,number>();
 for(const person of world.people)counts.set(person.id,(counts.get(person.id)||0)+1);
 return world.people.filter(person=>counts.get(person.id)===1&&person.contact===true&&person.consentSelf===true&&person.consentOther===true&&person.request==='accepted'&&!person.blocked&&!person.blockedByOther);
}
