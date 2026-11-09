import {validVenueImage} from './venueSetup.ts';
/** Resolve an existing image reference; never choose a substitute image or mutate its owner. */
export function resolveCraysMedia(value:unknown):string {
 if(typeof value!=='string'||!value||/[\u0000-\u001f\u007f\\]/u.test(value))return '';
 if(value.startsWith('data:'))return validVenueImage(value)?value:'';
 if(/^https?:\/\//i.test(value)){
  try{const url=new URL(value);return !url.username&&!url.password&&!!url.hostname?value:'';}catch{return '';}
 }
 if(value.startsWith('blob:')){
  try{const url=new URL(value),origin=new URL(value.slice(5));return url.protocol==='blob:'&&['http:','https:'].includes(origin.protocol)&&!origin.username&&!origin.password?value:'';}catch{return '';}
 }
 // Existing root-relative assets already carry their namespace, including nested asset paths.
 if(value.startsWith('/assets/')&&!value.includes('/../')&&!value.includes('/./')){
  // Repair only repeated literal CRAYS namespaces, preserving the exact same filename.
  let rest=value;
  let count=0;
  while(rest.startsWith('/assets/crays/')||rest.startsWith('assets/crays/')){rest=rest.replace(/^\/?assets\/crays\//,'');count++;}
  if(count>1&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(rest))return '/assets/crays/'+rest;
  return value;
 }
 const relative=value.replace(/^\.\//,'');
 if(/^assets\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(relative)&&!relative.split('/').some(s=>s==='.'||s==='..'))return '/'+relative;
 if(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value))return '/assets/crays/'+value;
 return '';
}
