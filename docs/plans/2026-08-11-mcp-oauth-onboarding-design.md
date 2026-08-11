# Figma-Style MCP OAuth Onboarding

## Problem

Veritio's production MCP server, scoped API keys, read-only endpoint, OAuth discovery, and published stdio bridge are operational, but the first-run experience still falls short of a polished remote MCP integration.

Desktop clients can use an ephemeral loopback callback port. Better Auth 1.4.13 compares redirect URIs as exact strings, so an otherwise valid native-client authorization can fail when the callback port used for authorization differs from the registered port. The current production OAuth fixture also assumes that sign-up immediately creates a session, which is no longer true when production email verification is enabled.

Users currently have to discover configuration details in Settings or repository documentation. There is no public client picker, no one-click install path, no signed-in connection check, and the API-key success state only supplies a Claude Code command.

## Goals

- Make OAuth the default setup path: add the remote endpoint, sign in, approve scopes, and return to the client.
- Support native MCP clients that vary loopback callback ports without weakening redirect validation.
- Provide first-class setup paths for Codex, Claude Code, Cursor, and VS Code.
- Provide a real signed-in connection check against the production MCP route.
- Keep scoped API keys and the npm stdio bridge as clearly labelled advanced options.
- Make the OAuth production fixture work with enforced email verification and exercise loopback-port variation.
- Preserve the existing MCP tool surface, authorization model, and read-only endpoint.

## Approaches Considered

### Documentation-only setup

Add client commands to the existing documentation and Settings tab. This is small, but it leaves users to assemble the connection themselves and does not address the OAuth defect.

### Upgrade or replace the authentication provider

Move to a newer Better Auth OAuth provider implementation. This would eventually remove local compatibility code, but the current MCP plugin still performs exact redirect matching and the next MCP package introduces breaking schema and token changes. A broad authentication migration is disproportionate to this onboarding repair.

### Focused compatibility layer and public setup experience

Keep the existing, tested Better Auth integration. Add a narrow RFC 8252 loopback compatibility layer at Veritio's existing authorization boundary, plus a public client-oriented setup page, native install links where clients support them, and accurate copyable commands elsewhere. This delivers the approved experience without changing the MCP protocol or migrating unrelated authentication state.

This is the selected approach.

## Design

### Public setup page

Add a public page at `/mcp/setup` with the following hierarchy:

1. A concise explanation of what the Veritio MCP server enables.
2. A primary OAuth endpoint card for `https://veritio.io/mcp`, with a read-only option at `/mcp/readonly`.
3. Client cards for Codex, Claude Code, Cursor, and VS Code.
4. A three-step explanation: install, authenticate, approve access.
5. A signed-in "Test connection" action that calls the real `/mcp` route and reports the available tool count.
6. An Advanced section linking to scoped API-key management and the stdio bridge.

Cursor and VS Code will use their documented MCP installation URI schemes. Codex and Claude Code will receive one-line, copyable remote HTTP commands because those clients expose reliable CLI installation commands. Every card will also expose a transparent configuration fallback.

The page remains useful when signed out. Connection testing asks the user to sign in with a relative return URL that points back to `/mcp/setup`; successful sign-in must preserve that destination.

### Loopback OAuth compatibility

Dynamic client registration remains the source of truth. Veritio will record the original validated redirect URI set in reserved client metadata before delegating registration to Better Auth.

Before delegating an authorization request, the `/api/auth/mcp/authorize` route will:

1. Validate required query fields and bound their size.
2. Load the public OAuth client by `client_id`.
3. Accept an exact registered redirect URI immediately.
4. For a non-exact URI, require both the original and requested URIs to be HTTP loopback callbacks with the same normalized hostname, path, query, username, and password. Only the port may differ.
5. Add the exact requested callback as a bounded compatibility alias using a compare-and-swap update, preserving all original redirects.
6. Delegate to Better Auth, which then binds the exact requested URI into the authorization code and token exchange.

HTTPS callbacks, custom schemes, non-loopback HTTP URLs, path changes, query changes, fragments, credentials, and host changes never receive flexible matching. The alias list is capped to prevent unbounded client metadata growth. PKCE and the mandatory consent screen remain unchanged.

### Authentication return behavior

The MCP authorization cookie continues to resume an interrupted OAuth request after sign-in. Public setup and API-key links will use the existing safe relative `redirect` parameter so a user returns to the originating setup surface. The server-side dashboard guard will preserve the requested Settings path instead of always redirecting to a bare sign-in page where feasible; the setup page will not depend on that global behavior.

### Connection test

The setup page will retrieve the existing Better Auth session token through the same client API already used by the dashboard, then issue a real `tools/list` JSON-RPC request to `/mcp` with that token. It will decode JSON or SSE responses and report:

- authenticated connection status,
- endpoint mode,
- available tool count,
- an actionable error when authentication or server discovery fails.

The test performs no write operation and does not mint or persist an API key.

### Advanced API-key experience

The Settings API Keys tab will lead with the recommended OAuth setup link. API-key creation remains scoped and one-time-display only. Once a key is issued, the UI will provide full copy actions and client-specific configuration guidance rather than a single uncopyable Claude Code snippet.

The published `@veritiolabs/mcp-stdio` bridge remains available for clients or environments that cannot use remote HTTP OAuth. No npm package rename or republish is required for this change.

### Documentation

Update the repository MCP guide and package README to:

- lead with OAuth remote setup,
- link to `/mcp/setup`,
- document each supported client,
- distinguish full and read-only endpoints,
- retain API-key and stdio instructions as advanced alternatives,
- include troubleshooting for browser authorization and callback failures.

Add an MCP user guide to the documentation app so the public setup flow has a durable long-form reference.

## Error Handling and Compatibility

- Existing exact HTTPS and loopback redirect registrations continue unchanged.
- Existing OAuth clients do not require a migration; original redirects fall back to their current stored values when reserved metadata is absent.
- Existing API keys, OAuth grants, refresh tokens, and npm bridge configurations continue working.
- Registration and authorization responses remain non-cacheable and keep existing CORS behavior.
- A failed compatibility update fails closed rather than delegating an unverified redirect.
- The setup page never embeds an API key in a one-click URI.

## Verification

- Unit tests for exact redirects, permitted port variation, and rejected host/path/query/scheme/fragment variants.
- Route tests for bounded client metadata, alias updates, and authorization delegation.
- OAuth fixture coverage for production email verification, sign-in, consent, token exchange, refresh rotation, scoped tool discovery, and cleanup.
- API-key and stdio bridge regression tests.
- MCP unit suite, lint, type-check, and production build.
- Browser verification of the public setup page, client switching, copy/install links, sign-in return, connection testing, responsive layout, and API-key advanced flow.
- After a separately authorized deployment, production verification against both `/mcp` and `/mcp/readonly` with fixture cleanup evidence.

## Release Boundary

This implementation creates the in-product Figma-style onboarding and native client installation links. Publishing Veritio into third-party plugin marketplaces or curated MCP catalogs is a separate external release requiring catalog-specific accounts, review, and explicit publication approval.
