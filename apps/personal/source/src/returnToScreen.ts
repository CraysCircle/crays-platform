import type { FlowControls, FlowScreen } from './mobile/FlowStack';

export type ReturnScreen = FlowScreen & {returnIdentity?: string};
/** App navigation metadata only: never an identity, permission or execution grant. */
export function featureReturnIdentity(featureId: string, context: Record<string, string | undefined>): string {
  return JSON.stringify([featureId, Object.keys(context).filter(key => context[key] !== undefined).sort().map(key => [key, context[key]])]);
}
/** Explicit return action: reuse the nearest exact original; a deep link may have no source yet. */
export function returnToScreen(flow: Pick<FlowControls, 'stack' | 'pop' | 'push' | 'popTo'>, target: ReturnScreen): void {
  for (let index = flow.stack.length - 2; index >= 0; index -= 1) {
    const existing = flow.stack[index] as ReturnScreen;
    if (existing.id !== target.id || existing.returnIdentity !== target.returnIdentity) continue;
    if(flow.popTo){flow.popTo(index);return;}
    const distance = flow.stack.length - 1 - index;
    for (let step = 0; step < distance; step += 1) flow.pop();
    return;
  }
  flow.push(target);
}
