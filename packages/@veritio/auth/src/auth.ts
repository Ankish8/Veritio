import 'server-only'

import { betterAuth } from "better-auth"
import { bearer } from "better-auth/plugins/bearer"
import { nextCookies } from "better-auth/next-js"
import { Resend } from "resend"
import { createPool } from "./db-pool"
import { verifyEmailHtml } from "./emails/verify-email"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const auth = betterAuth({
  database: createPool(),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: !!resend,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        console.warn("[auth] RESEND_API_KEY not set, skipping verification email")
        return
      }
      try {
        const result = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Veritio <noreply@veritio.io>",
          to: user.email,
          subject: "Verify your email - Veritio",
          html: verifyEmailHtml({ url, userName: user.name }),
        })
        if (result.error) {
          console.error("[auth] Failed to send verification email:", result.error)
        } else {
          console.log("[auth] Verification email sent to", user.email, "id:", result.data?.id)
        }
      } catch (err) {
        console.error("[auth] Error sending verification email:", err)
      }
    },
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
    // Require re-authentication for sensitive operations after 10 minutes
    freshAge: 60 * 10,
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
    ...(process.env.NODE_ENV !== 'production' ? ["http://localhost:4001"] : []),
  ],

  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: "memory",
    customRules: {
      "/sign-in/*": {
        window: 60,
        max: 5,
      },
      "/sign-up/*": {
        window: 60,
        max: 3,
      },
      "/request-password-reset": {
        window: 60,
        max: 3,
      },
      "/reset-password": {
        window: 60,
        max: 3,
      },
      "/reset-password/*": {
        window: 60,
        max: 3,
      },
      "/change-password": {
        window: 60,
        max: 5,
      },
      "/change-email": {
        window: 60,
        max: 3,
      },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // Cross-subdomain cookies require the response Domain attribute to match
    // the request's registrable suffix; otherwise browsers silently drop the
    // Set-Cookie. Only enable when an explicit domain is configured (e.g.
    // ".veritio.io" on the apex deployment). Leave unset on Railway/Vercel
    // preview hosts so the session cookie falls back to host-only.
    ...(process.env.AUTH_COOKIE_DOMAIN
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: process.env.AUTH_COOKIE_DOMAIN,
          },
        }
      : {}),
  },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
