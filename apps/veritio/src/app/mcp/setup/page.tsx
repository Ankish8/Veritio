import type { Metadata } from "next";
import { buildMcpSetupConfig } from "@/mcp/setup-config";
import { McpSetupPage } from "./setup-page";

export const metadata: Metadata = {
  title: "Connect Veritio MCP",
  description:
    "Connect Codex, Claude Code, Cursor, or VS Code to Veritio over MCP.",
};

export default function Page() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "https://veritio.io";

  return <McpSetupPage setup={buildMcpSetupConfig(appUrl)} />;
}
