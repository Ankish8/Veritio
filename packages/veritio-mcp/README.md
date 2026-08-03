# @veritiolabs/mcp-stdio

Local stdio bridge to the [Veritio](https://veritio.io) MCP server.

**Most clients do not need this.** Veritio runs a hosted MCP server at
`https://veritio.io/mcp` that Claude Code, Cursor and VS Code can connect to directly:

```bash
claude mcp add --transport http veritio https://veritio.io/mcp \
  --header "Authorization: Bearer vrt_..."
```

Use this bridge only if your client can launch a local process but cannot connect to a remote
HTTP server.

## Usage

```bash
VERITIO_API_KEY=vrt_... npx @veritiolabs/mcp-stdio
```

In a client config:

```json
{
  "mcpServers": {
    "veritio": {
      "command": "npx",
      "args": ["-y", "@veritiolabs/mcp-stdio"],
      "env": { "VERITIO_API_KEY": "vrt_..." }
    }
  }
}
```

## Options

| Flag | Env | Effect |
|---|---|---|
| `--readonly` | | Connect to the read-only endpoint. No mutating tools are exposed at all. |
| `--url <origin>` | `VERITIO_URL` | Override the origin, e.g. a self-hosted instance. |
| `--key <key>` | `VERITIO_API_KEY` | API key. Prefer the env var — argv is visible in process listings. |
| `--features <a,b>` | `VERITIO_FEATURES` | Only load these tool groups: `discovery`, `studies`, `content`, `results`, `delivery`, `meta`. |

`--readonly` is worth reaching for. If you want an agent to analyse your research but never
edit or launch a study, it removes the possibility rather than relying on the agent's judgement.

## Getting a key

Create one in Veritio under Settings, or on a self-hosted instance:

```bash
cd apps/veritio
bun --env-file=.env.local ./scripts/mcp-issue-key.ts <userId> "My integration"
```

Keys can be scoped. An analysis-only key:

```bash
bun --env-file=.env.local ./scripts/mcp-issue-key.ts <userId> "Analysis" studies:read,results:read
```

## What Veritio exposes

Card sorts, tree tests, surveys, first-click, first-impression, prototype and live website
tests — created, configured, launched and analysed. See
[docs/MCP.md](https://github.com/Ankish8/veritio/blob/main/docs/MCP.md) for the tool reference.

## Notes

Dependency-free by design: it runs on your machine via `npx`, so every dependency would be
both a startup cost and a supply-chain surface. Requires Node 20+.

MIT licensed, though the Veritio application itself is AGPL-3.0.
