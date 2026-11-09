import "server-only";

import { createHash } from "node:crypto";

const COMMAND_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,199}$/;
const PRINCIPAL = /^[A-Za-z0-9][A-Za-z0-9._@+-]{0,127}$/;
const GROUP_KEY = /^crays-nc-[a-z2-7]{16,52}$/;
const MAX_RESPONSE_BYTES = 64 * 1024;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type ExactProviderScope = Readonly<{
  providerInstanceId: string;
  providerOrganizationScopeId: string;
}>;

export class NextcloudCollaborationAccessProviderError extends Error {
  constructor(
    readonly outcome: "rejected" | "unknown",
    readonly code: string,
  ) {
    super(code);
    this.name = "NextcloudCollaborationAccessProviderError";
  }
}

export type NextcloudAccessAcknowledgement = Readonly<{
  commandId: string;
  providerInstanceId: string;
  providerOrganizationScopeId: string;
  operation: "CREATE_GROUP" | "ADD_MEMBERSHIP" | "REMOVE_MEMBERSHIP";
  providerStatusCode: 100;
  requestSha256: string;
  responseSha256: string;
  state: "ACKNOWLEDGED_PENDING_RECONCILIATION";
  mutatesCraysAuthority: false;
}>;

export type NextcloudGroupObservation = Readonly<{
  providerInstanceId: string;
  providerOrganizationScopeId: string;
  groupKey: string;
  principalRefs: readonly string[];
  responseSha256: string;
  observedState: "PROVIDER_OBSERVED_PENDING_RECONCILIATION";
  mutatesCraysAuthority: false;
}>;

type OcsEnvelope = Readonly<{
  ocs?: Readonly<{
    meta?: Readonly<{ statuscode?: unknown; message?: unknown }>;
    data?: unknown;
  }>;
}>;

function exactText(value: unknown, pattern: RegExp, code: string): string {
  if (typeof value !== "string") {
    throw new NextcloudCollaborationAccessProviderError("rejected", code);
  }
  const normalized = value.trim();
  if (!pattern.test(normalized)) {
    throw new NextcloudCollaborationAccessProviderError("rejected", code);
  }
  return normalized;
}

function exactBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new NextcloudCollaborationAccessProviderError(
      "rejected",
      "NEXTCLOUD_ACCESS_URL_INVALID",
    );
  }
  const localHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !localHttp)
  ) {
    throw new NextcloudCollaborationAccessProviderError(
      "rejected",
      "NEXTCLOUD_ACCESS_URL_INVALID",
    );
  }
  url.pathname = url.pathname.replace(/\/*$/, "/");
  return url;
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export class NextcloudCollaborationAccessAdapter {
  private readonly baseUrl: URL;
  private readonly authorization: string;
  private readonly timeoutMs: number;
  private readonly providerInstanceId: string;
  private readonly providerOrganizationScopeId: string;

  constructor(
    config: Readonly<{
      ocsBaseUrl: string;
      username: string;
      appPassword: string;
      providerInstanceId: string;
      providerOrganizationScopeId: string;
      timeoutMs?: number;
    }>,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.baseUrl = exactBaseUrl(config.ocsBaseUrl);
    const username = exactText(
      config.username,
      PRINCIPAL,
      "NEXTCLOUD_ACCESS_CREDENTIAL_INVALID",
    );
    if (
      typeof config.appPassword !== "string" ||
      config.appPassword.trim().length < 16
    ) {
      throw new NextcloudCollaborationAccessProviderError(
        "rejected",
        "NEXTCLOUD_ACCESS_CREDENTIAL_INVALID",
      );
    }
    this.providerInstanceId = exactText(
      config.providerInstanceId,
      PROVIDER_ID,
      "NEXTCLOUD_ACCESS_PROVIDER_INSTANCE_INVALID",
    );
    this.providerOrganizationScopeId = exactText(
      config.providerOrganizationScopeId,
      PROVIDER_ID,
      "NEXTCLOUD_ACCESS_PROVIDER_SCOPE_INVALID",
    );
    this.authorization =
      "Basic " +
      Buffer.from(username + ":" + config.appPassword.trim(), "utf8").toString(
        "base64",
      );
    this.timeoutMs = Math.min(Math.max(config.timeoutMs ?? 8_000, 250), 30_000);
  }

  private validateScope(scope: ExactProviderScope): void {
    if (
      scope.providerInstanceId !== this.providerInstanceId ||
      scope.providerOrganizationScopeId !==
        this.providerOrganizationScopeId
    ) {
      throw new NextcloudCollaborationAccessProviderError(
        "rejected",
        "NEXTCLOUD_ACCESS_PROVIDER_SCOPE_MISMATCH",
      );
    }
  }

  private async request(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: URLSearchParams,
  ): Promise<Readonly<{ envelope: OcsEnvelope; responseSha256: string }>> {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("format", "json");
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        cache: "no-store",
        redirect: "manual",
        headers: {
          accept: "application/json",
          authorization: this.authorization,
          "OCS-APIRequest": "true",
          ...(body
            ? { "content-type": "application/x-www-form-urlencoded" }
            : {}),
        },
        body: body?.toString(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new NextcloudCollaborationAccessProviderError(
        "unknown",
        "NEXTCLOUD_ACCESS_OUTCOME_UNKNOWN",
      );
    }
    if (response.status !== 200) {
      throw new NextcloudCollaborationAccessProviderError(
        response.status >= 500 ? "unknown" : "rejected",
        "NEXTCLOUD_ACCESS_HTTP_" + response.status,
      );
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 2 || bytes.byteLength > MAX_RESPONSE_BYTES) {
      throw new NextcloudCollaborationAccessProviderError(
        "unknown",
        "NEXTCLOUD_ACCESS_RESPONSE_BOUND_INVALID",
      );
    }
    let envelope: OcsEnvelope;
    try {
      envelope = JSON.parse(new TextDecoder().decode(bytes)) as OcsEnvelope;
    } catch {
      throw new NextcloudCollaborationAccessProviderError(
        "unknown",
        "NEXTCLOUD_ACCESS_RESPONSE_INVALID",
      );
    }
    if (envelope.ocs?.meta?.statuscode !== 100) {
      const providerCode = envelope.ocs?.meta?.statuscode;
      throw new NextcloudCollaborationAccessProviderError(
        "unknown",
        "NEXTCLOUD_ACCESS_OCS_" +
          (Number.isSafeInteger(providerCode) ? String(providerCode) : "INVALID"),
      );
    }
    return Object.freeze({ envelope, responseSha256: sha256(bytes) });
  }

  private acknowledgement(
    input: Readonly<{
      commandId: string;
      scope: ExactProviderScope;
      operation: NextcloudAccessAcknowledgement["operation"];
      requestIdentity: readonly string[];
      responseSha256: string;
    }>,
  ): NextcloudAccessAcknowledgement {
    return Object.freeze({
      commandId: input.commandId,
      providerInstanceId: this.providerInstanceId,
      providerOrganizationScopeId: this.providerOrganizationScopeId,
      operation: input.operation,
      providerStatusCode: 100,
      requestSha256: sha256(JSON.stringify(input.requestIdentity)),
      responseSha256: input.responseSha256,
      state: "ACKNOWLEDGED_PENDING_RECONCILIATION",
      mutatesCraysAuthority: false,
    });
  }

  async createGroup(input: Readonly<{
    commandId: string;
    groupKey: string;
    scope: ExactProviderScope;
  }>): Promise<NextcloudAccessAcknowledgement> {
    this.validateScope(input.scope);
    const commandId = exactText(
      input.commandId,
      COMMAND_ID,
      "NEXTCLOUD_ACCESS_COMMAND_ID_INVALID",
    );
    const groupKey = exactText(
      input.groupKey,
      GROUP_KEY,
      "NEXTCLOUD_ACCESS_GROUP_KEY_INVALID",
    );
    const body = new URLSearchParams({ groupid: groupKey });
    const result = await this.request("POST", "ocs/v1.php/cloud/groups", body);
    return this.acknowledgement({
      commandId,
      scope: input.scope,
      operation: "CREATE_GROUP",
      requestIdentity: ["CREATE_GROUP", groupKey],
      responseSha256: result.responseSha256,
    });
  }

  async addUserToGroup(input: Readonly<{
    commandId: string;
    groupKey: string;
    principalRef: string;
    scope: ExactProviderScope;
  }>): Promise<NextcloudAccessAcknowledgement> {
    this.validateScope(input.scope);
    const commandId = exactText(
      input.commandId,
      COMMAND_ID,
      "NEXTCLOUD_ACCESS_COMMAND_ID_INVALID",
    );
    const groupKey = exactText(
      input.groupKey,
      GROUP_KEY,
      "NEXTCLOUD_ACCESS_GROUP_KEY_INVALID",
    );
    const principalRef = exactText(
      input.principalRef,
      PRINCIPAL,
      "NEXTCLOUD_ACCESS_PRINCIPAL_INVALID",
    );
    const body = new URLSearchParams({ groupid: groupKey });
    const result = await this.request(
      "POST",
      "ocs/v1.php/cloud/users/" + encodeSegment(principalRef) + "/groups",
      body,
    );
    return this.acknowledgement({
      commandId,
      scope: input.scope,
      operation: "ADD_MEMBERSHIP",
      requestIdentity: ["ADD_MEMBERSHIP", groupKey, principalRef],
      responseSha256: result.responseSha256,
    });
  }

  async removeUserFromGroup(input: Readonly<{
    commandId: string;
    groupKey: string;
    principalRef: string;
    scope: ExactProviderScope;
  }>): Promise<NextcloudAccessAcknowledgement> {
    this.validateScope(input.scope);
    const commandId = exactText(
      input.commandId,
      COMMAND_ID,
      "NEXTCLOUD_ACCESS_COMMAND_ID_INVALID",
    );
    const groupKey = exactText(
      input.groupKey,
      GROUP_KEY,
      "NEXTCLOUD_ACCESS_GROUP_KEY_INVALID",
    );
    const principalRef = exactText(
      input.principalRef,
      PRINCIPAL,
      "NEXTCLOUD_ACCESS_PRINCIPAL_INVALID",
    );
    const path =
      "ocs/v1.php/cloud/users/" +
      encodeSegment(principalRef) +
      "/groups?groupid=" +
      encodeSegment(groupKey);
    const result = await this.request("DELETE", path);
    return this.acknowledgement({
      commandId,
      scope: input.scope,
      operation: "REMOVE_MEMBERSHIP",
      requestIdentity: ["REMOVE_MEMBERSHIP", groupKey, principalRef],
      responseSha256: result.responseSha256,
    });
  }

  async readGroupUsers(input: Readonly<{
    groupKey: string;
    scope: ExactProviderScope;
  }>): Promise<NextcloudGroupObservation> {
    this.validateScope(input.scope);
    const groupKey = exactText(
      input.groupKey,
      GROUP_KEY,
      "NEXTCLOUD_ACCESS_GROUP_KEY_INVALID",
    );
    const result = await this.request(
      "GET",
      "ocs/v1.php/cloud/groups/" + encodeSegment(groupKey),
    );
    const data = result.envelope.ocs?.data;
    const users =
      data && typeof data === "object" && Array.isArray((data as { users?: unknown }).users)
        ? (data as { users: unknown[] }).users
        : null;
    if (
      users === null ||
      users.length > 10_000 ||
      users.some((value) => typeof value !== "string" || !PRINCIPAL.test(value))
    ) {
      throw new NextcloudCollaborationAccessProviderError(
        "unknown",
        "NEXTCLOUD_ACCESS_GROUP_OBSERVATION_INVALID",
      );
    }
    const principalRefs = Object.freeze(
      [...new Set(users as string[])].sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    );
    return Object.freeze({
      providerInstanceId: this.providerInstanceId,
      providerOrganizationScopeId: this.providerOrganizationScopeId,
      groupKey,
      principalRefs,
      responseSha256: result.responseSha256,
      observedState: "PROVIDER_OBSERVED_PENDING_RECONCILIATION",
      mutatesCraysAuthority: false,
    });
  }
}
