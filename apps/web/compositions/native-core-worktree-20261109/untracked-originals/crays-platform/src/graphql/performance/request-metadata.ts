const rateDimensions = new WeakMap<Request, { operation: string; target: string }>();

export function setInternalGraphQLRateDimensions(request: Request, value: { operation: string; target: string }) {
  rateDimensions.set(request, value);
}

export function getInternalGraphQLRateDimensions(request: Request) {
  return rateDimensions.get(request) ?? { operation: "arbitrary", target: "collection" };
}
