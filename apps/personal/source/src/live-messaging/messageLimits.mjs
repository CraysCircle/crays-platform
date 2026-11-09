/** The original parent supports one 32,000 UTF-16-code-unit draft. Keep the
 * browser, ordinary/reply transport, encrypted journals and selected forward in
 * agreement. This is not a promise about an unrelated public relay's policy. */
export const MESSAGE_MAX_CODE_UNITS=32000;
// A JSON string may escape each code unit as six ASCII bytes; allow that plus
// bounded original conversation/request IDs and the optional reply reference.
export const MESSAGE_HTTP_MAX_BODY_BYTES=256*1024;
export function validMessageText(value){
 if(typeof value!=='string'||value.length>MESSAGE_MAX_CODE_UNITS)return false;
 // Marmot's pinned inner-event codec rejects unpaired surrogates. Refuse them
 // before an attempt is persisted/published rather than silently replacing them.
 for(let i=0;i<value.length;i++){
  const unit=value.charCodeAt(i);
  if(unit>=0xd800&&unit<=0xdbff){const next=value.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false;}
  else if(unit>=0xdc00&&unit<=0xdfff)return false;
 }
 return true;
}
