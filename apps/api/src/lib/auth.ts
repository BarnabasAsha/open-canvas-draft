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
