import type {ProductWorld} from './productModel';
export const notificationCategories=['System','Chat','Venue','Connections'] as const;
export type NotificationCategory=typeof notificationCategories[number];
export const notificationDelivery=['In-app','Batched','Muted'] as const;
export const notificationQuiet=['Off','22:00–08:00','21:00–09:00'] as const;
export const notificationUrgent=['Hold','Allow reviewed urgent updates'] as const;
export type TimingChoice={quiet:typeof notificationQuiet[number];urgent:typeof notificationUrgent[number]};
export const notificationOwnKey=(owner:string,category:string,part:'delivery'|'timing')=>`web-notification:${owner}:${category}:${part}`;
function categoryChecked(category:string):asserts category is NotificationCategory{if(!(notificationCategories as readonly string[]).includes(category))throw Error('Choose one of your original notification categories.');}
export function parseNotificationTiming(value:unknown):TimingChoice|null{try{if(typeof value!=='string')return null;const x=JSON.parse(value);return x&&Object.keys(x).length===2&&notificationQuiet.includes(x.quiet)&&notificationUrgent.includes(x.urgent)?{quiet:x.quiet,urgent:x.urgent}:null;}catch{return null;}}
export function notificationPreference(w:ProductWorld,category:string){
 categoryChecked(category);
 const ownDelivery=w.settings[notificationOwnKey(w.owner,category,'delivery')],ownTiming=w.settings[notificationOwnKey(w.owner,category,'timing')];
 const legacyDelivery=w.owner==='thorben'?w.settings['notifications:'+category]:undefined,legacyTiming=w.owner==='thorben'?w.settings['notifications:timing:'+category]:undefined;
 const deliveryRaw=ownDelivery===undefined?legacyDelivery:ownDelivery,timingRaw=ownTiming===undefined?legacyTiming:ownTiming;
 const delivery=deliveryRaw===undefined?'In-app':typeof deliveryRaw==='string'&&(notificationDelivery as readonly string[]).includes(deliveryRaw)?deliveryRaw:null;
 const timing=timingRaw===undefined?{quiet:'Off',urgent:'Hold'} as TimingChoice:parseNotificationTiming(timingRaw);
 return {delivery,timing,deliveryRaw,timingRaw,deliveryDefault:deliveryRaw===undefined,timingDefault:timingRaw===undefined,problem:!delivery||!timing,snapshot:JSON.stringify([w.owner,category,ownDelivery??null,ownTiming??null,legacyDelivery??null,legacyTiming??null])};
}
export function saveNotificationPreference(w:ProductWorld,owner:string,category:string,part:string,expected:string,value:string,reviewed:string){
 categoryChecked(category);const pref=notificationPreference(w,category);
 if(!w.identity.signedIn||!owner||w.owner!==owner||expected!==pref.snapshot)throw Error('Your account or these saved preferences changed. Review the current category again.');
 if(pref.problem)throw Error('These original preferences need review. Their values have been retained.');
 if(part!=='delivery'&&part!=='timing')throw Error('Choose delivery or timing separately.');
 if(part==='delivery'&&!(notificationDelivery as readonly string[]).includes(value))throw Error('Choose an original delivery preference.');
 if(part==='timing'&&(reviewed!=='Yes'||!parseNotificationTiming(value)))throw Error('Review these exact quiet hours and urgency choices before saving.');
 return {...w,settings:{...w.settings,[notificationOwnKey(owner,category,part)]:part==='timing'?JSON.stringify(parseNotificationTiming(value)):value}};
}
export function ownNotifications(w:ProductWorld){
 if(!w.identity.signedIn||!Array.isArray(w.notifications))return [];
 return w.notifications.filter(n=>{const record=n as unknown as Record<string,unknown>;
 if(!n||typeof n.id!=='string'||!n.id.trim()||w.notifications.filter(x=>x&&x.id===n.id).length!==1||typeof n.text!=='string'||typeof n.ref!=='string'||typeof n.read!=='boolean'||!(notificationCategories as readonly string[]).includes(n.type))return false;
 if(record.owner===undefined?w.owner!=='thorben':record.owner!==w.owner)return false;
 // An explicit private purpose without a verified source cannot be inferred from a generic feature link.
 if(record.purpose!==undefined&&record.purpose!=='System')return false;
 return true;
 });
}
export function notificationDate(n:ProductWorld['notifications'][number]):number|null{const value=(n as unknown as Record<string,unknown>).createdAt;return typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=Date.now()?value:null;}
export function notificationInPeriod(n:ProductWorld['notifications'][number],period:string,now=Date.now()){
 const at=notificationDate(n);if(period==='All time')return true;if(period==='Undated')return at===null;if(at===null)return false;
 const start=new Date(now);start.setHours(0,0,0,0);if(period==='This week')start.setDate(start.getDate()-((start.getDay()+6)%7));else if(period!=='Today')return false;return at>=start.getTime()&&at<=now;
}
