// Kept deliberately small: every "exists but isn't yours" case collapses
// into NotFoundError (see ProjectModel.assertOwnedBy) rather than a
// separate ForbiddenError, since there's no case in this codebase yet
// where "authenticated but categorically disallowed" differs from "not
// found" — returning 403 instead of 404 would let a caller enumerate
// which resource ids exist even though they can never touch them.

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
