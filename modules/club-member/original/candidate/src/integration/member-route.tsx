"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';

/** Presentation only. The original BFF derives identity and permissions server-side. */
export type MemberRoutePort = {
  /** Original Club hash, e.g. #bookings/<original-id>, independent of host routing. */
  getSnapshot: () => string;
  subscribe: (listener: () => void) => () => void;
  navigate: (originalHash: string) => void;
};

const browserRoute: MemberRoutePort = {
  getSnapshot: () => window.location.hash,
  subscribe: (listener) => {
    window.addEventListener('hashchange', listener);
    window.addEventListener('popstate', listener);
    return () => {
      window.removeEventListener('hashchange', listener);
      window.removeEventListener('popstate', listener);
    };
  },
  navigate: (hash) => {
    if (!hash.startsWith('#')) throw new Error('Expected an original Club hash');
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new Event('hashchange'));
  },
};

const RouteContext = createContext<MemberRoutePort>(browserRoute);
const serverSnapshot = () => '';

export function MemberRouteProvider({ port, children }: { port: MemberRoutePort; children: ReactNode }) {
  return <RouteContext.Provider value={port}>{children}</RouteContext.Provider>;
}

export function useMemberRoute() {
  const port = useContext(RouteContext);
  const hash = useSyncExternalStore(port.subscribe, port.getSnapshot, serverSnapshot);
  return { hash, navigate: port.navigate };
}
