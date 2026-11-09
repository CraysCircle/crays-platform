"use client";

import { useCallback, useRef } from "react";

export function useClubsCommandReconciliation() {
  const keys = useRef(new Map<string, string>());

  const acquire = useCallback((scope: string, prefix: string) => {
    const existing = keys.current.get(scope);
    if (existing) return existing;
    const key = `${prefix}:${crypto.randomUUID()}`;
    keys.current.set(scope, key);
    return key;
  }, []);

  const complete = useCallback((scope: string) => {
    keys.current.delete(scope);
  }, []);

  return { acquire, complete };
}
