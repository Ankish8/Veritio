"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Eye, Pencil } from "lucide-react";
import { isSafeOAuthRedirectUri } from "@/mcp/oauth-security";

/**
 * OAuth consent screen for MCP clients.
 *
 * The spec is emphatic that this page matters: it is the control that stops a
 * confused-deputy attack, where a client that is already trusted by the
 * authorization server is used to obtain a token for a different user. It must
 * name the requesting client and the exact scopes, and it must not be
 * frameable. Both properties are enforced server-side for this exact route.
 */
export default function OAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}

/** Human-readable descriptions for the scopes a client can ask for. */
const SCOPE_COPY: Record<string, { label: string; write: boolean }> = {
  openid: { label: "Confirm your Veritio identity", write: false },
  profile: { label: "See your profile", write: false },
  email: { label: "See your email address", write: false },
  offline_access: {
    label: "Stay connected until you revoke access",
    write: false,
  },
  "studies:read": {
    label: "See your studies and how they are set up",
    write: false,
  },
  "studies:write": { label: "Create, edit and launch studies", write: true },
  "results:read": {
    label: "Read your study results and participant responses",
    write: false,
  },
  "panel:read": { label: "See your participant panel", write: false },
  "panel:write": { label: "Add and edit panel participants", write: true },
  "org:read": { label: "See your workspace and projects", write: false },
  "export:write": { label: "Export data and generate reports", write: true },
};

interface ConsentDetails {
  clientId: string;
  clientName: string;
  scopes: string[];
}

function ConsentContent() {
  const params = useSearchParams();
  const [submitting, setSubmitting] = useState<"accept" | "reject" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // The requesting client controls the URL query. Resolve the code against
  // Better Auth's verification row so the displayed client and scopes are the
  // exact grant this button will approve.
  const consentCode = params.get("consent_code");
  useEffect(() => {
    const controller = new AbortController();
    if (!consentCode) {
      setError("This consent request is invalid or has expired.");
      setLoading(false);
      return () => controller.abort();
    }

    void fetch(
      `/api/mcp-oauth/consent?consent_code=${encodeURIComponent(consentCode)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          (ConsentDetails & { error?: string }) | null;
        if (!response.ok || !body?.clientId || !Array.isArray(body.scopes)) {
          throw new Error(
            body?.error || "This consent request is invalid or has expired.",
          );
        }
        setDetails(body);
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        )
          return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load this consent request.",
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [consentCode]);

  const clientName = details?.clientName ?? "An application";
  const scopes = details?.scopes ?? [];

  const known = scopes.filter((s) => SCOPE_COPY[s]);
  const unknown = scopes.filter((s) => !SCOPE_COPY[s]);
  const grantsWrite = known.some((s) => SCOPE_COPY[s].write);

  async function decide(accept: boolean) {
    if (!consentCode || !details) return;
    setSubmitting(accept ? "accept" : "reject");
    setError(null);
    try {
      const res = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accept, consent_code: consentCode }),
      });
      const body = (await res.json().catch(() => null)) as {
        redirectURI?: string;
        error?: string;
      } | null;
      if (body?.redirectURI) {
        if (!isSafeOAuthRedirectUri(body.redirectURI)) {
          throw new Error(
            "The application returned an unsafe redirect address. Access was not opened.",
          );
        }
        window.location.assign(body.redirectURI);
        return;
      }
      if (!res.ok)
        throw new Error(body?.error || "Could not record your decision.");
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Connect to Veritio
            </h1>
            <p className="text-sm text-muted-foreground">
              Review what this app is asking for
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm">
          <span className="font-medium">{clientName}</span> wants to access your
          Veritio workspace.
        </p>

        {loading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying the request…
          </div>
        )}

        {known.length > 0 && (
          <ul className="mb-4 space-y-2">
            {known.map((scope) => {
              const { label, write } = SCOPE_COPY[scope];
              const Icon = write ? Pencil : Eye;
              return (
                <li key={scope} className="flex items-start gap-2.5 text-sm">
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${write ? "text-amber-600" : "text-muted-foreground"}`}
                  />
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        )}

        {unknown.length > 0 && (
          <p className="mb-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            It is also requesting permissions this screen does not recognise:{" "}
            {unknown.join(", ")}. Cancel unless you expected them.
          </p>
        )}

        {grantsWrite && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            This app will be able to change your studies and launch them to real
            participants. Only continue if you trust it.
          </p>
        )}

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => decide(false)}
            disabled={submitting !== null || !details}
          >
            {submitting === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cancel"
            )}
          </Button>
          <Button
            className="flex-1"
            onClick={() => decide(true)}
            disabled={submitting !== null || !details}
          >
            {submitting === "accept" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Allow access"
            )}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can revoke access at any time from your Veritio settings.
        </p>
      </div>
    </div>
  );
}
