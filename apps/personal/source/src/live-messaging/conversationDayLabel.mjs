/** Browser-local calendar days: never infer a date for an un-timestamped message. */
export function conversationDayLabel(seconds, now = new Date()) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  const keyOf = value => [value.getFullYear(), value.getMonth() + 1, value.getDate()].join('-');
  const key = keyOf(date);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const label = key === keyOf(now) ? 'Today' : key === keyOf(yesterday) ? 'Yesterday' : date.toLocaleDateString([], {year:'numeric', month:'short', day:'numeric'});
  return {key, label, iso:date.toISOString()};
}
