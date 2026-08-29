import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "../db/client";
import { logger } from "./logger";
import { provisionExampleProject } from "./provision-example-project";

// Google is the only sign-in method — no emailAndPassword key at all,
// which is how Better Auth expresses "Google-only" (there's no separate
// "disable other methods" flag, you just never enable them).
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  account: {
    // The frontend and this API sit on different top-level domains in
    // production, so the OAuth flow's double-submit "state" cookie is set
    // by a cross-site fetch response — exactly what Safari/Firefox's
    // tracking protections silently refuse to persist, causing a
    // state_mismatch on callback. The state is already verified against
    // the server-side verification record (keyed by a high-entropy random
    // token), so this cookie is redundant defense-in-depth, not the only
    // check — safe to skip here.
    skipStateCookieCheck: true,
  },
  advanced: {
    // Same cross-domain situation applies to the session cookie itself:
    // the web app reads it via a cross-origin fetch (getSession), and
    // SameSite=Lax (Better Auth's default) is never sent on cross-site
    // fetch/XHR — only on top-level navigations. Without this, session
    // reads always come back empty in production even after a successful
    // login. `secure` is required alongside SameSite=None and Better Auth
    // already derives it from baseURL being https, so this only takes
    // effect in production, not local http dev.
    defaultCookieAttributes: process.env.BETTER_AUTH_URL?.startsWith("https://") ? { sameSite: "none" } : undefined,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: process.env.WEB_URL ? [process.env.WEB_URL] : [],
  databaseHooks: {
    user: {
      create: {
        // Fires exactly once, on the row INSERT — never on later
        // logins — so this is naturally a one-time "new signup" hook,
        // no dedupe needed. Failure here must never break signup itself
        // (a flaky R2 upload shouldn't stop someone from signing in), so
        // it's caught and logged rather than left to propagate.
        after: async (user) => {
          try {
            await provisionExampleProject(user.id);
          } catch (err) {
            logger.error({ err, userId: user.id }, "Failed to provision example project");
          }
        },
      },
    },
  },
  plugins: [
    // A user has no username immediately after Google sign-in — it's
    // optional by design (see the schema) and set once, later, via the
    // onboarding screen (authClient.updateUser({username})). Immutable
    // once set: this is meant as a one-time step, not a changeable
    // setting yet.
    username({ immutableUsername: true }),
  ],
});

export type Session = typeof auth.$Infer.Session;
