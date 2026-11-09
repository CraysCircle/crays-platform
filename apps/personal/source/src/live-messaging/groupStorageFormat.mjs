/** Persisted protocol discriminator. Never infer an engine from a failed read,
 * a group identifier's length, or a default for an unknown schema. Historical
 * v1 rows keep their original engine; original MDK rows require explicit v2.
 */
export const originalMdkFormat='crays-original-mdk-current-v1';
export const legacyGroupFormat='crays-marmot-ts-welcome-context-v1';
export function groupStorageFormat(row){
 if(row?.schema==='crays.owner-group-context.v1'&&!Object.hasOwn(row,'storageFormat')&&typeof row.groupId==='string'&&/^[a-f0-9]{64}$/.test(row.groupId))return legacyGroupFormat;
 if(row?.schema==='crays.owner-group-context.v2'&&row.storageFormat===originalMdkFormat&&typeof row.groupId==='string'&&/^[a-f0-9]{32}$/.test(row.groupId))return originalMdkFormat;
 throw Error('This group storage version is unavailable');
}
/** Binding validation preserves legacy 32-byte IDs; the new 16-byte original
 * group ID is accepted only behind an explicit group-only protocol grant. */
export function validBoundGroupId(binding){
 if(binding?.storageFormat===undefined)return typeof binding?.groupId==='string'&&/^[a-f0-9]{64}$/.test(binding.groupId);
 return binding.storageFormat===originalMdkFormat&&['circle','spot'].includes(binding.kind)&&typeof binding.groupId==='string'&&/^[a-f0-9]{32}$/.test(binding.groupId);
}
