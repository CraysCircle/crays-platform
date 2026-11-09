export function withWorkspaceEntryDeadline<T>(operation:(signal:AbortSignal)=>Promise<T>,options?:{signal?:AbortSignal}):Promise<T>;
