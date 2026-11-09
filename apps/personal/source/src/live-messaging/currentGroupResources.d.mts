import type {openCurrentTextResources} from './currentTextResources.mjs';
import type {HumanConversationResources,HumanConversationBinding} from './humanConversationWorkspace.mjs';
export function openCurrentGroupResources(options:Parameters<typeof openCurrentTextResources>[0]&{
 authorizeGroup(binding:HumanConversationBinding,action:string,target?:string):boolean;
 candidates():{pubkey:string;name:string}[];
 resolvePackage(pubkey:string,options:{signal:AbortSignal}):Promise<any>;
 recovery?:{retry:(entry:any,options:{signal:AbortSignal})=>Promise<any>};
}):Promise<HumanConversationResources>;
