import type {ProductWorld} from './productModel';
/** Own private work requires the exact signed-in account, never a truthy imported flag. */
export function ownPrivateAccount(world:ProductWorld){
 return world?.identity?.signedIn===true&&typeof world.owner==='string'&&!!world.owner.trim()&&world.owner===world.owner.trim()&&!!world.profiles&&typeof world.profiles==='object'&&!Array.isArray(world.profiles)&&Object.hasOwn(world.profiles,world.owner)&&!!world.profiles[world.owner]&&typeof world.profiles[world.owner]==='object'&&!Array.isArray(world.profiles[world.owner]);
}
