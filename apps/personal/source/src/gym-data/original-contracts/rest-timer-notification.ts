export type RestTimerBrowserPermission = "unsupported" | "default" | "denied" | "granted";

export function effectiveRestTimerNotificationRequest(
  profileEnabled: boolean,
  clientRequested: boolean,
) {
  return profileEnabled && clientRequested;
}

export function shouldDeliverRestTimerBrowserAlert(input: {
  notificationRequested: boolean;
  permission: RestTimerBrowserPermission;
  state: string;
  remainingSeconds: number;
  alreadyDelivered: boolean;
}) {
  return input.notificationRequested
    && input.permission === "granted"
    && input.state === "RUNNING"
    && input.remainingSeconds <= 0
    && !input.alreadyDelivered;
}
