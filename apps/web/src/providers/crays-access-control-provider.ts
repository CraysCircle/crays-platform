"use client";

import type { AccessControlProvider } from "@refinedev/core";
import { fetchCraysAccessDecision } from "@/providers/crays-bff-client";

export function createCraysAccessControlProvider(): AccessControlProvider {
  return {
    options: {
      buttons: {
        enableAccessControl: true,
        hideIfUnauthorized: true,
      },
    },
    async can({ resource, action, params }) {
      try {
        return await fetchCraysAccessDecision({ resource, action, params });
      } catch (error) {
        return {
          can: false,
          reason: error instanceof Error ? error.message : "CRAYS access decision failed closed.",
        };
      }
    },
  };
}
