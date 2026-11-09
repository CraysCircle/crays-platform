import persistedOperations from "./generated/client/persisted-documents.json";

const operationStore = persistedOperations as Record<string, string>;

export function getCraysPersistedOperation(operationId: string) {
  return operationStore[operationId] ?? operationStore[`sha256:${operationId}`] ?? null;
}

export function getCraysPersistedOperationCount() {
  return Object.keys(operationStore).length;
}
