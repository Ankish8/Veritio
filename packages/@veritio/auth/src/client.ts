"use client";

import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";

export const authClient = createAuthClient({
  baseURL,

  fetchOptions: {
    credentials: "include",
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  changePassword,
  requestPasswordReset,
  resetPassword,
  linkSocial,
  unlinkAccount,
} = authClient;

export const listAccounts = authClient.listAccounts;

let sessionFetchPromise: Promise<string | null> | null = null;
let sessionFetchTimestamp = 0;
const SESSION_CACHE_TTL = 30000;

export async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (sessionFetchPromise && now - sessionFetchTimestamp < SESSION_CACHE_TTL) {
    return sessionFetchPromise;
  }

  sessionFetchTimestamp = now;
  sessionFetchPromise = (async () => {
    try {
      const session = await authClient.getSession();
      const token = session.data?.session?.token || null;

      // Invalidate cache on null so next call retries
      if (!token) {
        sessionFetchPromise = null;
        sessionFetchTimestamp = 0;
      }

      return token;
    } catch {
      sessionFetchPromise = null;
      sessionFetchTimestamp = 0;
      return null;
    }
  })();

  return sessionFetchPromise;
}

export function clearAuthToken(): void {
  sessionFetchPromise = null;
  sessionFetchTimestamp = 0;
}

let sessionValidationPromise: Promise<boolean> | null = null;

/**
 * Confirm that a 401 really means the Better Auth session is gone.
 *
 * API endpoints can also return 401 for endpoint-specific authorization bugs.
 * A single such response must not eject a user whose session is still valid.
 * Network/auth-service failures are treated as inconclusive rather than as a
 * reason to destroy the current browser session.
 */
export async function isSessionActuallyExpired(
  loadSession: typeof authClient.getSession = authClient.getSession,
): Promise<boolean> {
  if (sessionValidationPromise) {
    return sessionValidationPromise;
  }

  clearAuthToken();

  sessionValidationPromise = (async () => {
    try {
      const result = await loadSession();
      const token = result.data?.session?.token || null;

      if (token) {
        sessionFetchTimestamp = Date.now();
        sessionFetchPromise = Promise.resolve(token);
        return false;
      }

      return !result.error;
    } catch {
      return false;
    }
  })();

  try {
    return await sessionValidationPromise;
  } finally {
    sessionValidationPromise = null;
  }
}

let isRedirecting = false;

export function handleSessionExpired(): void {
  if (typeof window === "undefined") return;
  if (isRedirecting) return;

  const currentPath = window.location.pathname;
  if (
    currentPath.startsWith("/sign-in") ||
    currentPath.startsWith("/sign-up")
  ) {
    return;
  }

  isRedirecting = true;
  clearAuthToken();

  const searchParams = new URLSearchParams();
  if (currentPath !== "/") {
    searchParams.set("redirect", currentPath);
  }

  const signInUrl = `/sign-in${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  window.location.href = signInUrl;
}

export function resetSessionRedirectGuard(): void {
  isRedirecting = false;
}
