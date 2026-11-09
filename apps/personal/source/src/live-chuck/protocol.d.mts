export function createChuckFetchTransport(config?:{fetch?:typeof fetch;endpoint?:string;accountScope?:string}):(name:string,variables?:Record<string,unknown>,control?:{signal?:AbortSignal})=>Promise<unknown>;
export function captureTaskDecision(value:unknown):import('./task-decisions.mjs').ChuckTaskDecisionCommand;
