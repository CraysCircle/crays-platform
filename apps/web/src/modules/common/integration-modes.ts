import type { ModuleKey } from "@/lib/modules";

export type SourceEngineKey =
  | "crays-core"
  | "crm-engine"
  | "project-engine"
  | "erp-engine"
  | "file-engine"
  | "analytics-engine"
  | "loan-engine"
  | "communication-engine"
  | "operations-engine"
  | "hr-engine"
  | "learning-engine"
  | "support-engine"
  | "site-engine"
  | "sync-engine"
  | "settings-engine";

export type IntegrationMode =
  | "api-bff-adapter"
  | "sync-read-model"
  | "webhook-event-adapter"
  | "source-faithful-surface"
  | "source-component-wrapper"
  | "transitional-embed";

export type IntegrationModeDefinition = {
  key: IntegrationMode;
  label: string;
  finalUse: "preferred" | "conditional" | "temporary";
  rule: string;
};

export type ModuleIntegrationProfile = {
  module: ModuleKey;
  sourceEngine: SourceEngineKey;
  modes: IntegrationMode[];
  uiRule: string;
};

export const integrationModeDefinitions: IntegrationModeDefinition[] = [
  {
    key: "api-bff-adapter",
    label: "API/BFF adapter",
    finalUse: "preferred",
    rule: "Next.js route handlers or server services call module APIs and expose CRAYS-native responses to the UI.",
  },
  {
    key: "sync-read-model",
    label: "Sync read model",
    finalUse: "preferred",
    rule: "CRAYS stores role-scoped read models, events and mapping IDs for dashboards, search and cross-module workflows.",
  },
  {
    key: "webhook-event-adapter",
    label: "Webhook/event adapter",
    finalUse: "preferred",
    rule: "Module changes enter CRAYS as verified events before they update KPIs, audit logs, notifications or automation.",
  },
  {
    key: "source-faithful-surface",
    label: "Source-faithful surface",
    finalUse: "preferred",
    rule: "CRAYS-owned React surfaces reproduce the source engine's real object, workflow and view contracts without visible source branding.",
  },
  {
    key: "source-component-wrapper",
    label: "Source component wrapper",
    finalUse: "conditional",
    rule: "Direct component reuse is allowed only after license, build, routing, styling, accessibility and branding review.",
  },
  {
    key: "transitional-embed",
    label: "Transitional embed",
    finalUse: "temporary",
    rule: "Embeds are short-lived bridges only; they must hide source branding/login, load fast enough for QA, and have a replacement ticket.",
  },
];

export const moduleIntegrationProfiles: ModuleIntegrationProfile[] = [
  {
    module: "dashboard",
    sourceEngine: "crays-core",
    modes: ["sync-read-model", "webhook-event-adapter"],
    uiRule: "Dashboard reads CRAYS events and role-scoped KPI snapshots, not raw module screens.",
  },
  {
    module: "crm",
    sourceEngine: "crm-engine",
    modes: [
      "api-bff-adapter",
      "sync-read-model",
      "webhook-event-adapter",
      "source-faithful-surface",
      "source-component-wrapper",
      "transitional-embed",
    ],
    uiRule: "CRM surfaces must preserve object, view, record panel, workflow and communication behavior behind CRAYS labels.",
  },
  {
    module: "project",
    sourceEngine: "project-engine",
    modes: [
      "api-bff-adapter",
      "sync-read-model",
      "webhook-event-adapter",
      "source-faithful-surface",
      "source-component-wrapper",
      "transitional-embed",
    ],
    uiRule: "Project surfaces must preserve projects, work items, cycles, modules, views, pages and delivery state behind CRAYS labels.",
  },
  {
    module: "erp",
    sourceEngine: "erp-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "ERP surfaces must use DocType, finance and workflow contracts through CRAYS finance scopes.",
  },
  {
    module: "files",
    sourceEngine: "file-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "Files surfaces must enforce CRAYS document grants before showing previews, versions or package contents.",
  },
  {
    module: "analytics",
    sourceEngine: "analytics-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
    uiRule: "Analytics surfaces read CRAYS-approved datasets and never become the source of operational permissions.",
  },
  {
    module: "loans",
    sourceEngine: "loan-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "Loans surfaces release bank-visible records only after CRAYS KYC, AML, consent and document scope checks.",
  },
  {
    module: "chat",
    sourceEngine: "communication-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "Chat surfaces separate internal, shared and external messages by participant, channel, object and permission scope.",
  },
  {
    module: "operations",
    sourceEngine: "operations-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "Operations surfaces are studio-scoped and must feed service, access and readiness events back into CRAYS.",
  },
  {
    module: "hr",
    sourceEngine: "hr-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "HR surfaces keep people data restricted and separated from deal or partner finance views.",
  },
  {
    module: "learning",
    sourceEngine: "learning-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "Learning surfaces map progress and certification records to CRAYS roles, studios and readiness events.",
  },
  {
    module: "support",
    sourceEngine: "support-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface", "transitional-embed"],
    uiRule: "Support surfaces link tickets, SLAs, messages and attachments to CRAYS access rules.",
  },
  {
    module: "sites",
    sourceEngine: "site-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
    uiRule: "Sites surfaces publish only approved CRAYS data and route submissions into platform workflows.",
  },
  {
    module: "sync",
    sourceEngine: "sync-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
    uiRule: "Sync surfaces resolve mappings and jobs without bypassing module ownership or permissions.",
  },
  {
    module: "settings",
    sourceEngine: "settings-engine",
    modes: ["api-bff-adapter", "sync-read-model", "webhook-event-adapter", "source-faithful-surface"],
    uiRule: "Settings surfaces consolidate module configuration into CRAYS permissions and global administration.",
  },
];

export function integrationProfileForModule(module: ModuleKey) {
  return moduleIntegrationProfiles.find((profile) => profile.module === module);
}
