import 'server-only'

import { betterAuth } from "better-auth"
import { bearer } from "better-auth/plugins/bearer"
import { nextCookies } from "better-auth/next-js"
import { createPool } from "./db-pool"

export const auth = betterAuth({
  database: createPool(),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["email", "profile"],
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Cookie cache disabled: Better Auth bug causes getSession() to return null in RSC
    // See: https://github.com/better-auth/better-auth/issues/7008
    cookieCache: {
      enabled: false,
    },
  },

  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
    },
  },

  plugins: [
    bearer(),
    nextCookies(), // MUST be last
  ],

  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001",
    "https://veritio.io",
    "https://www.veritio.io",
    "http://localhost:4001",
  ],

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.NODE_ENV === "production" ? ".veritio.io" : undefined,
    },
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
