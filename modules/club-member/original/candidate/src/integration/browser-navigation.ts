"use client";

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}
const snapshot = () => window.location.pathname;
const serverSnapshot = () => '';

/** Used only by original public-shell navigation; no authorization decisions. */
export function usePathname() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
