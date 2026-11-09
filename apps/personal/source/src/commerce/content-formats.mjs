// Declared product formats, not a claim of playable or delivered media.
export const creatorContentFormatLabels=Object.freeze({image:'Image',video:'Video',audio:'Audio',article:'Article',document:'Document',note:'Note',live:'Live',poll:'Poll'});
export const creatorContentFormats=Object.freeze(Object.keys(creatorContentFormatLabels));
export function declaredCreatorContentFormat(label){
 const match=Object.entries(creatorContentFormatLabels).find(([,value])=>value===label);
 return match?match[0]:null;
}
export function creatorContentFormatLabel(format){return Object.hasOwn(creatorContentFormatLabels,format)?creatorContentFormatLabels[format]:null;}
