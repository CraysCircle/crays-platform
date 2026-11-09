export type ClubsRecordLifecycle =
  | "draft"
  | "review"
  | "published"
  | "suspended"
  | "archived";

export type ClubsPropertyCommandType =
  | "create_unit"
  | "edit_property"
  | "edit_unit"
  | "submit_property_review"
  | "submit_unit_review"
  | "return_property_to_draft"
  | "return_unit_to_draft"
  | "publish_property"
  | "publish_unit"
  | "suspend_property"
  | "suspend_unit"
  | "archive_property"
  | "archive_unit";

const lifecycleTarget: Partial<
  Record<ClubsPropertyCommandType, ClubsRecordLifecycle>
> = {
  submit_property_review: "review",
  submit_unit_review: "review",
  return_property_to_draft: "draft",
  return_unit_to_draft: "draft",
  publish_property: "published",
  publish_unit: "published",
  suspend_property: "suspended",
  suspend_unit: "suspended",
  archive_property: "archived",
  archive_unit: "archived",
};

const admittedTransitions = new Set([
  "draft:review",
  "draft:archived",
  "review:draft",
  "review:published",
  "review:archived",
  "published:suspended",
  "published:archived",
  "suspended:published",
  "suspended:archived",
]);

export function decideClubsLifecycleTransition(
  commandType: ClubsPropertyCommandType,
  current: ClubsRecordLifecycle,
) {
  const target = lifecycleTarget[commandType];
  if (!target) {
    return {
      allowed: commandType === "edit_property" || commandType === "edit_unit",
      target: current,
      reason:
        commandType === "create_unit"
          ? "create-command-has-no-existing-lifecycle"
          : "edit-keeps-current-lifecycle",
    } as const;
  }
  const allowed = admittedTransitions.has(`${current}:${target}`);
  return {
    allowed,
    target,
    reason: allowed ? "transition-admitted" : "transition-denied",
  } as const;
}

export function validClubsCommandIdempotencyKey(value: string) {
  return /^[A-Za-z0-9:_-]{16,200}$/.test(value);
}

export function validClubsCommandExpectedVersion(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}
