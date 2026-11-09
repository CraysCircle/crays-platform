"use client";

import type { AuthProvider } from "@refinedev/core";
import type { QueryClient } from "@tanstack/react-query";
import { craysWorkspaceSessionQueryKey } from "@/providers/crays-bff-client";
import type { CraysWorkspaceSessionDto } from "@/lib/workspace/provider-contract";

function readCachedSession(queryClient: QueryClient, fallback: CraysWorkspaceSessionDto) {
  return queryClient.getQueryData<CraysWorkspaceSessionDto>(craysWorkspaceSessionQueryKey) ?? fallback;
}

export function createCraysAuthProvider(initialSession: CraysWorkspaceSessionDto, queryClient: QueryClient): AuthProvider {
  return {
    async login() {
      if (typeof window !== "undefined") window.location.assign("/auth/login");
      return { success: true };
    },

    async logout() {
      if (typeof window !== "undefined") window.location.assign("/auth/logout");
      return { success: true };
    },

    async check() {
      const session = readCachedSession(queryClient, initialSession);

      return {
        authenticated: session.status === "ready",
        redirectTo: session.status === "ready" ? undefined : "/auth/login",
        logout: false,
      };
    },

    async onError(error) {
      const statusCode = typeof error?.statusCode === "number" ? error.statusCode : undefined;
      if (statusCode === 401 || statusCode === 403) {
        return { redirectTo: "/auth/login", logout: false, error };
      }

      return {};
    },

    async getPermissions() {
      return readCachedSession(queryClient, initialSession).capabilities;
    },

    async getIdentity() {
      const session = readCachedSession(queryClient, initialSession);

      return {
        id: session.identity.accountId ?? session.authority.role,
        name: session.identity.displayName,
        role: session.authority.role,
        tenantId: session.authority.tenantId,
        authoritySource: session.authority.authoritySource,
      };
    },
  };
}
