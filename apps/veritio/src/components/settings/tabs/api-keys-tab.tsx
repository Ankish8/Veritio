"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Code2,
  Copy,
  Eye,
  Key,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { MCP_SCOPES, type McpScope } from "@/mcp/authz/scopes";
import {
  buildApiKeyClientConfiguration,
  type ApiKeyClientId,
} from "@/mcp/api-key-client-config";

/**
 * Developer access: API keys, the REST API, and the MCP server.
 *
 * One key type serves both surfaces, because they sit on one authorization
 * core — a key scoped `results:read` reads results over HTTPS and over MCP, and
 * cannot launch a study on either. Splitting them into two credential types
 * would imply a distinction that does not exist and double the number of
 * secrets a user has to rotate.
 *
 * Keys go through `/api/mcp-keys` rather than Better Auth's own
 * `/api/auth/api-key/*`. Those look like the obvious choice, but Better Auth
 * classifies a key's `permissions` as a server-only property and rejects it on
 * any request carrying headers — so a browser can only ever mint *unscoped*
 * keys through them. Scoped keys have to be created server-side.
 */

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastRequest: string | null;
  permissions?: Record<string, string[]> | string | null;
}

interface ScopeCopy {
  label: string;
  detail: string;
  write: boolean;
}

const SCOPE_COPY: Record<McpScope, ScopeCopy> = {
  "studies:read": {
    label: "Read studies",
    detail: "Study setup, content and settings.",
    write: false,
  },
  "studies:write": {
    label: "Create, edit and launch studies",
    detail: "Includes taking a study live to real participants.",
    write: true,
  },
  "results:read": {
    label: "Read results",
    detail: "Analysis, participants and their responses.",
    write: false,
  },
  "panel:read": {
    label: "Read the participant panel",
    detail: "Panel members, tags and segments.",
    write: false,
  },
  "panel:write": {
    label: "Edit the participant panel",
    detail: "Add and update panel members and their tags.",
    write: true,
  },
  "org:read": {
    label: "Read the workspace",
    detail: "Workspace details, members and plan.",
    write: false,
  },
  "org:write": {
    label: "Manage the workspace",
    detail: "Rename it and change who has access.",
    write: true,
  },
  "export:write": {
    label: "Export data and generate reports",
    detail: "Includes AI insight reports.",
    write: true,
  },
};

/**
 * Named starting points.
 *
 * Most people reach for "everything" when a checkbox list gives them no reason
 * not to. Naming the common shapes makes the narrow one the easy choice.
 */
const PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  scopes: McpScope[];
}> = [
  {
    id: "analysis",
    label: "Analysis only",
    description: "Read studies and results. Cannot change or launch anything.",
    scopes: ["studies:read", "results:read", "org:read"],
  },
  {
    id: "authoring",
    label: "Build and launch",
    description: "Everything an integration needs to create and ship studies.",
    scopes: [
      "studies:read",
      "studies:write",
      "results:read",
      "org:read",
      "export:write",
    ],
  },
  {
    id: "full",
    label: "Full access",
    description: "Every scope, including the participant panel and workspace.",
    scopes: [...MCP_SCOPES],
  },
];

const EXPIRY_OPTIONS: Array<{ label: string; days: number | null }> = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "No expiry", days: null },
];

const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL || "https://veritio.io"
).replace(/\/+$/, "");

const API_KEY_CLIENTS: Array<{
  id: ApiKeyClientId;
  label: string;
  icon: typeof Bot;
}> = [
  { id: "codex", label: "Codex", icon: Bot },
  { id: "claude", label: "Claude Code", icon: Sparkles },
  { id: "cursor", label: "Cursor", icon: Code2 },
  { id: "vscode", label: "VS Code", icon: Code2 },
];

function scopesOf(row: ApiKeyRow): McpScope[] {
  const raw = row.permissions;
  if (!raw) return [];
  let parsed: Record<string, string[]> | null = null;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  } else {
    parsed = raw;
  }
  if (!parsed) return [];
  const flat = Object.entries(parsed).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}:${action}`),
  );
  return MCP_SCOPES.filter((scope) => flat.includes(scope));
}

function isExpired(row: ApiKeyRow): boolean {
  return Boolean(row.expiresAt && new Date(row.expiresAt).getTime() < Date.now());
}

function sameScopes(a: readonly McpScope[], b: readonly McpScope[]): boolean {
  return a.length === b.length && a.every((scope) => b.includes(scope));
}

export function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<McpScope[]>(PRESETS[0].scopes);
  const [expiryDays, setExpiryDays] = useState<number | null>(90);
  const [issued, setIssued] = useState<string | null>(null);
  const [issuedClient, setIssuedClient] = useState<ApiKeyClientId>("codex");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp-keys", { credentials: "include" });
      if (!res.ok) throw new Error("Could not load keys");
      const body = (await res.json()) as { keys?: ApiKeyRow[] };
      setKeys(body.keys ?? []);
    } catch {
      toast.error("Could not load your API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!name.trim()) {
      toast.error("Give the key a name so you can recognise it later.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one permission.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/mcp-keys", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes: selected,
          ...(expiryDays !== null ? { expiresInDays: expiryDays } : {}),
        }),
      });
      const created = (await res.json()) as { key?: string; error?: string };
      if (!res.ok) {
        throw new Error(created.error ?? "Could not create the key.");
      }
      if (created.key) setIssued(created.key);
      setName("");
      setSelected(PRESETS[0].scopes);
      setExpiryDays(90);
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create the key.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string, label: string) {
    if (
      !window.confirm(
        `Revoke "${label}"? Anything using it stops working immediately.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/mcp-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("Key revoked.");
      await load();
    } catch {
      toast.error("Could not revoke the key.");
    }
  }

  function toggle(scope: McpScope) {
    setSelected((prev) =>
      prev.includes(scope)
        ? prev.filter((value) => value !== scope)
        : [...prev, scope],
    );
  }

  const grantsWrite = selected.some((scope) => SCOPE_COPY[scope].write);
  const canLaunch = selected.includes("studies:write");

  const issuedConfiguration = issued
    ? buildApiKeyClientConfiguration(issuedClient, issued, APP_ORIGIN)
    : null;

  const curlExample = useMemo(
    () =>
      [
        `curl ${APP_ORIGIN}/api/v1/me \\`,
        `  -H "Authorization: Bearer ${issued ?? "vrt_your_key_here"}"`,
      ].join("\n"),
    [issued],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Build on Veritio</CardTitle>
          <CardDescription className="max-w-2xl">
            One credential, two ways in. The REST API is for scripts and
            integrations; the MCP server is for AI assistants. Both accept the
            same keys and honour the same scopes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <EndpointRow
            icon={Terminal}
            title="REST API"
            url={`${APP_ORIGIN}/api/v1`}
            action={
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href="/docs/api">
                  <BookOpen className="h-3.5 w-3.5" /> Reference
                </Link>
              </Button>
            }
          />
          <EndpointRow
            icon={Bot}
            title="MCP server"
            url={`${APP_ORIGIN}/mcp`}
            action={
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href="/mcp/setup">
                  Setup <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border bg-muted/40">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <ShieldCheck className="h-4 w-4" /> Recommended for AI assistants
          </div>
          <CardTitle>Connect with OAuth</CardTitle>
          <CardDescription className="mt-2 max-w-2xl">
            Add Veritio to Codex, Claude Code, Cursor, or VS Code, then sign in
            and approve access. There is no key to copy, store, or rotate by
            hand.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="gap-2">
            <Link href="/mcp/setup">
              Open guided setup <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API keys
          </CardTitle>
          <CardDescription>
            Scoped and individually revocable. Grant a key only what its
            integration needs — a key that reads results cannot launch a study to
            the public.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {issued && (
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="h-3.5 w-3.5 shrink-0" />
                Copy this key now. It cannot be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded border border-border bg-background px-3 py-2 font-mono text-xs">
                  {issued}
                </code>
                <CopyButton value={issued} label="Key copied." />
              </div>

              <p className="mt-4 text-xs font-medium text-foreground">
                Try it against the REST API:
              </p>
              <div className="mt-2 flex items-start gap-2">
                <code className="flex-1 overflow-x-auto whitespace-pre rounded border border-border bg-background px-3 py-2 font-mono text-[11px]">
                  {curlExample}
                </code>
                <CopyButton value={curlExample} label="Command copied." />
              </div>

              <p className="mt-4 text-xs font-medium text-foreground">
                Or wire it into an AI assistant:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {API_KEY_CLIENTS.map((client) => {
                  const Icon = client.icon;
                  return (
                    <button
                      key={client.id}
                      type="button"
                      aria-pressed={issuedClient === client.id}
                      onClick={() => setIssuedClient(client.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                        issuedClient === client.id
                          ? "border-foreground/40 bg-accent text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {client.label}
                    </button>
                  );
                })}
              </div>
              {issuedConfiguration && (
                <div className="mt-2 flex items-start gap-2">
                  <code className="max-h-48 flex-1 overflow-auto whitespace-pre rounded border border-border bg-background px-3 py-2 font-mono text-[11px]">
                    {issuedConfiguration}
                  </code>
                  <CopyButton
                    value={issuedConfiguration}
                    label="Configuration copied."
                  />
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIssued(null)}
                >
                  Done
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  Cursor and VS Code use the published stdio bridge so the key
                  stays in the client environment.
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading keys…
            </div>
          ) : keys.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No API keys yet.
            </p>
          ) : (
            <div className="space-y-2">
              {keys.map((row) => {
                const scopes = scopesOf(row);
                const writes = scopes.some((scope) => SCOPE_COPY[scope]?.write);
                const expired = isExpired(row);
                return (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {row.name ?? "Untitled key"}
                        </span>
                        {!row.enabled && (
                          <Badge variant="secondary">revoked</Badge>
                        )}
                        {expired && <Badge variant="secondary">expired</Badge>}
                        {writes ? (
                          <Badge
                            variant="outline"
                            className="gap-1 text-amber-700"
                          >
                            <Pencil className="h-3 w-3" /> read + write
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Eye className="h-3 w-3" /> read only
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {row.start}…
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {scopes.length > 0
                          ? scopes.join(", ")
                          : "no permissions"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.lastRequest
                          ? `Last used ${new Date(row.lastRequest).toLocaleDateString()}`
                          : "Never used"}
                        {row.expiresAt
                          ? ` · ${expired ? "expired" : "expires"} ${new Date(row.expiresAt).toLocaleDateString()}`
                          : " · no expiry"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Revoke ${row.name ?? "this key"}`}
                      onClick={() => revoke(row.id, row.name ?? "this key")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create a key
            </Button>
          ) : (
            <div className="space-y-6 rounded-lg border p-5">
              <div className="space-y-1.5">
                <Label htmlFor="key-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nightly results export"
                  maxLength={80}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  Name it after what uses it, so you know what breaks when you
                  revoke it.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Preset</Label>
                <Segmented
                  options={PRESETS.map((preset) => ({
                    value: preset.id,
                    label: preset.label,
                  }))}
                  value={
                    PRESETS.find((preset) => sameScopes(selected, preset.scopes))
                      ?.id ?? null
                  }
                  onChange={(id) => {
                    const preset = PRESETS.find((option) => option.id === id);
                    if (preset) setSelected([...preset.scopes]);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {PRESETS.find((preset) => sameScopes(selected, preset.scopes))
                    ?.description ?? "Custom selection."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="divide-y rounded-md border">
                  {MCP_SCOPES.map((scope) => (
                    <label
                      key={scope}
                      className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={selected.includes(scope)}
                        onCheckedChange={() => toggle(scope)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium leading-none">
                            {SCOPE_COPY[scope].label}
                          </span>
                          <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {scope}
                          </code>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {SCOPE_COPY[scope].detail}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Expires</Label>
                <Segmented
                  options={EXPIRY_OPTIONS.map((option) => ({
                    value: String(option.days),
                    label: option.label,
                  }))}
                  value={String(expiryDays)}
                  onChange={(value) =>
                    setExpiryDays(value === "null" ? null : Number(value))
                  }
                />
              </div>

              {canLaunch ? (
                <Notice>
                  This key can launch studies, which makes them reachable by
                  real participants and starts collecting their data. Leave the
                  write permissions off for anything that only analyses.
                </Notice>
              ) : grantsWrite ? (
                <Notice>
                  This key can change data. It cannot launch studies.
                </Notice>
              ) : null}

              <div className="flex items-center gap-2 border-t pt-4">
                <Button onClick={create} disabled={creating} size="sm">
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create key"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * A segmented control.
 *
 * Presets and expiry are both "pick exactly one of a few", and rendering them
 * as one control each — rather than a row of cards and a row of loose pills —
 * is what makes the form read as a form.
 */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex w-full max-w-xl rounded-md border bg-muted/40 p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-[5px] px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function EndpointRow({
  icon: Icon,
  title,
  url,
  action,
}: {
  icon: typeof Bot;
  title: string;
  url: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px]">
          {url}
        </code>
        <CopyButton value={url} label="URL copied." />
      </div>
      <div className="mt-2">{action}</div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        toast.success(label);
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}
