// One class per read operation, applied everywhere a Command is — no
// route ever queries Drizzle directly, reads included. Returns Output
// directly (no CommandResult wrapper, see command.ts) since a read has no
// side effects to report.
export abstract class BaseQuery<Input, Output> {
  abstract execute(input: Input): Promise<Output>;
}
