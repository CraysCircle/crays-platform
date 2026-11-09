import { createHash, randomUUID } from "node:crypto";

export type HotelPmsWorkerPool = {
  connect(): Promise<{
    query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<{ rows: Row[] }>;
    release(): void;
  }>;
};

export type QueueHotelPmsTransmissionInput = {
  tenantId: string;
  holdId: string;
  paymentReceiptId: string;
  providerBindingId: string;
  providerBindingVersion: number;
  idempotencyKey: string;
  payloadStorageReference: string;
  payloadSha256: string;
};

export type HotelPmsTransmissionCommand = {
  commandId: string;
  holdId: string;
  status: "queued" | "leased";
  attemptCount: number;
  leaseToken: string | null;
  leaseUntil: string | null;
  replayed: boolean;
};

type CommandRow = {
  command_id: string;
  hold_id: string;
  command_status: "queued" | "leased";
  attempt_count: string | number;
  lease_token: string | null;
  lease_until: string | Date | null;
  command_sha256: string;
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") { const object = value as Record<string, unknown>; return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`; }
  return JSON.stringify(value);
}
const sha256 = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");

function map(row: CommandRow, replayed: boolean): HotelPmsTransmissionCommand {
  return { commandId: row.command_id, holdId: row.hold_id, status: row.command_status, attemptCount: Number(row.attempt_count), leaseToken: row.lease_token, leaseUntil: row.lease_until ? new Date(row.lease_until).toISOString() : null, replayed };
}

export async function queueHotelPmsTransmission(
  pool: HotelPmsWorkerPool,
  input: QueueHotelPmsTransmissionInput,
): Promise<HotelPmsTransmissionCommand> {
  if (!Number.isInteger(input.providerBindingVersion) || input.providerBindingVersion < 1) throw new Error("providerBindingVersion must be positive");
  if (!/^vault:\/\/[A-Za-z0-9/_.:-]+$/.test(input.payloadStorageReference)) throw new Error("encrypted vault payload reference is required");
  if (!/^[0-9a-f]{64}$/.test(input.payloadSha256)) throw new Error("payloadSha256 must be lowercase SHA-256");
  const commandSha256 = sha256(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); await client.query("SELECT set_config('app.tenant_id', $1, true)", [input.tenantId]);
    const replay = await client.query<CommandRow>(
      `SELECT command_id, hold_id, command_status, attempt_count, lease_token, lease_until, command_sha256
         FROM crays_core.clubs_hotel_pms_transmission_commands
        WHERE tenant_id=$1 AND idempotency_key=$2 FOR UPDATE`, [input.tenantId, input.idempotencyKey]);
    if (replay.rows[0]) {
      if (replay.rows[0].command_sha256 !== commandSha256) throw new Error("PMS command idempotency conflict");
      await client.query("COMMIT"); return map(replay.rows[0], true);
    }
    const source = await client.query<{ hold_id: string }>(
      `SELECT h.hold_id
         FROM crays_core.clubs_hotel_booking_inventory_holds h
         JOIN crays_core.clubs_hotel_booking_stripe_payment_receipts p
           ON p.payment_receipt_id=$3 AND p.tenant_id=h.tenant_id AND p.hold_id=h.hold_id
          AND p.payment_evidence_sha256=h.payment_evidence_sha256
         JOIN crays_core.clubs_hotel_pms_provider_bindings b
           ON b.provider_binding_id=$4 AND b.binding_version=$5
          AND b.tenant_id=h.tenant_id AND b.property_id=h.property_id
          AND b.store_id=h.store_id AND b.legal_entity_id=h.legal_entity_id
          AND b.commercial_assignment_id=h.commercial_assignment_id
        WHERE h.tenant_id=$1 AND h.hold_id=$2
          AND h.hold_status='payment-confirmed-awaiting-provider'
          AND p.livemode=true AND p.signature_verified=true AND p.payment_status='paid'
          AND b.binding_status='active' AND b.persisted_record=true AND b.synthetic_source=false
          AND b.valid_from<=clock_timestamp() AND (b.valid_until IS NULL OR b.valid_until>clock_timestamp())
        FOR SHARE OF h,b`,
      [input.tenantId, input.holdId, input.paymentReceiptId, input.providerBindingId, input.providerBindingVersion]);
    if (!source.rows[0]) throw new Error("PMS command denied: paid hold or active provider binding not found");
    const commandId = randomUUID();
    const inserted = await client.query<CommandRow>(
      `INSERT INTO crays_core.clubs_hotel_pms_transmission_commands (
         command_id,tenant_id,hold_id,payment_receipt_id,provider_binding_id,
         provider_binding_version,idempotency_key,command_sha256,payload_storage_reference,payload_sha256
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING command_id,hold_id,command_status,attempt_count,lease_token,lease_until,command_sha256`,
      [commandId,input.tenantId,input.holdId,input.paymentReceiptId,input.providerBindingId,input.providerBindingVersion,input.idempotencyKey,commandSha256,input.payloadStorageReference,input.payloadSha256]);
    await client.query(
      `INSERT INTO crays_core.clubs_hotel_pms_transmission_command_events (
         event_id,tenant_id,command_id,sequence_no,event_type,from_status,to_status,evidence_sha256,event_payload
       ) VALUES ($1,$2,$3,1,'queued',NULL,'queued',$4,$5::jsonb)`,
      [randomUUID(),input.tenantId,commandId,commandSha256,JSON.stringify({ holdId: input.holdId, paymentReceiptId: input.paymentReceiptId })]);
    await client.query("COMMIT"); return map(inserted.rows[0], false);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function claimNextHotelPmsTransmission(
  pool: HotelPmsWorkerPool,
  input: { tenantId: string; workerId: string; now: string; leaseSeconds: number },
): Promise<HotelPmsTransmissionCommand | null> {
  const now = new Date(input.now); if (!Number.isFinite(now.getTime())) throw new Error("worker now is invalid");
  if (!/^[A-Za-z0-9:_.-]{3,180}$/.test(input.workerId)) throw new Error("workerId is invalid");
  if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 10 || input.leaseSeconds > 300) throw new Error("leaseSeconds must be between 10 and 300");
  const leaseToken = randomUUID(); const client = await pool.connect();
  try {
    await client.query("BEGIN"); await client.query("SELECT set_config('app.tenant_id', $1, true)", [input.tenantId]);
    const claimed = await client.query<CommandRow>(
      `WITH candidate AS (
         SELECT command_id FROM crays_core.clubs_hotel_pms_transmission_commands
          WHERE tenant_id=$1 AND attempt_count<max_attempts AND next_attempt_at<=$2::timestamptz
            AND (command_status IN ('queued','retry-wait') OR (command_status='leased' AND lease_until<=$2::timestamptz))
          ORDER BY next_attempt_at,created_at,command_id FOR UPDATE SKIP LOCKED LIMIT 1
       ) UPDATE crays_core.clubs_hotel_pms_transmission_commands c
          SET command_status='leased',attempt_count=attempt_count+1,lease_token=$3,
              lease_owner=$4,lease_acquired_at=$2::timestamptz,
              lease_until=$2::timestamptz+make_interval(secs=>$5::int)
         FROM candidate WHERE c.command_id=candidate.command_id
       RETURNING c.command_id,c.hold_id,c.command_status,c.attempt_count,c.lease_token,c.lease_until,c.command_sha256`,
      [input.tenantId,now.toISOString(),leaseToken,input.workerId,input.leaseSeconds]);
    const row = claimed.rows[0];
    if (row) await client.query(
      `INSERT INTO crays_core.clubs_hotel_pms_transmission_command_events (
         event_id,tenant_id,command_id,sequence_no,event_type,from_status,to_status,evidence_sha256,event_payload
       ) SELECT $1,$2,$3,COALESCE(max(sequence_no),0)+1,'lease-acquired','queued-or-expired-lease','leased',$4,$5::jsonb
           FROM crays_core.clubs_hotel_pms_transmission_command_events WHERE tenant_id=$2 AND command_id=$3`,
      [randomUUID(),input.tenantId,row.command_id,row.command_sha256,JSON.stringify({ workerId: input.workerId, leaseToken, recoveredExpiredLease: Number(row.attempt_count)>1 })]);
    await client.query("COMMIT"); return row ? map(row,false) : null;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
