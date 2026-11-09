import "server-only";
import { constants } from "node:fs";
import { open, readFile, lstat } from "node:fs/promises";
import type { CraysRouteContext } from "./dal/server-trust";
import type { OcaEnvironmentReadScope } from "@/db/oca-environment-read-authority-service";
import { OCA_ENVIRONMENT_READ_OPERATIONS } from "@/graphql/oca-environment-documents";
import { getInternalGraphQLRateDimensions, setInternalGraphQLRateDimensions } from "@/graphql/performance/request-metadata";
import { registerPersonalAgentBaselineDeployment } from "./personal-agent-baseline-deployment";
import { readRootFile } from "../../../infra/openclaw/runtime/personal-agent-materializer/code/verify-shared-artifacts.mjs";
import { assertOriginalCoordinationMetadata, readOriginalCoordinationRegistry } from "../../../infra/openclaw/runtime/personal-agent-materializer/product-wiring/coordination-metadata.mjs";
import { createWorkbenchBaselineBootstrap } from "../../../infra/openclaw/runtime/personal-agent-materializer/product-wiring/workbench-bootstrap.mjs";

const seed = createWorkbenchBaselineBootstrap();
const referencesPath = "/opt/crays/openclaw/personal-services/crays-personal-baseline-bootstrap/BOOTSTRAP_BINDINGS.json";
const registryPath = "/srv/crays/worktrees/club-manager-main-01a0d2f9/docs/main-control/growth-foundations-20261004/LEASES.json";
const lockPaths = [
  "/srv/crays/worktrees/club-manager-main-01a0d2f9/docs/main-control/.root-coordination.lock",
  registryPath + ".lock",
  "/srv/crays/worktrees/club-manager-main-01a0d2f9/docs/main-control/growth-foundations-20261004/.root-coordination.lock",
  registryPath + ".root-coordination.lock",
];
type References = Readonly<{ deployment: Readonly<{ id: string; version: number; digest: string }>;
  configurationPath: string; qualificationLeaseId: string }>;
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const hex = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
async function loadServerReferences(): Promise<References> {
  const v = JSON.parse((await readRootFile(referencesPath, 16384)).toString("utf8"));
  if (!exact(v, ["schema", "deployment", "configurationPath", "qualificationLeaseId"]) ||
      v.schema !== "crays.personal-baseline.bootstrap-bindings.v1" || !v.deployment ||
      !exact(v.deployment, ["id", "version", "digest"]) || typeof v.deployment.id !== "string" ||
      !v.deployment.id.length || v.deployment.id.length > 200 || !Number.isSafeInteger(v.deployment.version) ||
      v.deployment.version < 1 || !hex(v.deployment.digest) || typeof v.configurationPath !== "string" ||
      !/^\/opt\/crays\/openclaw\/personal-services\/[a-zA-Z0-9_.-]+\/HOST_CONFIGURATION\.json$/.test(v.configurationPath) ||
      typeof v.qualificationLeaseId !== "string" || !/^[A-Za-z0-9._:-]{1,200}$/.test(v.qualificationLeaseId)) {
    throw Error("SERVER_BOOTSTRAP_BINDINGS_REQUIRED");
  }
  return Object.freeze({ deployment: Object.freeze(v.deployment), configurationPath: v.configurationPath,
    qualificationLeaseId: v.qualificationLeaseId });
}
/** Observe an ALREADY HELD original resource gate; never acquire a slot, write a lease,
 * spawn a controller, or accept client approval. Missing owning host composition is pending.
 * Its parent controller must retain all four original locks for the whole constructor call.
 */
async function assertExistingResourceGate(refs: References) {
  const pid = process.ppid;
  const opened = await open(registryPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  let registry;
  try {
    const s = await opened.stat();
    assertOriginalCoordinationMetadata(s, await lstat(registryPath), "registry");
    registry = await readOriginalCoordinationRegistry(opened, s);
    const after = await opened.stat();
    assertOriginalCoordinationMetadata(s, after, "registry");
    assertOriginalCoordinationMetadata(after, await lstat(registryPath), "registry");
  } finally { await opened.close(); }
  const empty = (value: unknown) => value == null || (Array.isArray(value) && value.length === 0);
  const lease = registry.heavy?.[0];
  if (!Array.isArray(registry.heavy) || registry.heavy.length !== 1 || !empty(registry.heavyLease) ||
      !empty(registry.heavyBuildLease) || !empty(registry.exclusiveHeavy) || !lease ||
      lease.leaseId !== refs.qualificationLeaseId || lease.pid !== pid || lease.state !== "active" ||
      lease.CPUs !== 1 || lease.memoryMiB !== 2048) throw Error("ORIGINAL_HELD_BOOTSTRAP_LEASE_REQUIRED");
  const ticks = (await readFile(`/proc/${pid}/stat`, "utf8")).split(") ").at(-1)!.split(" ")[19];
  if (String(lease.startTicks) !== ticks) throw Error("PARENT_CONTROLLER_IDENTITY_CHANGED");
  const kernelLocks = (await readFile("/proc/locks", "utf8")).split("\n").map(line => line.trim().split(/\s+/));
  for (const path of lockPaths) {
    const s = await lstat(path, { bigint: true });
    assertOriginalCoordinationMetadata(s);
    const major = ((s.dev >> BigInt("8")) & BigInt("0xfff")) | ((s.dev >> BigInt("32")) & ~BigInt("0xfff"));
    const minor = (s.dev & BigInt("0xff")) | ((s.dev >> BigInt("12")) & ~BigInt("0xff"));
    if (!kernelLocks.some(row => row[1] === "FLOCK" && row[2] === "ADVISORY" && row[3] === "WRITE" &&
        row[4] === String(pid) && row[5]?.split(":").map((v, i) => i < 2 ? BigInt("0x" + v) : BigInt(v))
          .every((v, i) => v === [major, minor, s.ino][i]))) throw Error("ALL_FOUR_ORIGINAL_PARENT_LOCKS_REQUIRED");
    assertOriginalCoordinationMetadata(s, await lstat(path, { bigint: true }));
  }
  const cgroup = (await readFile("/proc/self/cgroup", "utf8")).trim().split("\n").find(line => line.startsWith("0::"))?.slice(3);
  if (!cgroup || !cgroup.startsWith("/") || cgroup.includes("..") || !cgroup.endsWith("/" + lease.unit + ".service")) throw Error("OWN_BOUNDED_BOOTSTRAP_CGROUP_REQUIRED");
  const root = "/sys/fs/cgroup" + cgroup;
  const [cpu, memory, swap, tasks] = await Promise.all(["cpu.max", "memory.max", "memory.swap.max", "pids.max"].map(file => readFile(root + "/" + file, "utf8")));
  const [quota, period] = cpu.trim().split(/\s+/).map(Number);
  if (!(Number.isFinite(quota) && quota > 0 && period > 0 && quota <= period && Number(memory) > 0 &&
      Number(memory) <= 2147483648 && Number(swap) === 0 && Number(tasks) > 0 && Number(tasks) <= 256)) throw Error("BOUNDED_BOOTSTRAP_RESOURCES_REQUIRED");
}

/** Called AFTER the existing authorized read transaction commits. Cache composition only:
 * no Core business writes, DTO changes, new roles/tickets, user materialization or service action.
 * The original private unsigned-intent signer deliberately does not expose a signed Request;
 * that path remains pending rather than inventing or recovering a signature here.
 */
export async function seedPersonalBaselineFromVerifiedWorkbench(route: CraysRouteContext, originalRequest: Request,
  signedRequest: Request, authority: OcaEnvironmentReadScope) {
  const dimensions = getInternalGraphQLRateDimensions(originalRequest);
  const operation = OCA_ENVIRONMENT_READ_OPERATIONS.OcaEnvironmentReadinessWorkbench.hash;
  if (dimensions.operation.replace(/^sha256:/, "") !== operation || authority.operationSha256 !== operation ||
      Date.parse(authority.expiresAt) <= Date.now() || !signedRequest.headers.has("x-crays-work-ticket-signature")) {
    return { status: "PENDING_SIGNED_WORKBENCH_REQUEST", registered: false };
  }
  // This is the same server-bound operation already verified by the original read authority.
  if (signedRequest !== originalRequest) setInternalGraphQLRateDimensions(signedRequest, dimensions);
  return seed({ loadServerReferences, assertExistingResourceGate,
    register: (refs: References) => registerPersonalAgentBaselineDeployment({ route, request: signedRequest,
      deployment: refs.deployment, configurationPath: refs.configurationPath }, () => assertExistingResourceGate(refs)) });
}
