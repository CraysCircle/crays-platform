/** Local simulation record IDs only. Never use as credentials, signatures or production authority. */
export function localPreviewId(): string {
 return globalThis.crypto?.randomUUID?.() || `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
