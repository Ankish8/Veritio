"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
} from "lucide-react";
import { getAuthToken, useSession } from "@veritio/auth/client";
import { Button } from "@/components/ui/button";
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

function parseMcpResponse(text: string): unknown {
  const dataLine = text.split(/\r?\n/).find((line) => line.startsWith("data:"));
  const payload = dataLine ? dataLine.slice(5).trim() : text;
  return payload ? JSON.parse(payload) : null;
}

function CopyAction({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" onClick={copy} className="gap-2">
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

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
      const response = await fetch(endpointSetup.endpoint, {
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

  return (
    <div className="min-h-screen bg-[#f7f5fb] text-[#17131f]">
      <header className="border-b border-[#e8e2ef] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/favicon-black.png"
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-lg"
            />
            <span className="font-semibold tracking-tight">Veritio</span>
          </Link>
          <Link
            href={session?.user ? "/" : signInUrl}
            className="flex items-center gap-1.5 text-sm font-medium text-[#5f556b] transition-colors hover:text-[#17131f]"
          >
            {session?.user ? "Open dashboard" : "Sign in"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[#e8e2ef] bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(126,75,183,0.18),transparent_55%)]" />
          <div className="relative mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-24">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-[#ded4e9] bg-[#faf8fc] px-3 py-1.5 text-xs font-semibold text-[#69448e]">
              <Sparkles className="size-3.5" /> Veritio MCP
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Bring your research into your AI workflow
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-[#6d6476] sm:text-lg">
              Connect once with OAuth. Your assistant can inspect studies,
              analyze results, manage participants, and create research work
              within the permissions you approve.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8 sm:py-14">
          <section
            aria-labelledby="endpoint-heading"
            className="overflow-hidden rounded-3xl border border-[#e3dce9] bg-white shadow-[0_24px_70px_-40px_rgba(62,37,83,0.35)]"
          >
            <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="border-b border-[#e8e2ef] bg-[#fbfafd] p-6 sm:p-8 lg:border-r lg:border-b-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#69448e]">
                  <ShieldCheck className="size-4" /> OAuth connection
                </div>
                <h2
                  id="endpoint-heading"
                  className="mt-3 text-2xl font-semibold tracking-tight"
                >
                  Choose access
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#706779]">
                  You will review the exact permissions again before access is
                  granted.
                </p>

                <div
                  className="mt-6 grid gap-3"
                  role="radiogroup"
                  aria-label="MCP access level"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "full"}
                    onClick={() => {
                      setMode("full");
                      setConnection({ status: "idle" });
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      mode === "full"
                        ? "border-[#8b5bb4] bg-[#f6f0fb] ring-2 ring-[#8b5bb4]/10"
                        : "border-[#e4dee9] hover:border-[#cbbbd8]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Standard access</span>
                      {mode === "full" && (
                        <CheckCircle2 className="size-5 text-[#74469c]" />
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-[#706779]">
                      Read research and create or update work you approve.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === "readonly"}
                    onClick={() => {
                      setMode("readonly");
                      setConnection({ status: "idle" });
                    }}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition",
                      mode === "readonly"
                        ? "border-[#8b5bb4] bg-[#f6f0fb] ring-2 ring-[#8b5bb4]/10"
                        : "border-[#e4dee9] hover:border-[#cbbbd8]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Read only</span>
                      {mode === "readonly" && (
                        <CheckCircle2 className="size-5 text-[#74469c]" />
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-[#706779]">
                      Analyze studies and results without changing anything.
                    </span>
                  </button>
                </div>

                <div className="mt-6 rounded-xl border border-[#e5dfea] bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#877b91]">
                    Server URL
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs text-[#403748] sm:text-sm">
                      {endpointSetup.endpoint}
                    </code>
                    <CopyAction value={endpointSetup.endpoint} label="Copy" />
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <p className="text-sm font-semibold text-[#69448e]">
                  1. Choose your client
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {endpointSetup.clients.map((client) => {
                    const Icon = CLIENT_ICONS[client.id];
                    return (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => setClientId(client.id)}
                        aria-pressed={clientId === client.id}
                        className={cn(
                          "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-semibold transition sm:text-sm",
                          clientId === client.id
                            ? "border-[#8b5bb4] bg-[#f6f0fb] text-[#5c357e]"
                            : "border-[#e7e1eb] text-[#615868] hover:border-[#cbbbd8] hover:bg-[#fbf9fd]",
                        )}
                      >
                        <Icon className="size-5" />
                        {client.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl border border-[#e5dfea] bg-[#fcfbfd] p-5">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const Icon = CLIENT_ICONS[selectedClient.id];
                      return (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ede3f5] text-[#69448e]">
                          <Icon className="size-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="font-semibold">{selectedClient.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#706779]">
                        {selectedClient.description}
                      </p>
                    </div>
                  </div>

                  {selectedClient.command && (
                    <pre className="mt-5 overflow-x-auto rounded-xl bg-[#1e1924] p-4 text-xs leading-6 text-[#f5effa]">
                      <code>{selectedClient.command}</code>
                    </pre>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedClient.installUrl ? (
                      <Button asChild className="gap-2">
                        <a href={selectedClient.installUrl}>
                          <ExternalLink className="size-4" />
                          {selectedClient.actionLabel}
                        </a>
                      </Button>
                    ) : (
                      <CopyAction
                        value={selectedClient.command!}
                        label={selectedClient.actionLabel}
                      />
                    )}
                    <details className="group w-full pt-2">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-[#6d6476] hover:text-[#332a3b]">
                        Manual configuration
                        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="relative mt-3">
                        <pre className="overflow-x-auto rounded-xl border border-[#e5dfea] bg-white p-4 pr-12 text-xs leading-6 text-[#403748]">
                          <code>{selectedClient.configuration}</code>
                        </pre>
                        <div className="absolute top-2 right-2">
                          <CopyAction
                            value={selectedClient.configuration}
                            label="Copy"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#e0d5ea] bg-[#f8f3fc] p-4">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#69448e]" />
                  <p className="text-sm leading-6 text-[#5f556b]">
                    Your client opens Veritio in the browser. Sign in, review
                    the requested permissions, and select{" "}
                    <strong>Allow access</strong>. No API key is needed.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            className="grid gap-4 md:grid-cols-3"
            aria-label="Setup steps"
          >
            {[
              {
                number: "01",
                icon: TerminalSquare,
                title: "Install",
                body: "Add the secure Veritio endpoint using the option above.",
              },
              {
                number: "02",
                icon: LockKeyhole,
                title: "Authenticate",
                body: "Sign in to the Veritio workspace you want to connect.",
              },
              {
                number: "03",
                icon: ShieldCheck,
                title: "Approve",
                body: "Review scopes and allow only the access you intend.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-[#e4dee9] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <step.icon className="size-5 text-[#74469c]" />
                  <span className="text-xs font-semibold text-[#a094aa]">
                    {step.number}
                  </span>
                </div>
                <h2 className="mt-5 font-semibold">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#706779]">
                  {step.body}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-[#e3dce9] bg-[#211a29] p-6 text-white sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#d8b9f0]">
                  <Wrench className="size-4" /> Connection check
                </div>
                <h2 className="mt-2 text-2xl font-semibold">
                  Verify your Veritio access
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#c8bfce]">
                  This sends a read-only tool discovery request to the real MCP
                  endpoint using your current Veritio session.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={testConnection}
                disabled={connection.status === "testing"}
                className="gap-2 bg-white text-[#211a29] hover:bg-[#f3eef7]"
              >
                {connection.status === "testing" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Test connection
              </Button>
            </div>

            <div className="mt-5 min-h-6" aria-live="polite">
              {connection.status === "success" && (
                <p className="flex items-center gap-2 text-sm text-[#baf2c9]">
                  <CheckCircle2 className="size-4" /> Connected to{" "}
                  {mode === "full" ? "standard" : "read-only"} MCP with{" "}
                  {connection.toolCount} tools available.
                </p>
              )}
              {connection.status === "signed-out" && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-[#f3d7a4]">
                  <CircleAlert className="size-4" /> Sign in before testing.
                  <Link href={signInUrl} className="font-semibold underline">
                    Sign in and return
                  </Link>
                </p>
              )}
              {connection.status === "error" && (
                <p className="flex items-center gap-2 text-sm text-[#ffc4c4]">
                  <CircleAlert className="size-4" /> {connection.message}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#e3dce9] bg-white p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f1eafa] text-[#69448e]">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7d94]">
                    Advanced
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    API keys and stdio
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#706779]">
                    Use scoped API keys for CI or headless environments, or the
                    published stdio bridge when a client cannot connect to a
                    remote HTTP server.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link href={apiKeyUrl}>
                  Manage API keys <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#e3dce9] px-5 py-8 text-center text-xs text-[#817689]">
        Veritio MCP uses OAuth 2.1, PKCE, scoped permissions, and revocable
        access.
      </footer>
    </div>
  );
}
