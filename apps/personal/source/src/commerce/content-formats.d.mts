export type CreatorContentFormat='image'|'video'|'audio'|'article'|'document'|'note'|'live'|'poll';
export type CreatorContentFormatLabel='Image'|'Video'|'Audio'|'Article'|'Document'|'Note'|'Live'|'Poll';
export const creatorContentFormats:readonly CreatorContentFormat[];
export const creatorContentFormatLabels:Readonly<Record<CreatorContentFormat,CreatorContentFormatLabel>>;
export function declaredCreatorContentFormat(label:unknown):CreatorContentFormat|null;
export function creatorContentFormatLabel(format:unknown):CreatorContentFormatLabel|null;
