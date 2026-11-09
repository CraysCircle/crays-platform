import type {Person, ProductWorld} from './productModel.ts';
import {ownPrivateAccount} from './ownPrivateAccount.ts';

/** View admission only. These selectors never create contact or conversation rights. */
export function uniqueOwnConnectionPeople(world:ProductWorld):Person[] {
  if(!ownPrivateAccount(world)) return [];
  const counts=new Map<string,number>();
  for(const person of world.people) counts.set(person.id,(counts.get(person.id)||0)+1);
  return world.people.filter(person=>typeof person.id==='string'&&person.id.trim()!==''&&person.id===person.id.trim()&&counts.get(person.id)===1);
}

export function incomingConnectionRequests(world:ProductWorld):Person[] {
  return uniqueOwnConnectionPeople(world).filter(person=>person.request==='received'&&!person.blocked&&!person.blockedByOther);
}

/** A displayed request must still be the same original when its decision is made. */
export function connectionRequestViewSnapshot(person:Person):string {
  return JSON.stringify([person.id,person.name,person.bio,person.avatar,person.purpose,person.request,person.requestId,person.requestDirection,person.publicIntroductionId,person.contact,person.consentSelf,person.consentOther,person.blocked,person.blockedByOther,person.venueId,person.communityVenueIds,person.publicAffiliationIds]);
}

export function currentIncomingConnectionRequest(world:ProductWorld,owner:string,id:string,expected:string):Person|undefined {
  if(world.owner!==owner) return;
  const person=incomingConnectionRequests(world).find(value=>value.id===id);
  return person&&connectionRequestViewSnapshot(person)===expected?person:undefined;
}
