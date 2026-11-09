export type CraysModuleId = 'personal' | 'club' | 'gym' | 'coffee' | 'shop' | 'pro' | 'work';
export type CraysNavigationRoot = 'you' | 'explore' | 'spots' | 'activity' | 'club' | 'gym' | 'coffee' | 'shop';
export interface ModuleDefinition { readonly id: CraysModuleId; readonly mode: 'personal' | 'work'; readonly data: string; readonly authority: string }
export interface AccountBinding { readonly accountId: string; readonly personId: null; readonly authority: 'original-core-session' }
export const CRAYS_MODULES: Readonly<Record<CraysModuleId, ModuleDefinition>>;
export const CRAYS_NAVIGATION: readonly Readonly<{id: CraysNavigationRoot; label: string; module: CraysModuleId}>[];
export function canonicalAccountBinding(accountId: string): Readonly<AccountBinding>;
export function previewStorageKey(baseKey: string, accountId: string): string;
export function moduleForNavigation(root: string): ModuleDefinition;
