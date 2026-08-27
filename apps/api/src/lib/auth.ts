import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
});

export type Session = typeof auth.$Infer.Session;
