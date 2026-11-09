import {createHash} from "node:crypto";

const HASH=/^[a-f0-9]{64}$/;
const nonempty=(value:string)=>value.trim().length>0;
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");

export type VendureOrderReconciliationOutcome=
  "PROVEN_DELIVERED"|"PROVEN_NOT_DELIVERED"|"STILL_UNKNOWN";

export type VendureOrderReconciliationCommandInput=Readonly<{
  tenantId:string;
  reconciliationCommandId:string;
  outboxEventId:string;
  orderSnapshotId:string;
  observedAttemptCount:number;
  snapshotSha256:string;
  payloadSha256:string;
  idempotencyKey:string;
  createdAt:string;
}>;

export type FrozenVendureOrderReconciliationCommand=
  VendureOrderReconciliationCommandInput&Readonly<{commandSha256:string}>;

export type VendureOrderStatusObservation=Readonly<{
  reconciliationCommandId:string;
  outboxEventId:string;
  outcome:VendureOrderReconciliationOutcome;
  observedProviderState:string;
  providerOrderId:string|null;
  observedAt:string;
  observationPayloadSha256:string;
}>;

export type VendureOrderReconciliationResolution=Readonly<{
  resolutionReceiptId:string;
  tenantId:string;
  reconciliationCommandId:string;
  outboxEventId:string;
  orderSnapshotId:string;
  observedAttemptCount:number;
  commandSha256:string;
  observationOutcome:VendureOrderReconciliationOutcome;
  observedProviderState:string;
  providerOrderId:string|null;
  observationPayloadSha256:string;
  targetDeliveryState:"DELIVERED"|"FAILED_RETRYABLE"|"UNKNOWN_RECONCILIATION_REQUIRED";
  resolutionSha256:string;
  observedAt:string;
}>;

export type VendureOrderStatusTransport=
  (command:FrozenVendureOrderReconciliationCommand)=>Promise<VendureOrderStatusObservation>;

export function freezeVendureOrderReconciliationCommand(
  input:VendureOrderReconciliationCommandInput,
):FrozenVendureOrderReconciliationCommand{
  const command=Object.freeze({...input});
  if([
    command.tenantId,command.reconciliationCommandId,command.outboxEventId,
    command.orderSnapshotId,command.idempotencyKey,
  ].some((value)=>!nonempty(value))
    || !Number.isInteger(command.observedAttemptCount)
    || command.observedAttemptCount<1
    || !HASH.test(command.snapshotSha256)
    || !HASH.test(command.payloadSha256)
    || !Number.isFinite(Date.parse(command.createdAt)))
    throw new Error("VENDURE_ORDER_RECONCILIATION_COMMAND_INVALID");
  return Object.freeze({...command,commandSha256:digest(command)});
}

export function createDeterministicVendureOrderStatusTransport(config:Readonly<{
  outcome:VendureOrderReconciliationOutcome;
  observedProviderState:string;
  providerOrderId?:string|null;
  observedAt:string;
}>):VendureOrderStatusTransport{
  const providerOrderId=config.providerOrderId??null;
  if(!nonempty(config.observedProviderState)
    || !Number.isFinite(Date.parse(config.observedAt))
    || (config.outcome==="PROVEN_DELIVERED"
      ? providerOrderId===null||!nonempty(providerOrderId)
      : providerOrderId!==null))
    throw new Error("VENDURE_ORDER_STATUS_TRANSPORT_CONFIG_INVALID");
  return async(command)=>{
    const observationPayload=Object.freeze({
      reconciliationCommandId:command.reconciliationCommandId,
      outboxEventId:command.outboxEventId,
      commandSha256:command.commandSha256,
      outcome:config.outcome,
      observedProviderState:config.observedProviderState,
      providerOrderId,
      observedAt:config.observedAt,
    });
    return Object.freeze({
      reconciliationCommandId:command.reconciliationCommandId,
      outboxEventId:command.outboxEventId,
      outcome:config.outcome,
      observedProviderState:config.observedProviderState,
      providerOrderId,
      observedAt:config.observedAt,
      observationPayloadSha256:digest(observationPayload),
    });
  };
}

export async function resolveVendureOrderReconciliation(
  command:FrozenVendureOrderReconciliationCommand,
  transport:VendureOrderStatusTransport,
):Promise<VendureOrderReconciliationResolution>{
  const {commandSha256,...input}=command;
  const frozen=freezeVendureOrderReconciliationCommand(input);
  if(frozen.commandSha256!==commandSha256)
    throw new Error("VENDURE_ORDER_RECONCILIATION_COMMAND_DIGEST_MISMATCH");
  const observation=await transport(frozen);
  if(observation.reconciliationCommandId!==frozen.reconciliationCommandId
    || observation.outboxEventId!==frozen.outboxEventId
    || !nonempty(observation.observedProviderState)
    || !HASH.test(observation.observationPayloadSha256)
    || !Number.isFinite(Date.parse(observation.observedAt))
    || (observation.outcome==="PROVEN_DELIVERED"
      ? observation.providerOrderId===null||!nonempty(observation.providerOrderId)
      : observation.providerOrderId!==null))
    throw new Error("VENDURE_ORDER_RECONCILIATION_OBSERVATION_INVALID");
  const targetDeliveryState=observation.outcome==="PROVEN_DELIVERED"
    ?"DELIVERED"
    :observation.outcome==="PROVEN_NOT_DELIVERED"
      ?"FAILED_RETRYABLE"
      :"UNKNOWN_RECONCILIATION_REQUIRED";
  const core=Object.freeze({
    resolutionReceiptId:`${frozen.reconciliationCommandId}:resolution`,
    tenantId:frozen.tenantId,
    reconciliationCommandId:frozen.reconciliationCommandId,
    outboxEventId:frozen.outboxEventId,
    orderSnapshotId:frozen.orderSnapshotId,
    observedAttemptCount:frozen.observedAttemptCount,
    commandSha256:frozen.commandSha256,
    observationOutcome:observation.outcome,
    observedProviderState:observation.observedProviderState,
    providerOrderId:observation.providerOrderId,
    observationPayloadSha256:observation.observationPayloadSha256,
    targetDeliveryState,
    observedAt:observation.observedAt,
  });
  return Object.freeze({...core,resolutionSha256:digest(core)});
}

export function verifyVendureOrderReconciliationResolution(
  resolution:VendureOrderReconciliationResolution,
):VendureOrderReconciliationResolution{
  if([
    resolution.resolutionReceiptId,resolution.tenantId,resolution.reconciliationCommandId,
    resolution.outboxEventId,resolution.orderSnapshotId,resolution.observedProviderState,
  ].some((value)=>!nonempty(value))
    || !Number.isInteger(resolution.observedAttemptCount)
    || resolution.observedAttemptCount<1
    || !HASH.test(resolution.commandSha256)
    || !HASH.test(resolution.observationPayloadSha256)
    || !HASH.test(resolution.resolutionSha256)
    || !Number.isFinite(Date.parse(resolution.observedAt))
    || (resolution.observationOutcome==="PROVEN_DELIVERED"
      ? resolution.providerOrderId===null
        || !nonempty(resolution.providerOrderId)
        || resolution.targetDeliveryState!=="DELIVERED"
      : resolution.providerOrderId!==null
        || resolution.targetDeliveryState!==
          (resolution.observationOutcome==="PROVEN_NOT_DELIVERED"
            ?"FAILED_RETRYABLE"
            :"UNKNOWN_RECONCILIATION_REQUIRED")))
    throw new Error("VENDURE_ORDER_RECONCILIATION_RESOLUTION_INVALID");
  const expected=Object.freeze({
    resolutionReceiptId:resolution.resolutionReceiptId,
    tenantId:resolution.tenantId,
    reconciliationCommandId:resolution.reconciliationCommandId,
    outboxEventId:resolution.outboxEventId,
    orderSnapshotId:resolution.orderSnapshotId,
    observedAttemptCount:resolution.observedAttemptCount,
    commandSha256:resolution.commandSha256,
    observationOutcome:resolution.observationOutcome,
    observedProviderState:resolution.observedProviderState,
    providerOrderId:resolution.providerOrderId,
    observationPayloadSha256:resolution.observationPayloadSha256,
    targetDeliveryState:resolution.targetDeliveryState,
    observedAt:resolution.observedAt,
  });
  if(digest(expected)!==resolution.resolutionSha256)
    throw new Error("VENDURE_ORDER_RECONCILIATION_RESOLUTION_DIGEST_MISMATCH");
  return Object.freeze({...resolution});
}
