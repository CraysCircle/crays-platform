/** Existing public test-profile media only. This projection supplies an image,
 * never matching, connection, profile freshness or private-source authority. */
export function recommendationPhoto(person,catalog,resolveMedia){
 if(person?.namespace!=='existing-owned-test-network'||typeof person.personId!=='string'||!/^[0-9a-f]{64}$/.test(person.pubkey??'')||!Array.isArray(catalog?.people)||typeof resolveMedia!=='function')return '';
 const matches=catalog.people.filter(p=>p?.id===person.personId&&p.pubkey===person.pubkey);
 if(matches.length!==1||catalog.people.filter(p=>p?.id===person.personId).length!==1||catalog.people.filter(p=>p?.pubkey===person.pubkey).length!==1||typeof matches[0].picture!=='string')return '';
 let image;try{image=resolveMedia(matches[0].picture);}catch{return '';}
 if(typeof image!=='string'||image.includes('..')||image.includes('\\')||/[\x00-\x20\x7f?#]/.test(image))return '';
 return /^\/api\/crays\/personal\/nostr\/public-stock\/[a-f0-9]{64}$/.test(image)||/^\/assets\/[a-zA-Z0-9_./-]+\.(?:png|jpg|jpeg|webp|avif)$/.test(image)?image:'';
}
