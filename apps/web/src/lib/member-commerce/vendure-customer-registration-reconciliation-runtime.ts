import "server-only";

import {
  createVendureRegistrationReconciliationScheduler,
  type PersistedVendureReconciliationSchedulerRepository,
  type VendureReconciliationScheduledTickResult,
} from "./vendure-customer-registration-reconciliation-scheduler";
import {
  createVendureRegistrationReconciliationWorker,
  type PersistedVendureRegistrationWorkRepository,
} from "./vendure-customer-registration-reconciliation-worker";
import { createPersistedVendureRegistrationRuntimeRepository } from "./vendure-customer-registration-runtime-repository";
import {
  createVendureCustomerRegistrationStatusTransport,
  type VendureCustomerRegistrationStatusTransport,
  type VendureCustomerRegistrationStatusTransportConfig,
} from "./vendure-customer-registration-status-transport";

export const VENDURE_REGISTRATION_RECONCILIATION_RUNTIME_VERSION =
  "cclub-063.vendure-registration-reconciliation-runtime.v1" as const;

export type VendureRegistrationReconciliationRuntimeDependencies = Readonly<{
  workRepository: PersistedVendureRegistrationWorkRepository;
  schedulerRepository: PersistedVendureReconciliationSchedulerRepository;
  statusTransport: VendureCustomerRegistrationStatusTransport;
}>;

export type VendureRegistrationReconciliationRuntimeConfig = Readonly<{
  schedulerId: string;
  schedulerWorkerId: string;
  schedulerLeaseDurationMs: number;
  workWorkerId: string;
  workLeaseDurationMs: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  maxItemsPerTick: number;
  now?: () => Date;
}>;

export type PersistedVendureRegistrationReconciliationRuntimeConfig =
  VendureRegistrationReconciliationRuntimeConfig &
    Readonly<{
      tenantId: string;
      scheduleIntervalMs: number;
      schedulerFailureRetryMs: number;
      statusTransportConfig: VendureCustomerRegistrationStatusTransportConfig;
    }>;

export type VendureRegistrationReconciliationRuntime = Readonly<{
  runtimeVersion: typeof VENDURE_REGISTRATION_RECONCILIATION_RUNTIME_VERSION;
  runScheduledTick: () => Promise<VendureReconciliationScheduledTickResult>;
  ownsSchedulerProcess: false;
  performsProviderCreateReplay: false;
}>;

/**
 * Pure composition boundary. Construction is side-effect free: no database
 * query, timer, retained process or provider call occurs until the caller
 * invokes runScheduledTick(). The worker is status-read-only and cannot replay
 * the original Vendure customer creation command.
 */
export function createVendureRegistrationReconciliationRuntime(
  config: VendureRegistrationReconciliationRuntimeConfig,
  dependencies: VendureRegistrationReconciliationRuntimeDependencies,
): VendureRegistrationReconciliationRuntime {
  const clock = config.now ? { now: config.now } : {};
  const worker = createVendureRegistrationReconciliationWorker({
    workerId: config.workWorkerId,
    leaseDurationMs: config.workLeaseDurationMs,
    baseRetryDelayMs: config.baseRetryDelayMs,
    maxRetryDelayMs: config.maxRetryDelayMs,
    maxItemsPerTick: config.maxItemsPerTick,
    repository: dependencies.workRepository,
    statusTransport: dependencies.statusTransport,
    ...clock,
  });
  const scheduler = createVendureRegistrationReconciliationScheduler({
    schedulerId: config.schedulerId,
    workerId: config.schedulerWorkerId,
    leaseDurationMs: config.schedulerLeaseDurationMs,
    repository: dependencies.schedulerRepository,
    worker,
    ...clock,
  });

  return Object.freeze({
    runtimeVersion: VENDURE_REGISTRATION_RECONCILIATION_RUNTIME_VERSION,
    runScheduledTick: scheduler.runScheduledTick,
    ownsSchedulerProcess: false as const,
    performsProviderCreateReplay: false as const,
  });
}

/**
 * Production-shaped composition boundary. Tenant persistence and the HTTPS
 * Vendure status transport are bound once. Secrets are accepted only as
 * constructor input and are neither returned nor persisted by this module.
 */
export function createPersistedVendureRegistrationReconciliationRuntime(
  config: PersistedVendureRegistrationReconciliationRuntimeConfig,
): VendureRegistrationReconciliationRuntime {
  const repositories = createPersistedVendureRegistrationRuntimeRepository({
    tenantId: config.tenantId,
    scheduleIntervalMs: config.scheduleIntervalMs,
    schedulerFailureRetryMs: config.schedulerFailureRetryMs,
  });
  const statusTransport = createVendureCustomerRegistrationStatusTransport(
    config.statusTransportConfig,
  );

  return createVendureRegistrationReconciliationRuntime(config, {
    workRepository: repositories.workRepository,
    schedulerRepository: repositories.schedulerRepository,
    statusTransport,
  });
}
