function safeInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function localizedText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = localizedText(entry?.value ?? entry);
      if (text) return text;
    }
    return "";
  }
  if (value && typeof value === "object") {
    if ("value" in value) return localizedText(value.value);
    for (const entry of Object.values(value)) {
      const text = localizedText(entry);
      if (text) return text;
    }
  }
  return "";
}

function plainText(value) {
  return localizedText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function projectProviderPropertyServices({
  externalKey,
  importReceipt,
  serviceRows = [],
}) {
  const propertyReceipt = importReceipt?.properties?.[externalKey];
  if (!propertyReceipt) return null;
  const serviceReceipts = propertyReceipt.services ?? {};
  if (
    !serviceReceipts ||
    typeof serviceReceipts !== "object" ||
    Array.isArray(serviceReceipts)
  ) throw new Error("qlo_service_receipt_invalid");

  const entries = Object.entries(serviceReceipts);
  if (entries.length === 0) {
    return {
      schema: "crays.qlo.property-service-catalog.v1",
      version: "1.0.0",
      status: "service_catalog_import_pending",
      authority: "qlo",
      externalKey,
      propertyId: String(propertyReceipt.propertyId ?? ""),
      serviceCount: 0,
      services: [],
    };
  }

  const serviceById = new Map(
    serviceRows.map((row) => [safeInteger(row?.id), row]),
  );
  const services = entries.map(([externalServiceKey, serviceReceipt]) => {
    const providerService = serviceById.get(
      safeInteger(serviceReceipt?.qloServiceId),
    );
    if (!providerService) throw new Error("qlo_receipt_service_missing");
    return {
      externalServiceKey,
      name: plainText(providerService.name),
      description: plainText(providerService.description),
      shortDescription: plainText(providerService.description_short),
      active: Boolean(safeInteger(providerService.active)),
      discoverable: Boolean(safeInteger(providerService.show_at_front)),
      availableForOrder: Boolean(
        safeInteger(providerService.available_for_order),
      ),
      bookable: false,
      rate: null,
      rateStatus: "rate_setup_pending",
      paymentStatus: "payment_setup_pending",
    };
  });

  return {
    schema: "crays.qlo.property-service-catalog.v1",
    version: "1.0.0",
    status: "ready_non_bookable",
    authority: "qlo",
    externalKey,
    propertyId: String(propertyReceipt.propertyId ?? ""),
    serviceCount: services.length,
    services: services.sort((left, right) => left.name.localeCompare(right.name)),
  };
}
