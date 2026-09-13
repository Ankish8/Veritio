import "server-only";

import { betterAuth } from "better-auth";
import type { BetterAuthPlugin } from "better-auth";
import { apiKey } from "@better-auth/api-key";
import { bearer } from "better-auth/plugins/bearer";
import { mcp } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { createPool } from "./db-pool";
import {
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_NAME_MIN_LENGTH,
} from "./api-key-limits";
import { verifyEmailHtml } from "./emails/verify-email";
import { resetPasswordHtml } from "./emails/reset-password";
import { resolveAuthRuntimePolicy } from "./auth-runtime-policy";

const authRuntimePolicy = resolveAuthRuntimePolicy(process.env);

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Canonical sender identity: EMAIL_FROM ("Name <address>"), the single var
// shared with the app's email service. Keep this default in sync with
// DEFAULT_FROM_EMAIL in apps/veritio/src/lib/email/from-address.ts.
const FROM_EMAIL = process.env.EMAIL_FROM || "Veritio <noreply@veritio.io>";

/**
 * OAuth scopes the MCP server accepts and advertises.
 *
 * Keep in sync with MCP_SCOPES in apps/veritio/src/mcp/authz/scopes.ts — that is
 * the enforcement side; this is what clients are allowed to ask for.
 */
const MCP_OAUTH_SCOPES = [
  "openid",
  "offline_access",
  "studies:read",
  "studies:write",
  "results:read",
  "panel:read",
  "panel:write",
  "org:read",
  "export:write",
];

/**
 * MCP plugin options.
 *
 * Two quirks in better-auth 1.4 that this shape works around, both verified
 * against the installed source rather than guessed:
 *
 * 1. `scopes_supported` is published from *two different places*. The
 *    protected-resource document reads `oidcConfig.metadata.scopes_supported`,
 *    while the authorization-server document spreads a **top-level** `metadata`.
 *    Setting only one leaves the other advertising the OIDC defaults, and a
 *    client that reads discovery will then never request Veritio scopes — so
 *    every OAuth token would resolve to read-only.
 * 2. That top-level `metadata` is read at runtime but is not declared on
 *    `MCPOptions`, hence the cast.
 */
const MCP_OPTIONS = {
  loginPage: "/sign-in",
  resource: `${process.env.NEXT_PUBLIC_APP_URL || "https://veritio.io"}/mcp`,
  // Read by getMCPProviderMetadata (the /.well-known/oauth-authorization-server
  // document). Undeclared on MCPOptions; see note 2 above.
  metadata: { scopes_supported: MCP_OAUTH_SCOPES },
  oidcConfig: {
    // Declared independently of the outer loginPage by OIDCOptions.
    loginPage: "/sign-in",
    // Appended to the OIDC defaults to form the accepted scope list.
    scopes: MCP_OAUTH_SCOPES,
    // Read by getMCPProtectedResourceMetadata; see note 1 above.
    metadata: { scopes_supported: MCP_OAUTH_SCOPES },
    // Least privilege: a client that asks for nothing specific gets reads only.
    defaultScope: "openid studies:read results:read org:read",
    consentPage: "/oauth/consent",
    // PKCE S256 is mandatory for MCP clients under the current spec.
    requirePKCE: true,
    // better-auth 1.4 defaults this to true even when requirePKCE is enabled.
    // Keep discovery (which advertises only S256) and enforcement aligned.
    allowPlainCodeChallengeMethod: false,
    allowDynamicClientRegistration: true,
  },
} as Parameters<typeof mcp>[0];

export const auth = betterAuth({
  database: createPool(),
  baseURL: authRuntimePolicy.baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: !!resend,
    // Reset-password link is valid for 1 hour (matches verification expiry).
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) {
        console.warn(
          "[auth] RESEND_API_KEY not set, skipping password reset email",
        );
        return;
      }
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: "Reset your password - Veritio",
          html: resetPasswordHtml({ url, userName: user.name }),
        });
        if (result.error) {
          console.error(
            "[auth] Failed to send password reset email:",
            result.error,
          );
        } else {
          console.log(
            "[auth] Password reset email sent to",
            user.email,
            "id:",
            result.data?.id,
          );
        }
      } catch (err) {
        console.error("[auth] Error sending password reset email:", err);
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        console.warn(
          "[auth] RESEND_API_KEY not set, skipping verification email",
        );
        return;
      }
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: "Verify your email - Veritio",
          html: verifyEmailHtml({ url, userName: user.name }),
        });
        if (result.error) {
          console.error(
            "[auth] Failed to send verification email:",
            result.error,
          );
        } else {
          console.log(
            "[auth] Verification email sent to",
            user.email,
            "id:",
            result.data?.id,
          );
        }
      } catch (err) {
        console.error("[auth] Error sending verification email:", err);
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
    // Machine credentials for the MCP server (and any future public API).
    // Session tokens are the wrong primitive for this: they expire in 7 days,
    // carry the user's full privileges, and cannot be scoped or revoked
    // individually. API keys can.
    apiKey({
      apiKeyHeaders: ["x-api-key"],
      defaultPrefix: "vrt_",
      // Read from the shared module, never inlined: app/api/mcp-keys/route.ts
      // validates against the same constants, and Better Auth's default of 32
      // silently undercutting the route's 80 is exactly the drift that turned a
      // 33-character name into an opaque 500.
      minimumNameLength: API_KEY_NAME_MIN_LENGTH,
      maximumNameLength: API_KEY_NAME_MAX_LENGTH,
      // Keys are long-lived by default but capped, so an abandoned integration
      // stops working rather than lingering forever.
      keyExpiration: {
        // Better Auth passes this value to getDate(..., "sec"). Its generated
        // type comment says milliseconds, but both the runtime and docs use
        // seconds. maxExpiresIn is a separate day count.
        defaultExpiresIn: 60 * 60 * 24 * 365,
        maxExpiresIn: 365,
      },
      // Per-key throttle. The MCP layer bypasses the backend's
      // middlewares/rate-limit entirely (it calls services in-process), so this
      // is the only thing standing between a runaway agent loop and the DB.
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60,
        maxRequests: 300,
      },
      enableMetadata: true,
    }) as BetterAuthPlugin,
    // OAuth 2.1 for the MCP server. This is not redundant with apiKey(): the
    // claude.ai web UI and the Claude Desktop custom-connector dialog accept
    // OAuth only — neither offers a field for a bearer or custom header — so
    // without this Veritio cannot be installed as a connector there at all.
    // Provides the authorize/token endpoints, dynamic client registration
    // (RFC 7591) and the protected-resource metadata clients discover us with.
    // Widened to BetterAuthPlugin deliberately. better-auth does not export
    // `MCPOptions` from its plugins barrel (or from any resolvable subpath), so
    // the plugin's inferred return type references a type TypeScript cannot
    // name, which breaks this package's declaration emit with TS4023. Widening
    // contains that leak. The cost is that `auth.api.getMcpSession` and friends
    // lose their types here; the MCP layer reaches them through a narrow typed
    // wrapper in apps/veritio/src/mcp/auth.ts instead.
    mcp(MCP_OPTIONS) as BetterAuthPlugin,
    nextCookies(), // MUST be last
  ],

  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001",
    "https://veritio.io",
    "https://www.veritio.io",
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:4001"] : []),
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
    useSecureCookies: authRuntimePolicy.useSecureCookies,
    crossSubDomainCookies: {
      enabled: !!authRuntimePolicy.cookieDomain,
      domain: authRuntimePolicy.cookieDomain,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
