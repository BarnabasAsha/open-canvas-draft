import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "../db/client";

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
