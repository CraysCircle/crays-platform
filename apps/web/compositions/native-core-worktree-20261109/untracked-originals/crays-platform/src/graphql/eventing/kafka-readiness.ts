export const kafkaEvidenceThreshold = {
  sustainedEventsPerSecond: 100,
  independentlyScaledConsumerGroups: 4,
  replayWindowEvents: 1_000_000,
  dispatchP95Milliseconds: 1_000,
  dispatchP95BreachDays: 7,
} as const;

export type KafkaReadinessEvidence = {
  peakObservedEventsPerSecond: number;
  independentlyScaledConsumerGroups: number;
  largestReplayWindowEvents: number;
  dispatchP95Milliseconds: number;
  dispatchP95BreachDays: number;
  requiresCrossRegionOrdering: boolean;
  requiresIndependentRegulatedIsolation: boolean;
};

export function assessKafkaReadiness(evidence: KafkaReadinessEvidence) {
  const triggers = [
    evidence.peakObservedEventsPerSecond >= kafkaEvidenceThreshold.sustainedEventsPerSecond
      ? "sustained-throughput"
      : null,
    evidence.independentlyScaledConsumerGroups >= kafkaEvidenceThreshold.independentlyScaledConsumerGroups
      ? "consumer-isolation"
      : null,
    evidence.largestReplayWindowEvents >= kafkaEvidenceThreshold.replayWindowEvents
      ? "replay-scale"
      : null,
    evidence.dispatchP95Milliseconds >= kafkaEvidenceThreshold.dispatchP95Milliseconds &&
    evidence.dispatchP95BreachDays >= kafkaEvidenceThreshold.dispatchP95BreachDays
      ? "sustained-dispatch-lag"
      : null,
    evidence.requiresCrossRegionOrdering ? "cross-region-ordering" : null,
    evidence.requiresIndependentRegulatedIsolation ? "regulated-isolation" : null,
  ].filter((trigger): trigger is string => trigger !== null);

  return {
    decision: triggers.length === 0 ? ("POSTGRES_OUTBOX" as const) : ("KAFKA_CANDIDATE" as const),
    triggers,
    threshold: kafkaEvidenceThreshold,
    owner: "Platform Operations / GraphQL Eventing",
  };
}
