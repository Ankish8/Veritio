"use client";

import { useCallback, useEffect, useState } from "react";
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
  Key,
  Loader2,
  Plus,
  Trash2,
  Eye,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { MCP_SCOPES, type McpScope } from "@/mcp/authz/scopes";

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

  return (
    <div className="space-y-6">
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
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <p className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">
                Copy this key now. It cannot be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-background px-3 py-2 font-mono text-xs">
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
              <p className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-200/80">
                Connect Claude Code with:
              </p>
              <code className="mt-1 block overflow-x-auto rounded bg-background px-3 py-2 font-mono text-[11px]">
                {`claude mcp add --transport http veritio ${typeof window !== "undefined" ? window.location.origin : "https://veritio.io"}/mcp --header "Authorization: Bearer ${issued}"`}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setIssued(null)}
              >
                Done
              </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connecting without a key</CardTitle>
          <CardDescription>
            Claude on the web and Claude Desktop connect over OAuth instead —
            add{" "}
            <code className="text-xs">
              {typeof window !== "undefined"
                ? window.location.origin
                : "https://veritio.io"}
              /mcp
            </code>{" "}
            as a custom connector and you will be asked to approve access.
            Append <code className="text-xs">/readonly</code> to the URL for a
            connection that cannot modify anything.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
