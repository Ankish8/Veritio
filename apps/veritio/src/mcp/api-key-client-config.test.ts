import { describe, expect, it } from "vitest";
import { buildApiKeyClientConfiguration } from "./api-key-client-config";

describe("API-key MCP client configuration", () => {
  const key = "vrt_fixture-key";

  it("uses an environment-backed bearer token for Codex", () => {
    expect(
      buildApiKeyClientConfiguration("codex", key, "https://veritio.io/"),
    ).toBe(
      'export VERITIO_API_KEY="vrt_fixture-key"\ncodex mcp add veritio --url https://veritio.io/mcp --bearer-token-env-var VERITIO_API_KEY',
    );
  });

  it("builds the supported Claude Code header command", () => {
    expect(
      buildApiKeyClientConfiguration("claude", key, "https://veritio.io"),
    ).toContain('--header "Authorization: Bearer vrt_fixture-key"');
  });

  it("builds stdio bridge JSON for Cursor and VS Code", () => {
    const cursor = JSON.parse(
      buildApiKeyClientConfiguration("cursor", key, "https://veritio.io"),
    );
    const vscode = JSON.parse(
      buildApiKeyClientConfiguration("vscode", key, "https://veritio.io"),
    );

    expect(cursor.mcpServers.veritio).toMatchObject({
      command: "npx",
      args: ["-y", "@veritiolabs/mcp-stdio"],
      env: { VERITIO_API_KEY: key },
    });
    expect(vscode.servers.veritio).toMatchObject({
      type: "stdio",
      command: "npx",
      args: ["-y", "@veritiolabs/mcp-stdio"],
      env: { VERITIO_API_KEY: key },
    });
  });
});
