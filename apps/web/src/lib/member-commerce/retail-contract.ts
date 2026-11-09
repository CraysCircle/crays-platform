import { z } from "zod";

export const vendureReleaseGate = {
  provider: "vendure",
  release: "3.6.3",
  license: "GPL-3.0",
  securityPatchRequired: true,
  deployment: "isolated-linux-vps-staging",
  database: "dedicated-postgresql",
  coreDatabaseAccessAllowed: false,
  source: "https://github.com/vendurehq/vendure/releases/tag/v3.6.3",
} as const;

export const retailOrderStates = [
  "AddingItems",
  "ArrangingPayment",
  "PaymentAuthorized",
  "PaymentSettled",
  "PartiallyShipped",
  "Shipped",
  "PartiallyDelivered",
  "Delivered",
  "Modifying",
  "ArrangingAdditionalPayment",
  "Cancelled",
] as const;

export const retailPaymentStates = [
  "Created",
  "Authorized",
  "Settled",
  "Declined",
  "Cancelled",
  "Error",
] as const;

export const retailFulfillmentStates = [
  "Pending",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

export const retailReturnStates = [
  "requested",
  "approved",
  "rejected",
  "in-transit",
  "received",
  "refunded",
  "closed",
] as const;

export const retailRefundStates = ["Pending", "Settled", "Failed"] as const;

export const retailOrderProjectionSchema = z.object({
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  memberId: z.string().uuid(),
  providerOrderId: z.string().trim().min(1).max(160),
  code: z.string().trim().min(1).max(80),
  state: z.enum(retailOrderStates),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  subTotal: z.string().regex(/^\d+(?:\.\d{2})$/),
  shipping: z.string().regex(/^\d+(?:\.\d{2})$/),
  taxTotal: z.string().regex(/^\d+(?:\.\d{2})$/),
  grandTotal: z.string().regex(/^\d+(?:\.\d{2})$/),
  stripeCustomerId: z.string().regex(/^cus_/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const retailPaymentProjectionSchema = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().uuid(),
  providerPaymentId: z.string().trim().min(1).max(160),
  stripePaymentIntentId: z.string().regex(/^pi_/),
  state: z.enum(retailPaymentStates),
  amount: z.string().regex(/^\d+(?:\.\d{2})$/),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  idempotencyKey: z.string().trim().min(8).max(200),
  updatedAt: z.string().datetime(),
});

export const fulfillmentProjectionSchema = z.object({
  fulfillmentId: z.string().uuid(),
  orderId: z.string().uuid(),
  providerFulfillmentId: z.string().trim().min(1).max(160),
  state: z.enum(retailFulfillmentStates),
  trackingCode: z.string().trim().max(160).nullable(),
  carrierCode: z.string().trim().max(80).nullable(),
  shippedAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
});

export const returnRequestSchema = z.object({
  returnRequestId: z.string().uuid(),
  commandId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(200),
  tenantId: z.string().uuid(),
  memberId: z.string().uuid(),
  orderId: z.string().uuid(),
  lines: z.array(z.object({
    orderLineId: z.string().uuid(),
    quantity: z.number().int().positive(),
    reasonCode: z.string().trim().min(1).max(100),
  })).min(1).max(100),
  state: z.enum(retailReturnStates),
  requestedAt: z.string().datetime(),
});

export const retailRefundProjectionSchema = z.object({
  refundId: z.string().uuid(),
  returnRequestId: z.string().uuid().nullable(),
  paymentId: z.string().uuid(),
  providerRefundId: z.string().trim().min(1).max(160),
  stripeRefundId: z.string().regex(/^re_/),
  state: z.enum(retailRefundStates),
  amount: z.string().regex(/^\d+(?:\.\d{2})$/),
  reasonCode: z.string().trim().min(1).max(100),
  createdAt: z.string().datetime(),
});

export const commerceErpProjectionSchema = z.object({
  projectionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  eventType: z.enum(["order-settled", "fulfillment-shipped", "return-received", "refund-settled", "order-cancelled"]),
  providerEventId: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(8).max(200),
  erpState: z.enum(["pending", "accepted", "rejected", "reconciled"]),
  occurredAt: z.string().datetime(),
});

export const retailCommerceRules = {
  oneCanonicalStripeAccount: true,
  canonicalStripeCustomerReused: true,
  membershipUsesStripeBilling: true,
  retailUsesStripePaymentIntent: true,
  orderStateMachineOwnedByVendure: true,
  memberAuthorityOwnedByVendure: false,
  erpProjectionRequired: true,
  browserCallsVendureDirectly: false,
} as const;

export const commerceProviderCommandSchema = z.discriminatedUnion("commandType", [
  z.object({
    commandType: z.literal("request-return"),
    commandId: z.string().uuid(),
    idempotencyKey: z.string().trim().min(8).max(200),
    orderCode: z.string().trim().min(1).max(80),
    lines: z.array(z.object({
      providerOrderLineId: z.string().trim().min(1).max(160),
      quantity: z.number().int().positive(),
    })).min(1),
    reasonCode: z.string().trim().min(1).max(100),
  }),
  z.object({
    commandType: z.literal("request-refund"),
    commandId: z.string().uuid(),
    idempotencyKey: z.string().trim().min(8).max(200),
    providerPaymentId: z.string().trim().min(1).max(160),
    amountMinor: z.number().int().positive(),
    reasonCode: z.string().trim().min(1).max(100),
  }),
]);

export const commerceErpEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum([
    "retail-order-settled",
    "retail-fulfillment-shipped",
    "retail-return-received",
    "retail-refund-settled",
    "retail-order-cancelled",
  ]),
  aggregateId: z.string().uuid(),
  providerEventId: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(8).max(200),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  outboxState: z.enum(["pending", "published", "acknowledged", "dead-letter"]),
  occurredAt: z.string().datetime(),
});
