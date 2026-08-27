// The raw, cheap-to-produce data a request carries — just the headers
// (for auth.api.getSession) and a generated id. Deliberately NOT the
// resolved session/user — that's a DB round trip, and building it here
// unconditionally would pay that cost on every single request, including
// ones that never touch auth. See container.ts's lazy `requestContext`
// registration, which only resolves it when something actually asks.
export interface ScopeInput {
  requestId: string;
  headers: Headers;
}
