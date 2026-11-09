/** Inner kind9 chat convention: one encrypted e-tag references the original
 * inner rumor, never an outer relay envelope or another conversation lookup. */
export const validReplyId=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function replyToFromTags(tags){
 if(!Array.isArray(tags))return null;
 const references=tags.filter(tag=>Array.isArray(tag)&&tag[0]==='e');
 const marked=references.filter(tag=>tag[3]==='reply');
 const selected=marked.length===1?marked[0]:marked.length===0&&references.length===1?references[0]:null;
 return selected&&validReplyId(selected[1])?selected[1]:null;
}
