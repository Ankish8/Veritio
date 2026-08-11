import { describe, expect, it } from "vitest";
import { buildMcpSetupConfig } from "./setup-config";

describe("MCP setup configuration", () => {
  it("builds full and read-only OAuth endpoints without duplicate slashes", () => {
    const setup = buildMcpSetupConfig("https://veritio.io/");
    expect(setup.full.endpoint).toBe("https://veritio.io/mcp");
    expect(setup.readonly.endpoint).toBe("https://veritio.io/mcp/readonly");
  });

  it("creates native Cursor and VS Code install payloads", () => {
    const setup = buildMcpSetupConfig("https://veritio.io");
    const cursor = setup.full.clients.find((client) => client.id === "cursor");
    const vscode = setup.full.clients.find((client) => client.id === "vscode");

    expect(cursor?.installUrl).toMatch(
      /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?/,
    );
    const cursorUrl = new URL(cursor!.installUrl!);
    expect(
      JSON.parse(
        Buffer.from(cursorUrl.searchParams.get("config")!, "base64").toString(
          "utf8",
        ),
      ),
    ).toEqual({ url: "https://veritio.io/mcp" });

    expect(vscode?.installUrl).toContain("vscode:mcp/install?");
    expect(
      JSON.parse(decodeURIComponent(vscode!.installUrl!.split("?")[1]!)),
    ).toEqual({
      name: "veritio",
      type: "http",
      url: "https://veritio.io/mcp",
    });
  });

  it("uses the supported remote install commands for Codex and Claude Code", () => {
    const clients = buildMcpSetupConfig("https://veritio.io").full.clients;
    expect(clients.find((client) => client.id === "codex")?.command).toBe(
      "codex mcp add veritio --url https://veritio.io/mcp",
    );
    expect(clients.find((client) => client.id === "claude")?.command).toBe(
      "claude mcp add --scope user --transport http veritio https://veritio.io/mcp",
    );
  });
});
