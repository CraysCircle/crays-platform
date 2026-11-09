export const productionReliabilityThresholds = {
  crm: {
    records: 30_000,
    companies: 2_000,
    people: 5_000,
    leads: 10_000,
    opportunities: 5_000,
    emails: 1_900,
    calendarEvents: 900,
    tasks: 2_700,
    notes: 1_000,
  },
  project: {
    rows: 700,
    activeProjects: 30,
  },
} as const;

export const productionRequiredEnvironmentNames = [
  "CRAYS_DATABASE_URL",
  "CRAYS_DATABASE_POOL_MAX",
  "CRAYS_DATABASE_SSL",
  "CRAYS_DATABASE_SSL_REJECT_UNAUTHORIZED",
  "CRAYS_DATABASE_IDLE_TIMEOUT_MS",
  "CRAYS_DATABASE_CONNECTION_TIMEOUT_MS",
] as const;

export function thresholdStatus(value: number | null | undefined, minimum: number) {
  const observed = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return {
    observed,
    minimum,
    ready: observed >= minimum,
  };
}
