# Security Best Practices Report

Date: 2026-04-25

Scope: focused source review of the Veritio Next.js, Motia, Yjs, and public widget code paths for application security issues. This is not a full penetration test, but it identifies code-level vulnerabilities and remediation steps.

## Executive Summary

The highest-risk issues are concentrated in the live website preview/reverse-proxy flows and the Yjs collaboration WebSocket authorization model.

Key risks:

- Third-party HTML is served from the Veritio origin and framed with scripts plus same-origin privileges, creating a same-origin XSS path for authenticated dashboard users.
- Any authenticated user can obtain a generic Yjs token and connect to any `study:{id}` document if they know or guess the study UUID.
- The live website proxy has incomplete SSRF protection and should not be treated as safe for arbitrary authenticated URL fetches.
- Participant session tokens are placed in URLs for live website tests.
- Public/widget template code still contains dynamic JavaScript execution through `eval` / `new Function`.

## Findings

### 1. Critical: Same-Origin XSS Through Live Website Preview Proxy

Files:

- `apps/veritio/src/app/api/live-website/proxy/route.ts`
- `apps/veritio/src/steps/api/live-website/proxy.step.ts`
- `apps/veritio/src/components/builders/live-website/tabs/website-preview-panel.tsx`
- `apps/veritio/next.config.ts`

Evidence:

- The preview panel builds a same-origin iframe URL: `website-preview-panel.tsx:45-50`.
- The iframe allows both scripts and same-origin access: `website-preview-panel.tsx:187-194`.
- The proxy fetches attacker-controlled remote HTML and returns it as `text/html`: `proxy/route.ts:95-129`, `proxy/route.ts:146-189`.
- The proxy injects its own inline script and strips `X-Frame-Options` meta tags: `proxy/route.ts:155-183`.
- The response is cacheable with `Cache-Control: public, max-age=300`: `proxy/route.ts:185-189`.
- The global CSP allows inline script and eval: `next.config.ts:59-60`.

Impact:

A malicious or compromised preview URL can execute JavaScript as the Veritio application origin inside the dashboard. Because the iframe uses `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`, the framed document is not isolated from the application origin in the way a sandbox normally should be. With Veritio cookies available to same-origin requests, attacker-controlled preview HTML can potentially read same-origin data, call application APIs as the logged-in user, modify studies, or exfiltrate sensitive research data.

Recommended remediation:

- Do not serve third-party HTML from the main app origin with scripts enabled.
- Preferred: move live preview content to a separate preview origin with no Veritio app cookies, and frame it without `allow-same-origin`.
- If same-origin previewing must remain temporarily, strip scripts, event handlers, forms, and active content before returning HTML.
- Set a route-specific restrictive CSP for proxied pages, for example `default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; frame-ancestors 'self'; base-uri 'none'`.
- Change proxied HTML caching to `Cache-Control: no-store`.
- Remove either the Next route or the duplicate Motia step, or move the hardened proxy implementation behind a shared service so both cannot drift.

### 2. High: Yjs Collaboration Tokens Are Not Scoped To Study Authorization

Files:

- `apps/veritio/src/app/api/yjs/token/route.ts`
- `apps/veritio/scripts/yjs-server/server.ts`
- `packages/@veritio/yjs/src/hooks/use-yjs-document.ts`
- `packages/@veritio/yjs/src/lib/utils.ts`
- `apps/veritio/scripts/yjs-server/persistence/supabase-persistence.ts`
- `apps/veritio/src/app/api/yjs/prewarm/route.ts`

Evidence:

- `/api/yjs/token` authenticates the user but signs only generic identity claims (`sub`, `email`, `name`): `token/route.ts:54-91`.
- Client document names are deterministic: `createDocumentName(studyId)` returns `study:${studyId}` in `utils.ts:22-24`.
- The client sends only `token` in the WebSocket params: `use-yjs-document.ts:206-215`.
- The Yjs server verifies only the generic token identity and accepts the requested URL path as `docName`: `server.ts:137-154`, `server.ts:546-573`.
- Persistence loads and stores by `doc_name`: `supabase-persistence.ts:33-39`, `supabase-persistence.ts:81-99`.
- `/api/yjs/prewarm` intentionally skips authentication and allows any valid UUID to prewarm a study document: `prewarm/route.ts:41-45`, `prewarm/route.ts:62-73`.

Impact:

Any authenticated user who knows or guesses a study UUID can connect to `study:{uuid}` and receive or modify the collaborative Yjs document. Study UUIDs are routinely exposed in URLs and API responses, so they should not be treated as authorization secrets.

Recommended remediation:

- Change `/api/yjs/token` to require a `studyId` and authorize the user against that study before issuing a token.
- Include `studyId`, `docName`, and role/permission claims in the JWT.
- In the Yjs WebSocket upgrade handler, reject connections where `docName` does not match the signed token claim.
- Enforce read/write roles. At minimum, require viewer permission to connect and editor permission to mutate.
- Require authentication for `/api/yjs/prewarm`, or make it accept only a signed, study-scoped prewarm token.

### 3. High: Live Website Proxy SSRF Protection Is Incomplete

Files:

- `apps/veritio/src/app/api/live-website/proxy/route.ts`
- `apps/veritio/src/steps/api/live-website/proxy.step.ts`

Evidence:

- `isPrivateIP` uses string-prefix checks: `proxy/route.ts:7-26`.
- `validateUrl` allows DNS failures if the hostname "looks like" a public domain: `proxy/route.ts:37-45`.
- The code resolves DNS before `fetch`, but `fetch` performs its own later resolution: `proxy/route.ts:37-45`, `proxy/route.ts:99-104`.
- Redirects are validated, but with the same incomplete IP logic: `proxy/route.ts:106-124`.

Impact:

An authenticated user may be able to use the server as an SSRF proxy to internal services, cloud metadata endpoints, private network hosts, or reserved address ranges. Bypass options include IPv4-mapped IPv6, alternate IPv4 encodings, unhandled loopback ranges such as most of `127.0.0.0/8`, DNS rebinding, and reserved/link-local/shared network ranges not covered by the string checks.

Recommended remediation:

- Replace string checks with a robust IP/CIDR parser such as `ipaddr.js`.
- Reject loopback, private, link-local, unique-local, multicast, carrier-grade NAT, benchmarking, reserved, and IPv4-mapped private/loopback addresses.
- Do not allow DNS resolution failures.
- Validate every redirect using the same robust checks.
- Where possible, connect to the validated resolved address or use network egress controls so DNS rebinding cannot bypass the check.
- Consider a per-study or per-organization host allowlist instead of arbitrary URL proxying.

### 4. Medium: Participant Session Tokens Are Passed In URLs

Files:

- `apps/veritio/src/components/players/live-website/live-website-player.tsx`
- `apps/veritio/src/components/players/live-website/recording-controller.tsx`
- `apps/veritio/src/services/snippet/proxy-companion.ts`
- `apps/veritio/src/steps/api/snippet/submit-snippet-response.step.ts`
- `apps/veritio/src/services/participant/submissions/live-website.ts`

Evidence:

- The live website player appends `__veritio_session=${sessionToken}` to a URL: `live-website-player.tsx:173-179`.
- The recording controller appends the same token to a newly opened website URL: `recording-controller.tsx:59-68`.
- The companion script persists the participant token to `sessionStorage`: `proxy-companion.ts:55-63`.
- The companion later reads `__veritio_session` from the URL and strips it with `history.replaceState`: `proxy-companion.ts:425-447`.

Impact:

Query-string tokens can leak through browser history, reverse-proxy and CDN logs, analytics tools, screenshots, crash reports, support recordings, and `Referer` headers before the script removes them. If exposed, a token may allow a third party to submit or alter participant responses and recording data for that participant session.

Recommended remediation:

- Do not place participant session tokens in query strings.
- Use a short-lived, one-time proxy session code exchanged server-side, or an `HttpOnly`, `Secure`, `SameSite` cookie scoped to the proxy origin/path.
- If a separate proxy page must receive runtime state, send it with `postMessage` after load using strict origin checks.
- Set proxy pages to `Referrer-Policy: no-referrer` or at least `same-origin`.
- Give reverse-proxy participant tokens short lifetimes and rotate them independently from long-lived resume tokens.

### 5. Medium: Public Widget Supports Dynamic Code Execution

Files:

- `public/intercept-widget-v3.js`
- `apps/veritio/src/lib/widget-templates/compiled.ts`
- `apps/veritio/src/components/builders/shared/tabs/sharing/privacy-settings-panel.tsx`
- `apps/veritio/src/services/types.ts`

Evidence:

- The static widget evaluates a configured custom consent expression with `eval(checkFn)`: `public/intercept-widget-v3.js:258-262`.
- The compiled template uses `new Function(...)` for custom consent checks: `compiled.ts:13`.
- The builder UI exposes a "Custom Check Function" field for this behavior: `privacy-settings-panel.tsx:167-189`.
- The service type allows `customCheckFunction` as a string: `services/types.ts:244-248`.

Impact:

Any user who can configure widget settings can cause Veritio-served widget JavaScript to execute arbitrary code on customer sites where the widget is installed. This creates a supply-chain risk for embed customers, weakens customer CSP requirements, and turns configuration tampering into code execution.

Recommended remediation:

- Remove arbitrary custom JavaScript consent checks.
- Replace them with declarative options, such as predefined providers, cookie names, DOM selectors, or consent category mappings.
- If custom logic is unavoidable, isolate it in a sandboxed separate-origin iframe and document the risk.
- Regenerate `public` and compiled widget artifacts after removing `eval` / `new Function`.

### 6. Low: Global CSP Is Too Permissive For Sensitive Dashboard Routes

File:

- `apps/veritio/next.config.ts`

Evidence:

- The global CSP includes `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co`: `next.config.ts:59-60`.

Impact:

This does not create XSS by itself, but it removes important browser defense-in-depth. It materially increases the impact of the live preview proxy issue because injected or proxied inline scripts are allowed to run.

Recommended remediation:

- Remove `unsafe-eval`.
- Replace broad inline script allowance with nonces or hashes.
- Apply stricter CSPs to dashboard, admin, auth, and proxy routes.
- Keep any temporarily unsafe policy isolated to the smallest route surface that actually needs it.

## Additional Notes

- `apps/veritio/src/steps/api/public-results/download-insights-report.step.ts:53-71` protects passworded public report downloads with bcrypt comparison, but no route-local rate limit was visible in the reviewed code. If public results passwords are user-chosen, add IP and study-scoped rate limiting to reduce online guessing risk.
- Local untracked secret-looking files were present during the review (`apps/veritio/.env.local`, `ankish.pem`) but did not appear tracked by Git. Keep them untracked, rotate them if accidentally shared, and ensure `.gitignore` covers local private keys and environment files.

## Recommended Remediation Order

1. Disable or isolate the live website preview proxy until the same-origin XSS issue is fixed.
2. Scope Yjs tokens to study authorization and enforce the scope in the WebSocket server.
3. Replace the SSRF guard with robust address validation and egress restrictions.
4. Remove participant tokens from URLs in live website flows.
5. Remove `eval` / `new Function` support from public widgets and regenerate artifacts.
6. Tighten CSP route by route after the active XSS surfaces are removed.
