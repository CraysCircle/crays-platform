"use client";

import { Refine, type ResourceProps } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { CraysWorkspaceResourceDto, CraysWorkspaceSessionDto } from "@/lib/workspace/provider-contract";
import { createCraysAccessControlProvider } from "@/providers/crays-access-control-provider";
import { createCraysAuthProvider } from "@/providers/crays-auth-provider";
import { craysWorkspaceSessionQueryKey } from "@/providers/crays-bff-client";
import { createCraysDataProvider } from "@/providers/crays-data-provider";

function resourcePath(resource: CraysWorkspaceResourceDto, action: "list" | "show" | "create" | "edit") {
  const base = `/dashboard?view=resource&resource=${encodeURIComponent(resource.name)}`;
  if (action === "list") return base;
  if (action === "create") return `${base}&mode=create`;
  return `${base}&mode=${action}&id=:id`;
}

function refineResources(resources: CraysWorkspaceResourceDto[]): ResourceProps[] {
  return resources.map((resource) => ({
    name: resource.name,
    list: resourcePath(resource, "list"),
    show: resource.supportedOperations.includes("get") ? resourcePath(resource, "show") : undefined,
    create: resource.supportedOperations.includes("create") ? resourcePath(resource, "create") : undefined,
    edit: resource.supportedOperations.includes("update") ? resourcePath(resource, "edit") : undefined,
    meta: {
      label: resource.label,
      description: resource.description,
      schemaStatus: resource.schemaStatus,
      idField: resource.idField,
      fields: resource.fields,
      pagination: resource.pagination,
      savedViews: resource.savedViews,
    },
  }));
}

export function CraysWorkspaceProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: CraysWorkspaceSessionDto;
}) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
        mutations: {
          retry: 0,
        },
      },
    });
    client.setQueryData(craysWorkspaceSessionQueryKey, initialSession);
    return client;
  });
  const [dataProvider] = useState(() => createCraysDataProvider());
  const [authProvider] = useState(() => createCraysAuthProvider(initialSession, queryClient));
  const [accessControlProvider] = useState(() => createCraysAccessControlProvider());
  const [resources] = useState(() => refineResources(initialSession.resources));

  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProvider}
      accessControlProvider={accessControlProvider}
      resources={resources}
      options={{
        disableTelemetry: true,
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        mutationMode: "pessimistic",
        reactQuery: {
          clientConfig: queryClient,
        },
        redirect: {
          afterCreate: false,
          afterClone: false,
          afterEdit: false,
        },
        title: {
          text: "CRAYS OS",
        },
      }}
    >
      {children}
    </Refine>
  );
}
