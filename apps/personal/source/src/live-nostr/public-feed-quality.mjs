// Presentation policy only. Never grants identity, changes relay selection or edits events.
// Call with the current signed profile presentation for this exact post author.
export function publicAutomationReason(profile, authorPubkey) {
  const event = profile?.original?.event;
  if (!profile || profile.pubkey !== authorPubkey || event?.pubkey !== authorPubkey || event.kind !== 0) return null;
  let metadata;
  try { metadata = JSON.parse(event.content); } catch { return null; }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  if (metadata.bot === true || metadata.is_bot === true || metadata.automated === true) return 'declared-automation';
  const names = [metadata.display_name, metadata.displayName, metadata.name].filter(value => typeof value === 'string').join(' ').normalize('NFKC');
  // Explicit aggregate/synchronization labels, independent of post language or avatar.
  const timeline = /(?:public\s+timeline|公共时间线|公共時間線|öffentliche\s+timeline)/iu.test(names);
  const synchronization = /(?:sync(?:hroni[sz](?:ation|erung))?|同步|sammelfeed)/iu.test(names);
  if (timeline && synchronization) return 'public-timeline-synchronization';
  return null;
}
