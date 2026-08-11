export type ApiKeyClientId = "codex" | "claude" | "cursor" | "vscode";

export function buildApiKeyClientConfiguration(
  client: ApiKeyClientId,
  apiKey: string,
  origin: string,
): string {
  const endpoint = `${origin.replace(/\/+$/, "")}/mcp`;
  if (client === "codex") {
    return `export VERITIO_API_KEY="${apiKey}"\ncodex mcp add veritio --url ${endpoint} --bearer-token-env-var VERITIO_API_KEY`;
  }
  if (client === "claude") {
    return `claude mcp add --scope user --transport http veritio ${endpoint} --header "Authorization: Bearer ${apiKey}"`;
  }
  if (client === "cursor") {
    return JSON.stringify(
      {
        mcpServers: {
          veritio: {
            command: "npx",
            args: ["-y", "@veritiolabs/mcp-stdio"],
            env: { VERITIO_API_KEY: apiKey },
          },
        },
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      servers: {
        veritio: {
          type: "stdio",
          command: "npx",
          args: ["-y", "@veritiolabs/mcp-stdio"],
          env: { VERITIO_API_KEY: apiKey },
        },
      },
    },
    null,
    2,
  );
}
