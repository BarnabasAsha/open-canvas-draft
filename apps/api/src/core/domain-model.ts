import { Entity } from "./entity";
import { DomainError } from "./errors";

// A DomainModel is an Entity that also enforces its own invariants — a
// mutation method (e.g. ProjectModel.rename) always returns a NEW
// instance (props are never mutated in place, matching the immutable
// pattern used throughout this whole codebase), and assertState is the
// one place every invariant check funnels through, so a violation always
// throws the same error type with a clear message instead of each method
// inventing its own failure shape.
export abstract class DomainModel<Props> extends Entity<Props> {
  protected assertState(condition: boolean, message: string): void {
    if (!condition) {
      throw new DomainError(message);
    }
  }
}
