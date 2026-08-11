"use client";

import { useCallback, useEffect, useState } from "react";
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
  Copy,
  ArrowRight,
  Bot,
  Code2,
  Key,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MCP_SCOPES, type McpScope } from "@/mcp/authz/scopes";
import {
  buildApiKeyClientConfiguration,
  type ApiKeyClientId,
} from "@/mcp/api-key-client-config";

/**
 * API keys for the MCP server.
 *
 * Goes through `/api/mcp-keys` rather than Better Auth's own
 * `/api/auth/api-key/*` endpoints. Those look like the obvious choice, but
 * Better Auth classifies a key's `permissions` as a server-only property and
 * rejects it on any request carrying headers — so a browser can only ever mint
 * unscoped keys through them. Scoped keys have to be created server-side.
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

const SCOPE_COPY: Record<McpScope, { label: string; write: boolean }> = {
  "studies:read": { label: "Read studies and their setup", write: false },
  "studies:write": { label: "Create, edit and launch studies", write: true },
  "results:read": {
    label: "Read results and participant responses",
    write: false,
  },
  "panel:read": { label: "Read the participant panel", write: false },
  "panel:write": { label: "Edit the participant panel", write: true },
  "org:read": { label: "Read workspace and projects", write: false },
  "export:write": { label: "Export data and generate reports", write: true },
};

const ANALYSIS_ONLY: McpScope[] = ["studies:read", "results:read", "org:read"];
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
    actions.map((a) => `${resource}:${a}`),
  );
  return MCP_SCOPES.filter((s) => flat.includes(s));
}

export function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<McpScope[]>(ANALYSIS_ONLY);
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
      // Goes through our own route rather than /api/auth/api-key/create:
      // Better Auth rejects `permissions` on any request carrying headers
      // (SERVER_ONLY_PROPERTY), so scoped keys must be minted server-side.
      const res = await fetch("/api/mcp-keys", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: selected }),
      });
      const created = (await res.json()) as { key?: string; error?: string };
      if (!res.ok)
        throw new Error(created.error ?? "Could not create the key.");
      if (created.key) setIssued(created.key);
      setName("");
      setSelected(ANALYSIS_ONLY);
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
    )
      return;
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
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  const grantsWrite = selected.some((s) => SCOPE_COPY[s].write);
  const issuedConfiguration = issued
    ? buildApiKeyClientConfiguration(issuedClient, issued, APP_ORIGIN)
    : null;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-background">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck className="h-4 w-4" /> Recommended
              </div>
              <CardTitle>Connect with OAuth</CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Add Veritio to Codex, Claude Code, Cursor, or VS Code, then sign
                in and approve access. There is no key to copy, store, or rotate
                manually.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button asChild className="gap-2">
            <Link href="/mcp/setup">
              Open guided setup <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <code className="rounded-md border bg-background px-3 py-2 text-xs">
            {APP_ORIGIN}/mcp
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              void navigator.clipboard.writeText(`${APP_ORIGIN}/mcp`);
              toast.success("Server URL copied.");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy URL
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
            Connect an AI assistant to Veritio over MCP. Keys are scoped, so you
            can grant analysis access without granting the ability to change or
            launch studies.
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(issued);
                    toast.success("Copied.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Choose a client and copy its complete configuration:
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      void navigator.clipboard.writeText(issuedConfiguration);
                      toast.success("Configuration copied.");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
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
              {keys.map((k) => {
                const scopes = scopesOf(k);
                const writes = scopes.some((s) => SCOPE_COPY[s]?.write);
                return (
                  <div
                    key={k.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {k.name ?? "Untitled key"}
                        </span>
                        {!k.enabled && (
                          <Badge variant="secondary">revoked</Badge>
                        )}
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
                        {k.start}…
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {scopes.length > 0
                          ? scopes.join(", ")
                          : "no permissions"}
                        {k.lastRequest
                          ? ` · last used ${new Date(k.lastRequest).toLocaleDateString()}`
                          : " · never used"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revoke(k.id, k.name ?? "this key")}
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
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Claude Code on my laptop"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {MCP_SCOPES.map((scope) => (
                    <label
                      key={scope}
                      className="flex cursor-pointer items-start gap-2.5 text-sm"
                    >
                      <Checkbox
                        checked={selected.includes(scope)}
                        onCheckedChange={() => toggle(scope)}
                        className="mt-0.5"
                      />
                      <span className="flex-1">
                        {SCOPE_COPY[scope].label}
                        <code className="ml-2 text-xs text-muted-foreground">
                          {scope}
                        </code>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2"
                  onClick={() => setSelected(ANALYSIS_ONLY)}
                >
                  Reset to analysis-only
                </button>
              </div>

              {grantsWrite && (
                <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This key can change studies and launch them to real
                  participants. For analysis work, leave the write permissions
                  off.
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={create} disabled={creating}>
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create key"
                  )}
                </Button>
                <Button
                  variant="ghost"
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
