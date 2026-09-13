export interface AuthRuntimePolicy {
  baseURL: string | undefined;
  useSecureCookies: boolean;
  cookieDomain: string | undefined;
}

interface AuthRuntimeEnvironment {
  [key: string]: string | undefined;
  NODE_ENV?: string;
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  BETTER_AUTH_COOKIE_DOMAIN?: string;
}

/**
 * Derive cookie security from the public origin rather than NODE_ENV.
 * Production self-hosted installs commonly start on plain HTTP while being
 * validated; forcing Secure and `.veritio.io` cookies there makes login look
 * successful but discards the session in the browser.
 */
export function resolveAuthRuntimePolicy(
  env: AuthRuntimeEnvironment,
): AuthRuntimePolicy {
  const baseURL = env.BETTER_AUTH_URL || env.NEXT_PUBLIC_APP_URL;
  let hostname: string | undefined;
  let useSecureCookies = false;

  if (baseURL) {
    try {
      const parsed = new URL(baseURL);
      hostname = parsed.hostname;
      useSecureCookies = parsed.protocol === "https:";
    } catch {
      // Better Auth reports malformed base URLs during initialization. Keep
      // cookies fail-closed here instead of guessing that the origin is HTTPS.
    }
  }

  const explicitDomain = env.BETTER_AUTH_COOKIE_DOMAIN?.trim() || undefined;
  const veritioDomain =
    hostname === "veritio.io" || hostname?.endsWith(".veritio.io");
  const cookieDomain =
    explicitDomain || (veritioDomain ? ".veritio.io" : undefined);

  return { baseURL, useSecureCookies, cookieDomain };
}
