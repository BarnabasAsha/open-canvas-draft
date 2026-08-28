// One class per write operation. `data` is wrapped (rather than returning
// Output directly) so a command has room to report side effects (e.g. a
// domain event) later without changing every call site's shape — Query
// (query.ts) deliberately does NOT get this wrapper, since a read has no
// side effects to report, and that difference in return shape is itself
// a visible signal of which one you're looking at.
export interface CommandResult<T> {
  data: T;
}

export function ok<T>(data: T): CommandResult<T> {
  return { data };
}

export abstract class BaseCommand<Input, Output> {
  abstract execute(input: Input): Promise<CommandResult<Output>>;
}
