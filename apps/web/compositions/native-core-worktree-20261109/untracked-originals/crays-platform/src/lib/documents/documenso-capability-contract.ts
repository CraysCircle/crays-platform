export const documensoCapabilityContract = {
  provider: "documenso",
  supportedVersion: "2.11.0",
  apiVersion: "v2",
  integration: {
    transport: "server-to-server-rest",
    webhookVerification: "hmac-sha256",
    browserCredentialExposure: false,
    businessObjectBridge: "crays-core-managed-documents",
    binaryStorage: "provider-or-approved-object-storage-reference",
  },
  capabilities: {
    templates: true,
    recipients: true,
    signingSessions: true,
    lifecycleWebhooks: true,
    completionCertificates: true,
    ordinaryElectronicSignature: true,
    advancedElectronicSignature: false,
    qualifiedElectronicSignature: false,
  },
  qualificationBoundary: {
    advancedRequiresReviewedProviderCapability: true,
    qualifiedRequiresEnterpriseCscQtspTsa: true,
    silentDowngradeAllowed: false,
  },
  execution: {
    providerRuntimeConfigured: false,
    sandboxSigningEnabled: true,
    realUploadEnabled: false,
    externalInvitationEnabled: false,
  },
} as const;

export type DocumensoCapabilityContract = typeof documensoCapabilityContract;
