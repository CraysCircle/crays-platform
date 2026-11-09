import {withWorkspaceEntryDeadline} from './workspaceEntryDeadline.mjs';
import {readCraysBff} from './platform/bff.mjs';
import { useEffect, useState } from 'react';
import type * as OriginalModule from './member-club-runtime/integration/ClubMemberModule';
type ClubModule = typeof OriginalModule;
let pending: Promise<ClubModule> | null = null;
/** Only a version-pinned same-origin server registry supplies executable module URLs. */
export function loadClubModule(): Promise<ClubModule> {
  if (!pending) pending = withWorkspaceEntryDeadline(async signal => {
    const response = await readCraysBff('moduleManifest',{signal});
    if (!response.ok) throw Error('MODULE_REGISTRY_UNAVAILABLE');
    const registry: unknown = await response.json();
    const module = (registry as { schema?: unknown; modules?: { clubMember?: { version?: unknown; entry?: unknown; css?: unknown } } });
    const value = module.modules?.clubMember;
    if (module.schema !== 'crays.unified-platform.modules.v1' || !value || typeof value.version !== 'string'
      || !/^club-member-[a-f0-9]{16}$/.test(value.version)
      || value.entry !== '/modules/' + value.version + '/club-member-module.mjs'
      || value.css !== '/modules/' + value.version + '/club-member-module.css') throw Error('MODULE_REGISTRY_INVALID');
    const moduleReady = import(/* @vite-ignore */ value.entry) as Promise<ClubModule>;
    const id = 'crays-module-css-' + value.version;
    let styleReady: Promise<void> = Promise.resolve();
    if (!document.getElementById(id)) {
      const css = document.createElement('link'); css.id = id; css.rel = 'stylesheet'; css.href = value.css;
      styleReady = new Promise<void>((resolve, reject) => { css.onload = () => resolve(); css.onerror = () => reject(Error('MODULE_STYLE_UNAVAILABLE')); document.head.append(css); });
    }
    let loaded:ClubModule;try{[loaded] = await Promise.all([moduleReady, styleReady]);}catch(error){document.getElementById(id)?.remove();throw error;}
    if (typeof loaded.ClubMemberModule !== 'function' || typeof loaded.readOriginalPlatformIdentity !== 'function'
      || typeof loaded.OriginalAccountEntryPresentation !== 'function') throw Error('MODULE_INTERFACE_INVALID');
    return loaded;
  }).catch(error => { pending = null; throw error; });
  return pending;
}
export function useClubModule() {
  const [module, setModule] = useState<ClubModule | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let current = true; loadClubModule().then(value => { if (current) setModule(value); }).catch(() => { if (current) setFailed(true); }); return () => { current = false; }; }, []);
  return { module, failed };
}
