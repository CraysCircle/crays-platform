export const roundcubeCapabilityContract = {
  provider: "roundcube",
  supportedVersion: "1.7.2",
  transport: {
    inbound: ["imap", "webhook-or-poll-projection"],
    outbound: ["smtp-command", "provider-receipt"],
    browserCredentialExposure: false,
  },
  capabilities: {
    folders: true,
    threads: true,
    attachments: true,
    drafts: true,
    reply: true,
    forward: true,
    advancedSearch: true,
    signatures: true,
    sharedMailboxes: true,
    oauthOidc: true,
    markdownCompose: true,
  },
  integration: {
    route: "/mail",
    embedding: "same-origin-reverse-proxy",
    insecureCrossOriginIframe: false,
    objectBridge: "crays-core-mail-object-links",
    credentials: "server-only-secret-reference",
  },
  execution: {
    providerRuntimeConfigured: false,
    sandboxCaptureEnabled: true,
    externalSendEnabled: false,
  },
} as const;

export type RoundcubeCapabilityContract = typeof roundcubeCapabilityContract;
