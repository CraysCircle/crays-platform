import type { SellerBoundCart } from "./seller-bound-cart-lifecycle";

type QueryResult<Row> = Readonly<{ rows: Row[] }>;
export type SellerBoundCartDb = Readonly<{ query<Row = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>> }>;
export type SellerBoundCartPool = Readonly<{ connect(): Promise<SellerBoundCartDb & Readonly<{ release(): void }>> }>;
export type SellerBoundCartCommandKind = "CREATE" | "ADD_LINE" | "ADJUST_LINE" | "REMOVE_LINE" | "EXPIRE" | "CLEAR" | "CONVERT" | "REBUILD_AFTER_SELLER_CHANGE";
export type SellerBoundCartMutation = Readonly<{
  tenantId: string; cart: SellerBoundCart; expectedVersion: number; commandReceiptId: string; commandKind: SellerBoundCartCommandKind;
  idempotencyKey: string; receiptSha256: string; outboxEventId: string; payloadSha256: string; createdAt: string;
  supersededCartId?: string; sellerChangeWarningAcknowledged?: boolean;
}>;

const sha256 = /^[a-f0-9]{64}$/;
const nonempty = (value: string) => value.trim().length > 0;

export function prepareSellerBoundCartMutation(input: SellerBoundCartMutation): SellerBoundCartMutation {
  const lines = Object.freeze(input.cart.lines.map((line) => Object.freeze({
    ...line,
    mixedTypeCompatibilityReceipts: Object.freeze(
      line.mixedTypeCompatibilityReceipts.map((decision) => Object.freeze({...decision})),
    ),
  })));
  const cart = Object.freeze({
    ...input.cart,
    seller: Object.freeze({...input.cart.seller}),
    lines,
  });
  const snapshot = Object.freeze({...input, cart});
  const { expectedVersion } = snapshot;
  const strings = [snapshot.tenantId, snapshot.commandReceiptId, snapshot.idempotencyKey, snapshot.outboxEventId, cart.cartId,
    cart.seller.storeId, cart.seller.partnerTenantId, cart.seller.operatorLegalEntityId, cart.seller.vendureSellerId,
    cart.seller.vendureChannelId];
  if (strings.some((value) => !nonempty(value)) || !sha256.test(snapshot.receiptSha256) || !sha256.test(snapshot.payloadSha256) ||
      !sha256.test(cart.seller.contextFingerprint) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 ||
      cart.version !== expectedVersion + 1 || !Number.isFinite(Date.parse(cart.expiresAt)) ||
      !Number.isFinite(Date.parse(snapshot.createdAt))) {
    throw new Error("SELLER_BOUND_CART_PERSISTENCE_INPUT_INVALID");
  }
  const clubsMapping = cart.seller.clubsMapping;
  if (clubsMapping && (cart.seller.verticalRoot !== "clubs" || !nonempty(clubsMapping.mappingId) || !Number.isSafeInteger(clubsMapping.mappingVersion) || clubsMapping.mappingVersion < 1 || !sha256.test(clubsMapping.mappingFingerprint))) throw new Error("SELLER_BOUND_CART_CLUBS_MAPPING_INVALID");
  const rebuild = snapshot.commandKind === "REBUILD_AFTER_SELLER_CHANGE";
  if (rebuild !== Boolean(snapshot.supersededCartId && snapshot.sellerChangeWarningAcknowledged) || (rebuild && cart.lines.length !== 0)) {
    throw new Error("SELLER_BOUND_CART_REBUILD_INVALID");
  }
  if (snapshot.commandKind === "CREATE" && expectedVersion !== 0) throw new Error("SELLER_BOUND_CART_CREATE_VERSION_INVALID");
  if (snapshot.commandKind !== "CREATE" && !rebuild && expectedVersion === 0) throw new Error("SELLER_BOUND_CART_EXPECTED_VERSION_INVALID");
  for (const line of cart.lines) {
    if (!nonempty(line.variantRef) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 ||
        !nonempty(line.sellableAssignmentId) ||
        !Number.isSafeInteger(line.sellableAssignmentVersion) || line.sellableAssignmentVersion < 1 ||
        !nonempty(line.sellableProductClassificationId) ||
        !Number.isSafeInteger(line.classificationVersion) || line.classificationVersion < 1 ||
        !Number.isSafeInteger(line.taxonomyVersion) || line.taxonomyVersion < 1 ||
        !nonempty(line.productType) || !nonempty(line.verticalProductClass) ||
        !nonempty(line.routingPolicyVersion) || !Array.isArray(line.mixedTypeCompatibilityReceipts) ||
        line.mixedTypeCompatibilityReceipts.some((decision) => decision.decision !== "ALLOW" ||
          !sha256.test(decision.decisionReceiptSha256))) {
      throw new Error("SELLER_BOUND_CART_LINE_INVALID");
    }
  }
  return snapshot;
}

async function transaction<T>(pool: SellerBoundCartPool, tenantId: string, work: (db: SellerBoundCartDb) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("select set_config('crays.app_role','core_service',true),set_config('crays.tenant_id',$1,true)", [tenantId]);
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally { db.release(); }
}

export async function persistSellerBoundCartMutationSnapshot(
  db: SellerBoundCartDb,
  candidate: SellerBoundCartMutation,
) {
  const mutation = prepareSellerBoundCartMutation(candidate);
    const replay = (await db.query<Readonly<{ command_receipt_id: string; cart_id: string; resulting_cart_version: number; receipt_sha256: string }>>(
      "select command_receipt_id,cart_id,resulting_cart_version,receipt_sha256 from crays_core.seller_bound_cart_command_receipts where tenant_id=$1 and idempotency_key=$2",
      [mutation.tenantId, mutation.idempotencyKey],
    )).rows[0];
    if (replay) {
      if (replay.command_receipt_id !== mutation.commandReceiptId || replay.cart_id !== mutation.cart.cartId ||
          replay.resulting_cart_version !== mutation.cart.version || replay.receipt_sha256 !== mutation.receiptSha256) {
        throw new Error("SELLER_BOUND_CART_REPLAY_CONFLICT");
      }
      return Object.freeze({ cartId: mutation.cart.cartId, version: mutation.cart.version, replayed: true as const, commandState: "PERSISTED_PENDING_PROVIDER" as const });
    }

    const c = mutation.cart, s = c.seller, rebuild = mutation.commandKind === "REBUILD_AFTER_SELLER_CHANGE";
    if (mutation.expectedVersion === 0) {
      const inserted = await db.query(
        `insert into crays_core.seller_bound_carts(cart_id,tenant_id,cart_version,customer_relationship_id,vertical_root,store_id,partner_tenant_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id,context_fingerprint,clubs_seller_channel_mapping_id,clubs_seller_channel_mapping_version,clubs_seller_channel_mapping_fingerprint,cart_state,expires_at,supersedes_cart_id,seller_change_warning_acknowledged,created_at,updated_at)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)returning cart_id`,
        [c.cartId,mutation.tenantId,c.version,c.customerRelationshipId,s.verticalRoot,s.storeId,s.partnerTenantId,s.operatorLegalEntityId,s.vendureSellerId,s.vendureChannelId,s.contextFingerprint,s.clubsMapping?.mappingId??null,s.clubsMapping?.mappingVersion??null,s.clubsMapping?.mappingFingerprint??null,c.state,c.expiresAt,mutation.supersededCartId??null,rebuild,mutation.createdAt],
      );
      if (!inserted.rows[0]) throw new Error("SELLER_BOUND_CART_CREATE_CONFLICT");
    } else {
      const updated = await db.query(
        `update crays_core.seller_bound_carts set cart_version=$1,cart_state=$2,expires_at=$3,updated_at=$4 where cart_id=$5 and tenant_id=$6 and cart_version=$7 and vertical_root=$8 and store_id=$9 and partner_tenant_id=$10 and operator_legal_entity_id=$11 and vendure_seller_id=$12 and vendure_channel_id=$13 and context_fingerprint=$14 and clubs_seller_channel_mapping_id is not distinct from $15 and clubs_seller_channel_mapping_version is not distinct from $16 and clubs_seller_channel_mapping_fingerprint is not distinct from $17 returning cart_id`,
        [c.version,c.state,c.expiresAt,mutation.createdAt,c.cartId,mutation.tenantId,mutation.expectedVersion,s.verticalRoot,s.storeId,s.partnerTenantId,s.operatorLegalEntityId,s.vendureSellerId,s.vendureChannelId,s.contextFingerprint,s.clubsMapping?.mappingId??null,s.clubsMapping?.mappingVersion??null,s.clubsMapping?.mappingFingerprint??null],
      );
      if (!updated.rows[0]) throw new Error("SELLER_BOUND_CART_VERSION_OR_SCOPE_CONFLICT");
      await db.query("delete from crays_core.seller_bound_cart_lines where tenant_id=$1 and cart_id=$2", [mutation.tenantId, c.cartId]);
    }
    for (const line of c.lines) {
      await db.query(
        "insert into crays_core.seller_bound_cart_lines(cart_line_id,cart_id,tenant_id,variant_ref,quantity,sellable_assignment_id,sellable_assignment_version,sellable_product_classification_id,classification_version,taxonomy_version,product_type,vertical_product_class,routing_policy_version,mixed_type_compatibility_receipts,created_at,updated_at)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$15)",
        [`${c.cartId}:${line.variantRef}`,c.cartId,mutation.tenantId,line.variantRef,line.quantity,
          line.sellableAssignmentId,line.sellableAssignmentVersion,
          line.sellableProductClassificationId,line.classificationVersion,
          line.taxonomyVersion,line.productType,line.verticalProductClass,
          line.routingPolicyVersion,JSON.stringify(line.mixedTypeCompatibilityReceipts),
          mutation.createdAt],
      );
    }
    await db.query(
      `insert into crays_core.seller_bound_cart_command_receipts(command_receipt_id,tenant_id,cart_id,command_kind,idempotency_key,expected_cart_version,resulting_cart_version,customer_relationship_id,vertical_root,store_id,partner_tenant_id,operator_legal_entity_id,vendure_seller_id,vendure_channel_id,context_fingerprint,superseded_cart_id,seller_change_warning_acknowledged,receipt_sha256,command_state,created_at)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'PERSISTED_PENDING_PROVIDER',$19)`,
      [mutation.commandReceiptId,mutation.tenantId,c.cartId,mutation.commandKind,mutation.idempotencyKey,mutation.expectedVersion,c.version,c.customerRelationshipId,s.verticalRoot,s.storeId,s.partnerTenantId,s.operatorLegalEntityId,s.vendureSellerId,s.vendureChannelId,s.contextFingerprint,mutation.supersededCartId??null,rebuild,mutation.receiptSha256,mutation.createdAt],
    );
    await db.query(
      `insert into crays_core.seller_bound_cart_outbox(outbox_event_id,tenant_id,cart_id,command_receipt_id,partner_tenant_id,operator_legal_entity_id,store_id,vendure_seller_id,vendure_channel_id,context_fingerprint,aggregate_version,event_type,delivery_state,payload_sha256,created_at)values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'SELLER_BOUND_CART_MUTATED','PENDING',$12,$13)`,
      [mutation.outboxEventId,mutation.tenantId,c.cartId,mutation.commandReceiptId,s.partnerTenantId,s.operatorLegalEntityId,s.storeId,s.vendureSellerId,s.vendureChannelId,s.contextFingerprint,c.version,mutation.payloadSha256,mutation.createdAt],
    );
    return Object.freeze({ cartId: c.cartId, version: c.version, replayed: false as const, commandState: "PERSISTED_PENDING_PROVIDER" as const });
}

export function persistSellerBoundCartMutation(pool: SellerBoundCartPool, candidate: SellerBoundCartMutation) {
  const mutation = prepareSellerBoundCartMutation(candidate);
  return transaction(pool, mutation.tenantId, (db) =>
    persistSellerBoundCartMutationSnapshot(db, mutation));
}

type SellerBoundCartReadRow = Readonly<{
  cart_id: string;
  cart_version: string | number;
  customer_relationship_id: string | null;
  vertical_root: SellerBoundCart["seller"]["verticalRoot"];
  store_id: string;
  partner_tenant_id: string;
  operator_legal_entity_id: string;
  vendure_seller_id: string;
  vendure_channel_id: string;
  context_fingerprint: string;
  clubs_seller_channel_mapping_id: string | null;
  clubs_seller_channel_mapping_version: string | number | null;
  clubs_seller_channel_mapping_fingerprint: string | null;
  cart_state: SellerBoundCart["state"];
  expires_at: string | Date;
}>;

type SellerBoundCartLineReadRow = Readonly<{
  variant_ref: string;
  quantity: string | number;
  sellable_assignment_id: string;
  sellable_assignment_version: string | number;
  sellable_product_classification_id: string;
  classification_version: string | number;
  taxonomy_version: string | number;
  product_type: SellerBoundCart["lines"][number]["productType"];
  vertical_product_class: string;
  routing_policy_version: string;
  mixed_type_compatibility_receipts: SellerBoundCart["lines"][number]["mixedTypeCompatibilityReceipts"];
}>;

export type LoadActiveSellerBoundCartInput = Readonly<{
  tenantId: string;
  customerRelationshipId: string | null;
  seller: SellerBoundCart["seller"];
  now?: Date;
}>;

async function loadSellerBoundCartSnapshot(
  db: SellerBoundCartDb,
  input: LoadActiveSellerBoundCartInput,
  includeExpired: boolean,
): Promise<SellerBoundCart | null> {
  const now = input.now ?? new Date();
  if (!nonempty(input.tenantId) ||
      (input.customerRelationshipId !== null && !nonempty(input.customerRelationshipId)) ||
      !Number.isFinite(now.getTime()) ||
      !sha256.test(input.seller.contextFingerprint)) {
    throw new Error("SELLER_BOUND_CART_READ_INPUT_INVALID");
  }
    const carts = await db.query<SellerBoundCartReadRow>(
      `select cart_id,cart_version,customer_relationship_id,vertical_root,
              store_id,partner_tenant_id,operator_legal_entity_id,
              vendure_seller_id,vendure_channel_id,context_fingerprint,
              clubs_seller_channel_mapping_id,clubs_seller_channel_mapping_version,
              clubs_seller_channel_mapping_fingerprint,cart_state,expires_at
         from crays_core.seller_bound_carts
        where tenant_id=$1
          and customer_relationship_id is not distinct from $2
          and vertical_root=$3 and store_id=$4 and partner_tenant_id=$5
          and operator_legal_entity_id=$6 and vendure_seller_id=$7
          and vendure_channel_id=$8 and context_fingerprint=$9
          and clubs_seller_channel_mapping_id is not distinct from $10
          and clubs_seller_channel_mapping_version is not distinct from $11
          and clubs_seller_channel_mapping_fingerprint is not distinct from $12
          and cart_state='active'
          ${includeExpired ? "" : "and expires_at>$13::timestamptz"}
        order by updated_at desc
        limit 2
        ${includeExpired ? "for update" : ""}`,
      [input.tenantId,input.customerRelationshipId,input.seller.verticalRoot,
       input.seller.storeId,input.seller.partnerTenantId,input.seller.operatorLegalEntityId,
       input.seller.vendureSellerId,input.seller.vendureChannelId,
       input.seller.contextFingerprint,input.seller.clubsMapping?.mappingId??null,
       input.seller.clubsMapping?.mappingVersion??null,
       input.seller.clubsMapping?.mappingFingerprint??null,
       ...(includeExpired ? [] : [now.toISOString()])],
    );
    if (carts.rows.length === 0) return null;
    if (carts.rows.length !== 1) throw new Error("SELLER_BOUND_CART_READ_AMBIGUOUS");
    const row = carts.rows[0];
    const lines = await db.query<SellerBoundCartLineReadRow>(
      `select variant_ref,quantity,sellable_assignment_id,
              sellable_assignment_version,sellable_product_classification_id,
              classification_version,taxonomy_version,product_type,
              vertical_product_class,routing_policy_version,
              mixed_type_compatibility_receipts
         from crays_core.seller_bound_cart_lines
        where tenant_id=$1 and cart_id=$2 order by cart_line_id`,
      [input.tenantId,row.cart_id],
    );
    const cart = Object.freeze({
      cartId: row.cart_id,
      version: Number(row.cart_version),
      customerRelationshipId: row.customer_relationship_id,
      seller: Object.freeze({
        verticalRoot: row.vertical_root,storeId: row.store_id,
        partnerTenantId: row.partner_tenant_id,
        operatorLegalEntityId: row.operator_legal_entity_id,
        vendureSellerId: row.vendure_seller_id,
        vendureChannelId: row.vendure_channel_id,
        contextFingerprint: row.context_fingerprint,
        ...(row.clubs_seller_channel_mapping_id && row.clubs_seller_channel_mapping_version !== null && row.clubs_seller_channel_mapping_fingerprint ? {clubsMapping:Object.freeze({mappingId:row.clubs_seller_channel_mapping_id,mappingVersion:Number(row.clubs_seller_channel_mapping_version),mappingFingerprint:row.clubs_seller_channel_mapping_fingerprint})} : {}),
      }),
      lines: Object.freeze(lines.rows.map((line) => Object.freeze({
        variantRef: line.variant_ref,quantity: Number(line.quantity),
        sellableAssignmentId: line.sellable_assignment_id,
        sellableAssignmentVersion: Number(line.sellable_assignment_version),
        sellableProductClassificationId: line.sellable_product_classification_id,
        classificationVersion: Number(line.classification_version),
        taxonomyVersion: Number(line.taxonomy_version),productType: line.product_type,
        verticalProductClass: line.vertical_product_class,
        routingPolicyVersion: line.routing_policy_version,
        mixedTypeCompatibilityReceipts: Object.freeze(
          Array.isArray(line.mixed_type_compatibility_receipts)
            ? line.mixed_type_compatibility_receipts.map((receipt) => Object.freeze({...receipt}))
            : [],
        ),
      }))),
      expiresAt: new Date(row.expires_at).toISOString(),
      state: row.cart_state,
    }) satisfies SellerBoundCart;
    if (!Number.isSafeInteger(cart.version) || cart.version < 1 ||
        cart.lines.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1 ||
          !Number.isSafeInteger(line.sellableAssignmentVersion) || line.sellableAssignmentVersion < 1 ||
          !Number.isSafeInteger(line.classificationVersion) || line.classificationVersion < 1 ||
          !Number.isSafeInteger(line.taxonomyVersion) || line.taxonomyVersion < 1)) {
      throw new Error("SELLER_BOUND_CART_READ_CORRUPT");
    }
    try {
      prepareSellerBoundCartMutation({
        tenantId: input.tenantId,
        cart: {...cart, version: cart.version + 1},
        expectedVersion: cart.version,
        commandReceiptId: "read-validation-receipt",
        commandKind: "ADD_LINE",
        idempotencyKey: "read-validation-idempotency",
        receiptSha256: "0".repeat(64),
        outboxEventId: "read-validation-outbox",
        payloadSha256: "0".repeat(64),
        createdAt: now.toISOString(),
      });
    } catch {
      throw new Error("SELLER_BOUND_CART_READ_CORRUPT");
    }
    return cart;
}

export function loadActiveSellerBoundCartSnapshot(
  db: SellerBoundCartDb,
  input: LoadActiveSellerBoundCartInput,
): Promise<SellerBoundCart | null> {
  return loadSellerBoundCartSnapshot(db, input, false);
}

export function loadCurrentSellerBoundCartSnapshot(
  db: SellerBoundCartDb,
  input: LoadActiveSellerBoundCartInput,
): Promise<SellerBoundCart | null> {
  return loadSellerBoundCartSnapshot(db, input, true);
}
export type LoadActiveSellerBoundRelationshipCartInput = Readonly<{
  tenantId: string;
  customerRelationshipId: string;
  verticalRoot: SellerBoundCart["seller"]["verticalRoot"];
  now?: Date;
}>;

export async function loadActiveSellerBoundRelationshipCartSnapshot(
  db: SellerBoundCartDb,
  input: LoadActiveSellerBoundRelationshipCartInput,
): Promise<SellerBoundCart | null> {
  const now = input.now ?? new Date();
  if (!nonempty(input.tenantId) ||
      !nonempty(input.customerRelationshipId) ||
      !Number.isFinite(now.getTime())) {
    throw new Error("SELLER_BOUND_CART_READ_INPUT_INVALID");
  }
  const carts = await db.query<SellerBoundCartReadRow>(
    `select cart_id,cart_version,customer_relationship_id,vertical_root,
            store_id,partner_tenant_id,operator_legal_entity_id,
            vendure_seller_id,vendure_channel_id,context_fingerprint,
            clubs_seller_channel_mapping_id,clubs_seller_channel_mapping_version,
            clubs_seller_channel_mapping_fingerprint,cart_state,expires_at
       from crays_core.seller_bound_carts c
      where tenant_id=$1 and customer_relationship_id=$2
        and vertical_root=$3 and cart_state='active'
        and expires_at>$4::timestamptz
        and not exists (
          select 1
            from crays_core.seller_bound_carts successor
           where successor.tenant_id=c.tenant_id
             and successor.supersedes_cart_id=c.cart_id
             and successor.cart_state='active'
        )
      order by updated_at desc
      limit 2
      for update`,
    [
      input.tenantId,
      input.customerRelationshipId,
      input.verticalRoot,
      now.toISOString(),
    ],
  );
  if (carts.rows.length === 0) return null;
  if (carts.rows.length !== 1) {
    throw new Error("SELLER_BOUND_CART_RELATIONSHIP_READ_AMBIGUOUS");
  }
  const row = carts.rows[0];
  return loadSellerBoundCartSnapshot(db, {
    tenantId: input.tenantId,
    customerRelationshipId: input.customerRelationshipId,
    seller: {
      verticalRoot: row.vertical_root,
      storeId: row.store_id,
      partnerTenantId: row.partner_tenant_id,
      operatorLegalEntityId: row.operator_legal_entity_id,
      vendureSellerId: row.vendure_seller_id,
      vendureChannelId: row.vendure_channel_id,
      contextFingerprint: row.context_fingerprint,
      ...(row.clubs_seller_channel_mapping_id && row.clubs_seller_channel_mapping_version !== null && row.clubs_seller_channel_mapping_fingerprint ? {clubsMapping:{mappingId:row.clubs_seller_channel_mapping_id,mappingVersion:Number(row.clubs_seller_channel_mapping_version),mappingFingerprint:row.clubs_seller_channel_mapping_fingerprint}} : {}),
    },
    now,
  }, false);
}


export function loadActiveSellerBoundCart(
  pool: SellerBoundCartPool,
  input: LoadActiveSellerBoundCartInput,
): Promise<SellerBoundCart | null> {
  return transaction(pool, input.tenantId, (db) =>
    loadActiveSellerBoundCartSnapshot(db, input));
}
