export class ClubsIdempotencyReplayConflictError extends Error {
  constructor() {
    super("Clubs command idempotency replay conflict");
    this.name = "ClubsIdempotencyReplayConflictError";
  }
}
