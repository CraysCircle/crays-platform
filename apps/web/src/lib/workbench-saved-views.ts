import type { RoleKey } from "@/lib/roles";

export type WorkbenchModuleKey = "crm" | "project" | "erp" | "files" | "analytics" | "loans" | "operations";

export type WorkbenchViewType = "table" | "board" | "timeline" | "calendar" | "dashboard" | "matrix";

export type WorkbenchSavedView = {
  key: string;
  label: string;
  type: WorkbenchViewType;
  role: RoleKey;
  ownerRole: RoleKey;
  department: string;
  workspace: string;
  isDefault: boolean;
  search: string;
  status: string;
  density: "comfortable" | "compact" | "dense";
  sort: "priority" | "updated" | "owner";
  groupBy: string;
  columns: string[];
  sourceFamilies: string[];
  sourceRecordCount: number;
  commandDraftCount: number;
};

export type WorkbenchSavedViewsReadModel = {
  access: {
    allowed: boolean;
    role: RoleKey;
    moduleKey: WorkbenchModuleKey;
    level: "role_workbench" | "forbidden";
  };
  views: WorkbenchSavedView[];
  activeDefaultViewKey: string | null;
  source: {
    persistedInCore: boolean;
    queryStatus: "schema_ready" | "not_configured" | "forbidden";
    sourceRecordCount: number;
    commandDraftCount: number;
    sourceFamilies: Array<{ key: string; count: number; lastSyncedAt: string | null }>;
  };
  boundaries: {
    sourceWritesEnabled: false;
    syncApplyEnabled: false;
    toolApplyEnabled: false;
    externalSendingEnabled: false;
    releaseEnabled: false;
  };
};
