import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { canonicalAccountBinding, CRAYS_MODULES, type AccountBinding } from './craysPlatform.mjs';
import { CRAYS_DATA_CHANNELS } from './bff.mjs';
interface CraysPlatform {
 readonly account: Readonly<AccountBinding>;
 readonly modules: typeof CRAYS_MODULES;
 readonly channels: typeof CRAYS_DATA_CHANNELS;
 /** Presentation eligibility only: Work BFF authorises each business request. */
 readonly workEntryAvailable: boolean;
}
const Context = createContext<CraysPlatform | null>(null);
export function CraysPlatformProvider({accountId, workEntryAvailable, children}: {accountId: string; workEntryAvailable: boolean; children: ReactNode}) {
 const value = useMemo(() => Object.freeze({account: canonicalAccountBinding(accountId), modules: CRAYS_MODULES, channels: CRAYS_DATA_CHANNELS, workEntryAvailable}), [accountId, workEntryAvailable]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
/** Standalone preview has no canonical account; never manufacture one from its local world. */
export function useOptionalCraysPlatform() { return useContext(Context); }
