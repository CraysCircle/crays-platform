import { z } from "zod";

export const craysDomainEventEnvelopeSchema = z.object({
  eventId: z.uuid(),
  eventType: z.string().regex(/^[A-Z][A-Za-z0-9]+\.[A-Z][A-Za-z0-9]+\.v[1-9][0-9]*$/),
  schemaVersion: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  tenantId: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  actorId: z.string().min(1).nullable(),
  correlationId: z.string().min(1),
  causationId: z.string().min(1).nullable(),
  idempotencyKey: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CraysDomainEventEnvelope = z.infer<typeof craysDomainEventEnvelopeSchema>;

export type CraysDomainEventPublisher = {
  publish(events: readonly CraysDomainEventEnvelope[]): Promise<void>;
};

export function parseCraysDomainEventEnvelope(value: unknown) {
  return craysDomainEventEnvelopeSchema.parse(value);
}
