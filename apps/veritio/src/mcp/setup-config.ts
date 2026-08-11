import { Buffer } from "node:buffer";

export type McpEndpointMode = "full" | "readonly";
export type McpClientId = "codex" | "claude" | "cursor" | "vscode";

export interface McpClientSetup {
  id: McpClientId;
  label: string;
  description: string;
  command?: string;
  installUrl?: string;
  configuration: string;
  actionLabel: string;
}

export interface McpEndpointSetup {
  endpoint: string;
  clients: McpClientSetup[];
}

export type McpSetupConfig = Record<McpEndpointMode, McpEndpointSetup>;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function cursorInstallUrl(endpoint: string): string {
  const config = Buffer.from(JSON.stringify({ url: endpoint })).toString(
    "base64",
  );
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=Veritio&config=${encodeURIComponent(config)}`;
}

function vscodeInstallUrl(endpoint: string): string {
  const config = JSON.stringify({
    name: "veritio",
    type: "http",
    url: endpoint,
  });
  return `vscode:mcp/install?${encodeURIComponent(config)}`;
}

function clientsFor(endpoint: string): McpClientSetup[] {
  return [
    {
      id: "codex",
      label: "Codex",
      description:
        "Add Veritio globally from the Codex CLI, then authenticate.",
      command: `codex mcp add veritio --url ${endpoint}`,
      actionLabel: "Copy install command",
      configuration: `[mcp_servers.veritio]\nurl = "${endpoint}"`,
    },
    {
      id: "claude",
      label: "Claude Code",
      description:
        "Install once for your user account, then select Authenticate in /mcp.",
      command: `claude mcp add --scope user --transport http veritio ${endpoint}`,
      actionLabel: "Copy install command",
      configuration: JSON.stringify(
        { mcpServers: { veritio: { type: "http", url: endpoint } } },
        null,
        2,
      ),
    },
    {
      id: "cursor",
      label: "Cursor",
      description:
        "Open Cursor's reviewed MCP installer, then connect your Veritio account.",
      installUrl: cursorInstallUrl(endpoint),
      actionLabel: "Install in Cursor",
      configuration: JSON.stringify(
        { mcpServers: { veritio: { url: endpoint } } },
        null,
        2,
      ),
    },
    {
      id: "vscode",
      label: "VS Code",
      description:
        "Open VS Code's native MCP installer, review the server, and start it.",
      installUrl: vscodeInstallUrl(endpoint),
      actionLabel: "Install in VS Code",
      configuration: JSON.stringify(
        { servers: { veritio: { type: "http", url: endpoint } } },
        null,
        2,
      ),
    },
  ];
}

export function buildMcpSetupConfig(baseUrl: string): McpSetupConfig {
  const base = normalizeBaseUrl(baseUrl);
  const fullEndpoint = `${base}/mcp`;
  const readonlyEndpoint = `${base}/mcp/readonly`;

  return {
    full: { endpoint: fullEndpoint, clients: clientsFor(fullEndpoint) },
    readonly: {
      endpoint: readonlyEndpoint,
      clients: clientsFor(readonlyEndpoint),
    },
  };
}
