"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  MousePointerClick,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { getAuthToken, useSession } from "@veritio/auth/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import type {
  McpClientId,
  McpEndpointMode,
  McpSetupConfig,
} from "@/mcp/setup-config";

type ConnectionState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "signed-out" }
  | { status: "success"; toolCount: number }
  | { status: "error"; message: string };

const CLIENT_ICONS: Record<McpClientId, typeof Bot> = {
  codex: Bot,
  claude: Sparkles,
  cursor: MousePointerClick,
  vscode: Code2,
};

const ACCESS_MODES: Array<{
  id: McpEndpointMode;
  label: string;
  description: string;
}> = [
  {
    id: "full",
    label: "Standard access",
    description: "Read research and create or update work you approve.",
  },
  {
    id: "readonly",
    label: "Read only",
    description: "Analyze studies and results without changing anything.",
  },
];

function parseMcpResponse(text: string): unknown {
  const dataLine = text.split(/\r?\n/).find((line) => line.startsWith("data:"));
  const payload = dataLine ? dataLine.slice(5).trim() : text;
  return payload ? JSON.parse(payload) : null;
}

/* Numbered section wrapper so the flow reads as three ordered steps.
   Title, description, and body all share one left edge. */
function Step({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card rounded-lg border">
      <div className="border-border/60 border-b px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="bg-foreground text-background flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-medium tabular-nums">
            {number}
          </span>
          <h2 className="text-foreground text-[15px] font-medium tracking-tight">
            {title}
          </h2>
        </div>
        <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/* Shared selected/unselected treatment for the access and client choices. */
const choiceClasses = (selected: boolean) =>
  cn(
    "border-border rounded-lg border text-left transition-colors",
    selected
      ? "border-foreground/40 bg-accent"
      : "hover:border-foreground/20 hover:bg-accent/50",
  );

export function McpSetupPage({ setup }: { setup: McpSetupConfig }) {
  const [mode, setMode] = useState<McpEndpointMode>("full");
  const [clientId, setClientId] = useState<McpClientId>("codex");
  const [connection, setConnection] = useState<ConnectionState>({
    status: "idle",
  });
  const { data: session } = useSession();

  const endpointSetup = setup[mode];
  const selectedClient =
    endpointSetup.clients.find((client) => client.id === clientId) ??
    endpointSetup.clients[0]!;
  const settingsUrl = "/settings?tab=api-keys";
  const apiKeyUrl = session?.user
    ? settingsUrl
    : `/sign-in?redirect=${encodeURIComponent(settingsUrl)}`;
  const signInUrl = `/sign-in?redirect=${encodeURIComponent("/mcp/setup")}`;

  async function testConnection() {
    setConnection({ status: "testing" });
    const token = await getAuthToken();
    if (!token) {
      setConnection({ status: "signed-out" });
      return;
    }

    try {
      // Test the deployment this page is served from, not the canonical URL in
      // the install commands. They match in production; on a preview the
      // canonical URL would test production instead, cross-origin.
      const response = await fetch(new URL(endpointSetup.endpoint).pathname, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "setup-check",
          method: "tools/list",
          params: {},
        }),
      });
      const text = await response.text();
      if (response.status === 401) {
        setConnection({ status: "signed-out" });
        return;
      }
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}.`);
      }

      const payload = parseMcpResponse(text) as {
        result?: { tools?: unknown[] };
        error?: { message?: string };
      } | null;
      if (payload?.error) {
        throw new Error(payload.error.message || "MCP returned an error.");
      }
      const tools = payload?.result?.tools;
      if (!Array.isArray(tools)) {
        throw new Error("The server did not return its tool list.");
      }
      setConnection({ status: "success", toolCount: tools.length });
    } catch (error) {
      setConnection({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not reach the MCP server.",
      });
    }
  }

  const SelectedClientIcon = CLIENT_ICONS[selectedClient.id];

  return (
    <div className="bg-app-background text-foreground min-h-screen">
      <header className="border-border bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/favicon-black.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-md"
            />
            <span className="text-sm font-medium tracking-tight">Veritio</span>
          </Link>
          <Link
            href={session?.user ? "/" : signInUrl}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
          >
            {session?.user ? "Open dashboard" : "Sign in"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="border-border bg-background border-b">
          <div className="mx-auto max-w-2xl px-5 py-12 text-center sm:px-6 sm:py-16">
            <Badge variant="outline" className="mb-4">
              Veritio MCP
            </Badge>
            <h1 className="text-3xl font-medium tracking-tight text-balance sm:text-[40px] sm:leading-[1.1]">
              Bring your research into your AI workflow
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base leading-7 text-pretty">
              Connect once with OAuth. Your assistant works inside the
              permissions you approve.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-4 px-5 py-8 sm:px-6 sm:py-10">
          <Step
            number="1"
            title="Choose access"
            description="You will review the exact permissions again before access is granted."
          >
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label="MCP access level"
            >
              {ACCESS_MODES.map((accessMode) => {
                const selected = mode === accessMode.id;
                return (
                  <button
                    key={accessMode.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setMode(accessMode.id);
                      setConnection({ status: "idle" });
                    }}
                    className={cn(choiceClasses(selected), "p-4")}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {accessMode.label}
                      </span>
                      {selected && (
                        <CheckCircle2 className="text-foreground size-4 shrink-0" />
                      )}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-sm">
                      {accessMode.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-border bg-muted/40 mt-3 flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground shrink-0 text-xs font-medium">
                Server URL
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs">
                {endpointSetup.endpoint}
              </code>
              <CopyButton text={endpointSetup.endpoint} label="Copy" />
            </div>
          </Step>

          <Step
            number="2"
            title="Add Veritio to your client"
            description="Install the remote endpoint in the tool you already use."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {endpointSetup.clients.map((client) => {
                const Icon = CLIENT_ICONS[client.id];
                const selected = clientId === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setClientId(client.id)}
                    aria-pressed={selected}
                    className={cn(
                      choiceClasses(selected),
                      "flex min-h-18 flex-col items-center justify-center gap-1.5 px-2 py-3 text-center text-sm font-medium",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        selected ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
                    {client.label}
                  </button>
                );
              })}
            </div>

            <div className="border-border mt-4 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                  <SelectedClientIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">
                    {selectedClient.label}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-sm leading-6">
                    {selectedClient.description}
                  </p>
                </div>
              </div>

              {selectedClient.command && (
                <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-xs leading-6 text-zinc-100">
                  <code>{selectedClient.command}</code>
                </pre>
              )}

              <div className="mt-3">
                {selectedClient.installUrl ? (
                  <Button asChild size="sm" className="gap-2">
                    <a href={selectedClient.installUrl}>
                      <ExternalLink className="size-3.5" />
                      {selectedClient.actionLabel}
                    </a>
                  </Button>
                ) : (
                  <CopyButton
                    text={selectedClient.command!}
                    label={selectedClient.actionLabel}
                    variant="default"
                    size="sm"
                  />
                )}
              </div>

              <details className="group border-border/70 mt-4 border-t pt-3">
                <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs font-medium transition-colors">
                  Manual configuration
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                </summary>
                <div className="relative mt-3">
                  <pre className="border-border bg-muted/40 overflow-x-auto rounded-lg border px-4 py-3 pr-14 font-mono text-xs leading-6">
                    <code>{selectedClient.configuration}</code>
                  </pre>
                  <div className="absolute top-1.5 right-1.5">
                    <CopyButton
                      text={selectedClient.configuration}
                      label="Copy"
                    />
                  </div>
                </div>
              </details>
            </div>
          </Step>

          <Step
            number="3"
            title="Sign in and approve"
            description="Your client opens Veritio in the browser. No API key is needed."
          >
            <div className="text-muted-foreground flex items-start gap-2.5 text-sm leading-6">
              <LockKeyhole className="mt-1 size-4 shrink-0" />
              <p>
                Sign in to the workspace you want to connect, review the
                requested permissions, and select{" "}
                <strong className="text-foreground font-medium">
                  Allow access
                </strong>
                . Access is scoped, revocable, and never overrides your
                workspace role.
              </p>
            </div>

            <div className="border-border/70 mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={connection.status === "testing"}
                className="gap-2"
              >
                {connection.status === "testing" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Test connection
              </Button>
              <p className="text-muted-foreground min-w-0 text-xs" aria-live="polite">
                {connection.status === "idle" &&
                  "Sends a read-only tool discovery request using your current session."}
                {connection.status === "testing" && "Checking your access…"}
                {connection.status === "success" && (
                  <span className="text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    Connected to {mode === "full" ? "standard" : "read-only"}{" "}
                    MCP with {connection.toolCount} tools available.
                  </span>
                )}
                {connection.status === "signed-out" && (
                  <span className="flex flex-wrap items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <CircleAlert className="size-3.5 shrink-0" />
                    Sign in before testing.
                    <Link
                      href={signInUrl}
                      className="text-foreground font-medium underline underline-offset-2"
                    >
                      Sign in and return
                    </Link>
                  </span>
                )}
                {connection.status === "error" && (
                  <span className="text-destructive flex items-center gap-1.5">
                    <CircleAlert className="size-3.5 shrink-0" />
                    {connection.message}
                  </span>
                )}
              </p>
            </div>
          </Step>

          <section className="border-border bg-card flex flex-col justify-between gap-4 rounded-lg border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <KeyRound className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-medium">API keys and stdio</h2>
                <p className="text-muted-foreground mt-0.5 max-w-xl text-sm leading-6">
                  Use scoped API keys for CI or headless environments, or the
                  published stdio bridge when a client cannot connect to a
                  remote HTTP server.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2 sm:shrink-0">
              <Link href={apiKeyUrl}>
                Manage API keys <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </section>
        </div>
      </main>

      <footer className="border-border border-t">
        <p className="text-muted-foreground mx-auto max-w-4xl px-5 py-8 text-center text-xs sm:px-6">
          Veritio MCP uses OAuth 2.1, PKCE, scoped permissions, and revocable
          access.
        </p>
      </footer>
    </div>
  );
}
