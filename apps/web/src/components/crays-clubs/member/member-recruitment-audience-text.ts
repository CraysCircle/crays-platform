/** Existing draft fields remain human-authored text, never country/locale IDs.
 * UI list rendering is allowed only for simple comma-separated labels. Preserve
 * any existing syntactically unsupported or over-limit text through the legacy text editor. */
export const referenceAudienceSelectionLimit = 5;
export function recruitmentAudienceLabels(value: string): readonly string[] | null {
  if (!value.trim()) return [];
  const labels=value.split(",").map(label=>label.trim());
  if(labels.length>referenceAudienceSelectionLimit || labels.some(label=>!label || /[\r\n]/.test(label)) ||
     new Set(labels.map(label=>label.toLowerCase())).size!==labels.length)return null;
  return labels;
}
export function addRecruitmentAudienceLabel(value: string, entry: string):
  {status:"ready";value:string}|{status:"invalid";reason:string} {
  const labels=recruitmentAudienceLabels(value),label=entry.trim();
  if(labels===null)return {status:"invalid",reason:"Keep or edit your original audience text before adding a selection."};
  if(!label || /[,\r\n]/.test(label))return {status:"invalid",reason:"Add one country or language label at a time."};
  if(labels.some(item=>item.toLowerCase()===label.toLowerCase()))return {status:"invalid",reason:"That selection is already included."};
  if(labels.length>=referenceAudienceSelectionLimit)return {status:"invalid",reason:"Choose up to five selections."};
  return {status:"ready",value:[...labels,label].join(", ")};
}
