/** Public links only. This never connects, imports or grants access to an external account. */
export const creatorSocialPlatforms = [
 {key:'website',name:'Website',hosts:[]},
 {key:'instagram',name:'Instagram',hosts:['instagram.com']},
 {key:'tiktok',name:'TikTok',hosts:['tiktok.com']},
 {key:'youtube',name:'YouTube',hosts:['youtube.com','youtu.be']},
 {key:'x',name:'X',hosts:['x.com','twitter.com']},
 {key:'snapchat',name:'Snapchat',hosts:['snapchat.com']},
 {key:'facebook',name:'Facebook',hosts:['facebook.com','fb.com']},
 {key:'linkedin',name:'LinkedIn',hosts:['linkedin.com']},
 {key:'threads',name:'Threads',hosts:['threads.com','threads.net']},
 {key:'pinterest',name:'Pinterest',hosts:['pinterest.com','pin.it']},
 {key:'twitch',name:'Twitch',hosts:['twitch.tv']},
 {key:'discord',name:'Discord',hosts:['discord.com','discord.gg']},
 {key:'telegram',name:'Telegram',hosts:['t.me','telegram.me','telegram.org']},
 {key:'whatsapp',name:'WhatsApp',hosts:['wa.me','whatsapp.com']},
 {key:'reddit',name:'Reddit',hosts:['reddit.com','redd.it']},
 {key:'patreon',name:'Patreon',hosts:['patreon.com']},
 {key:'spotify',name:'Spotify',hosts:['spotify.com']},
] as const;
export type CreatorSocialLink={label:string;url:string};
export function validCreatorLink(value:unknown):string|undefined {
 if(typeof value!=='string'||!value.trim()||/[\u0000-\u001f\u007f]/.test(value))return;
 try{const u=new URL(value.trim());if(u.protocol==='https:'&&u.hostname&&!u.username&&!u.password)return value.trim();}catch{}
}
export function creatorPublicLinks(value:unknown):CreatorSocialLink[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>();return value.flatMap(v=>{
  if(!v||typeof v.label!=='string'||!v.label.trim())return [];
  const url=validCreatorLink(v.url);if(!url||seen.has(url))return [];
  seen.add(url);return [{label:v.label.trim(),url}];
 });
}
export function creatorLinksFromDraft(data:Record<string,string>,existing:unknown=[]):CreatorSocialLink[]{
 const prior=creatorPublicLinks(existing),links:CreatorSocialLink[]=[];
 for(const p of creatorSocialPlatforms){
  const old=prior.find(l=>l.label.toLowerCase()===p.key||l.label.toLowerCase()===p.name.toLowerCase());
  const raw=Object.hasOwn(data,p.key)?data[p.key]:old?.url;
  if(!raw?.trim())continue;
  const url=validCreatorLink(raw);if(!url)throw Error(`Use a valid https address without account credentials for ${p.name}.`);
  const host=new URL(url).hostname.toLowerCase();
  if(p.hosts.length&&!p.hosts.some(h=>host===h||host.endsWith('.'+h)))throw Error(`Use the actual ${p.name} profile address, or add this destination as another link.`);
  links.push({label:p.key,url});
 }
 let custom:unknown;
 if(Object.hasOwn(data,'customLinks')){try{custom=JSON.parse(data.customLinks||'[]');}catch{throw Error('Review your additional link names and addresses.');}}
 else custom=prior.filter(l=>!creatorSocialPlatforms.some(p=>l.label.toLowerCase()===p.key||l.label.toLowerCase()===p.name.toLowerCase()));
 if(!Array.isArray(custom))throw Error('Additional links must be a list of named destinations.');
 for(const link of custom){
  if(link && typeof link.label==='string' && typeof link.url==='string' && !link.label.trim() && !link.url.trim())continue;
  if(typeof link?.label!=='string'||!link.label.trim()||typeof link?.url!=='string'||!validCreatorLink(link.url))throw Error('Give every additional link a name and a valid https address.');
  links.push({label:link.label.trim(),url:validCreatorLink(link.url)!});
 }
 return creatorPublicLinks(links);
}

/** One chosen public link set for ordinary and creator views; a private draft never leaks. */
export function profilePublicLinks(objects:readonly Record<string,unknown>[],personId:string):CreatorSocialLink[]{
 const shared=objects.find(o=>o.kind==='profile-social-links'&&o.personId===personId&&o.status==='published-demo');
 if(shared)return creatorPublicLinks(shared.links);
 return creatorPublicLinks(objects.find(o=>o.kind==='creator-profile'&&o.personId===personId&&o.status==='published-demo')?.links);
}
