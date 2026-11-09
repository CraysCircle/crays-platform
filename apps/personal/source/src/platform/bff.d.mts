export const CRAYS_BFF_READS: Readonly<{moduleManifest: '/platform/modules'; workAccess: '/api/crays/platform/work-access'}>;
export const CRAYS_DATA_CHANNELS: Readonly<Record<'chuck' | 'club' | 'messaging' | 'personalProjection' | 'gym', Readonly<{endpoint: string | null; protocol: string; implementation: string | null}>>>;
export function readCraysBff(key: keyof typeof CRAYS_BFF_READS, options?: {signal?: AbortSignal; fetch?: typeof globalThis.fetch}): Promise<Response>;
