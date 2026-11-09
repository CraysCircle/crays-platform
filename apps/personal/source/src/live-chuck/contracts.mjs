// Exact selected iOS/Core V220 APQs. No free GraphQL, identity, agent or model input.
const definitions={
  "NativePersonalTranscript": {
    "field": "nativePersonalTranscript",
    "hash": "e500bdeab5c77d8290e4760cb3c5857f47ef7e99040e2aa3f7e26dcfe4a5b614",
    "document": "query NativePersonalTranscript($beforeMessageId: ID) { nativePersonalTranscript(beforeMessageId: $beforeMessageId) { bindingId revision conversationId hasOlderMessages nextBeforeMessageId messages { messageId body createdAt authorKind agentId inReplyToMessageId } } }"
  },
  "NativePersonalRequests": {
    "field": "nativePersonalRequests",
    "hash": "67c9d6bc579b31af7c99b62f0549a95a1595fa034b926492c5aeb077910b46ed",
    "document": "query NativePersonalRequests($beforeMessageId: ID) { nativePersonalRequests(beforeMessageId: $beforeMessageId) { bindingId revision conversationId hasOlderRequests nextBeforeMessageId requests { messageId body createdAt receiptId acceptedAt acceptanceOutcome runtimeAdmissionState dispatchState } } }"
  },
  "NativePersonalConversation": {
    "field": "nativePersonalConversation",
    "hash": "639cead1a3a7e8b1b0403b310fd9b1b6a8289b96964c95c0a05dcf5c9c405d8e",
    "document": "query NativePersonalConversation($beforeMessageId: ID) { nativePersonalConversation(beforeMessageId: $beforeMessageId) { bindingId revision conversationId hasOlderMessages nextBeforeMessageId messages { messageId body createdAt } } }"
  },
  "BindPersonalMessenger": {
    "field": "bindPersonalMessenger",
    "hash": "c39a3f9582b21f0985930006cada23aaf43e49863446ad5071b24e9ab9b94614",
    "document": "mutation BindPersonalMessenger($expectedContactRevision: String!) { bindPersonalMessenger(expectedContactRevision: $expectedContactRevision) { bindingId revision conversationId hasOlderMessages nextBeforeMessageId messages { messageId body createdAt } } }"
  },
  "ReceiveScopedAgentMessage": {
    "field": "receiveScopedAgentMessage",
    "hash": "09aa43ef113f986f5aa329bfeee1acd4d2404358e87df9ba75cf193a2ab33981",
    "document": "mutation ReceiveScopedAgentMessage($bindingId: ID!, $expectedBindingRevision: String!, $expectedContactRevision: String!, $idempotencyKey: String!, $body: String!) { receiveScopedAgentMessage(bindingId: $bindingId, expectedBindingRevision: $expectedBindingRevision, expectedContactRevision: $expectedContactRevision, idempotencyKey: $idempotencyKey, body: $body) { receiptId messageId outcome replayed createdAt } }"
  },
  "GetAgentDeliveryReceipt": {
    "field": "agentDeliveryReceipt",
    "hash": "c273611713a6ea76773535ed953a12cbedc809eab60b811abae987f2ff33e478",
    "document": "query GetAgentDeliveryReceipt($idempotencyKey: String!) { agentDeliveryReceipt(idempotencyKey: $idempotencyKey) { receiptId messageId outcome replayed createdAt } }"
  },
  "NativePersonalTranscriptOriginals": {
    "field": "nativePersonalTranscript",
    "hash": "35c721a39f5e913fa54c3fdb3bb24759a76e75399f0ea1571e76a1d6f6df93e6",
    "document": "query NativePersonalTranscriptOriginals($beforeMessageId: ID) { nativePersonalTranscript(beforeMessageId: $beforeMessageId) { bindingId revision conversationId hasOlderMessages nextBeforeMessageId messages { messageId body createdAt hasOriginals originals { attachmentId version sha256 mimeType displayName byteLength messageReceiptId registrationReceiptId createdAt expiresAt availability } authorKind agentId inReplyToMessageId } } }"
  },
  "NativePersonalRequestsOriginals": {
    "field": "nativePersonalRequests",
    "hash": "7ea5f1366772c917d3e9a10e12eec66de281b366332ec90581ca1ef7f7c0deb4",
    "document": "query NativePersonalRequestsOriginals($beforeMessageId: ID) { nativePersonalRequests(beforeMessageId: $beforeMessageId) { bindingId revision conversationId hasOlderRequests nextBeforeMessageId requests { messageId body createdAt hasOriginals originals { attachmentId version sha256 mimeType displayName byteLength messageReceiptId registrationReceiptId createdAt expiresAt availability } receiptId acceptedAt acceptanceOutcome runtimeAdmissionState dispatchState } } }"
  },
  "NativePersonalConversationOriginals": {
    "field": "nativePersonalConversation",
    "hash": "9e1df7bf59e76bf50dc9ede29c3b44e9ba9cfc832372a8fb5738da0638fe1b67",
    "document": "query NativePersonalConversationOriginals($beforeMessageId: ID) { nativePersonalConversation(beforeMessageId: $beforeMessageId) { bindingId revision conversationId hasOlderMessages nextBeforeMessageId messages { messageId body createdAt hasOriginals originals { attachmentId version sha256 mimeType displayName byteLength messageReceiptId registrationReceiptId createdAt expiresAt availability } } } }"
  },
  "BindPersonalMessengerOriginals": {
    "field": "bindPersonalMessenger",
    "hash": "8ef7e1732cc4333b2caa1963ac636fe47b49f0a68f0cdcf77fa490a2de6374e3",
    "document": "mutation BindPersonalMessengerOriginals($expectedContactRevision: String!) { bindPersonalMessenger(expectedContactRevision: $expectedContactRevision) { bindingId revision conversationId hasOlderMessages nextBeforeMessageId messages { messageId body createdAt hasOriginals originals { attachmentId version sha256 mimeType displayName byteLength messageReceiptId registrationReceiptId createdAt expiresAt availability } } } }"
  },
  "NativePersonalTaskFlows": {
    "field": "nativePersonalTaskFlows",
    "hash": "0642251ba28fb224296d6d678e3415a5a9282f1246f23fa49bb5f4d2358c81df",
    "document": "query NativePersonalTaskFlows { nativePersonalTaskFlows { tasks { taskId version planSHA256 createdAt sourceMessageId sourceReceiptId sourceAvailable state lastEventId replayed nodeExecutionAuthorized providerDisclosureAuthorized spendingAuthorized plan { title nodes { nodeRef parents workloadRef operationRef actorRef state approvalRef budgetReservationRef receiptRef nextAttemptAt } } } hasMore completeTaskHistory } }"
  },
  "NativePersonalTaskFlowsPage": {
    "field": "nativePersonalTaskFlows",
    "hash": "fd8c504a1e7e99f0e79216f2737c93abfb18d834b18eaf88f24e75a6a49a92da",
    "document": "query NativePersonalTaskFlowsPage($beforeTaskId: ID, $beforeVersion: String) { nativePersonalTaskFlows(beforeTaskId: $beforeTaskId, beforeVersion: $beforeVersion) { tasks { taskId version planSHA256 createdAt sourceMessageId sourceReceiptId sourceAvailable state lastEventId replayed nodeExecutionAuthorized providerDisclosureAuthorized spendingAuthorized plan { title nodes { nodeRef parents workloadRef operationRef actorRef state approvalRef budgetReservationRef receiptRef nextAttemptAt } } } hasMore completeTaskHistory } }"
  },
  "NativePersonalTaskFlow": {
    "field": "nativePersonalTaskFlow",
    "hash": "81ce8070dfed62cf9a8012d4158a81f9ce6217523d47276699cc8a3202da0bfa",
    "document": "query NativePersonalTaskFlow($taskId: ID!) { nativePersonalTaskFlow(taskId: $taskId) { taskId version planSHA256 createdAt sourceMessageId sourceReceiptId sourceAvailable state lastEventId replayed nodeExecutionAuthorized providerDisclosureAuthorized spendingAuthorized plan { title nodes { nodeRef parents workloadRef operationRef actorRef state approvalRef budgetReservationRef receiptRef nextAttemptAt } } } }"
  },
  "DecideNativePersonalTaskFlow": {
    "field": "decideNativePersonalTaskFlow",
    "hash": "a7afe5c47846568b96ce64ac19f0cff51955bfa4265dfb3e8de438d58a0e5a97",
    "document": "mutation DecideNativePersonalTaskFlow($taskId: ID!, $expectedVersion: String!, $expectedPlanSHA256: String!, $expectedEventId: ID, $expectedContactRevision: String!, $idempotencyKey: String!, $decision: String!) { decideNativePersonalTaskFlow(taskId: $taskId, expectedVersion: $expectedVersion, expectedPlanSHA256: $expectedPlanSHA256, expectedEventId: $expectedEventId, expectedContactRevision: $expectedContactRevision, idempotencyKey: $idempotencyKey, decision: $decision) { eventId taskId version planSHA256 decision contactRevision createdAt replayed nodeExecutionAuthorized providerDisclosureAuthorized spendingAuthorized } }"
  },
  "NativePersonalTaskFlowDecision": {
    "field": "nativePersonalTaskFlowDecision",
    "hash": "b753adc76bb6b330f8a49185375a4e76da17993d77cf082a2c98eb7115143a04",
    "document": "query NativePersonalTaskFlowDecision($idempotencyKey: String!) { nativePersonalTaskFlowDecision(idempotencyKey: $idempotencyKey) { receipt { eventId taskId version planSHA256 decision contactRevision createdAt replayed nodeExecutionAuthorized providerDisclosureAuthorized spendingAuthorized } } }"
  },
  "NativeEmailSetup": {
    "field": "nativeIdentityStatus",
    "hash": "b4cc2f723cd30ca91f38e65ec55d7d537189ffd4d0a7ef569829a10a8401d547",
    "document": null
  }
};
export const CHUCK_OPERATIONS=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([name,value])=>[name,Object.freeze(value)])));
export const SELECTED_CORE_SOURCE="7bef72dd115067d659aa1b37142f26c2bbf3d738";
