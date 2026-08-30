# Veritio REST API

Veritio's whole research workflow is available over HTTPS: create a study of any of the seven
methodologies, fill it with content, launch it to real participants, and read the analysed results
back.

**Reference:** [veritio.io/docs/api](https://veritio.io/docs/api) — rendered with Scalar from the
live OpenAPI 3.1 document at [`/api/v1/openapi.json`](https://veritio.io/api/v1/openapi.json).

The same capability is available to AI agents over MCP at `https://veritio.io/mcp`. Both surfaces sit
on one authorization core, so a scope means the same thing on either. See [MCP.md](./MCP.md).

---

## Quick start

```bash
curl https://veritio.io/api/v1/me \
  -H "Authorization: Bearer vrt_your_key_here"
```

`GET /me` is the first call any integration should make. It reports who the credential belongs to,
which workspaces it can reach, the scopes it actually holds, and the plan entitlements of the
resolved workspace — the three things that otherwise cost a failed request each to discover.

Create a key in **Settings → API & MCP**, granting only the scopes the integration needs.

---

## Architecture

The public API lives in `apps/veritio/src/api/`, served by one catch-all Next.js route at
`app/api/v1/[[...segments]]/route.ts`.

```
src/api/
  http/
    errors.ts     RFC 9457 problem documents; the shared error vocabulary
    router.ts     path matching over the registry
    handler.ts    the pipeline: CORS -> auth -> rate limit -> idempotency -> dispatch
  v1/
    define-route.ts  the route contract, and `invokeRoute`
    registry.ts      the ordered list of every route
    schemas.ts       query coercion, pagination, shared response fragments
    openapi.ts       the OpenAPI 3.1 document, generated from the registry
    routes/          one module per resource group
```

### Why it is not on the iii engine

Everything else under `/api/*` is proxied to the iii backend. `/api/v1/*` is excluded in
`next.config.ts`, because the API reuses the MCP server's authorization core (`src/mcp/authz/`),
which is Next.js-side. Running it on the engine would mean a second implementation of "may this
credential do this" — and a second implementation is how the two drift into a privilege gap.

The cost of that choice is that `enqueue` — an iii-engine primitive — is unavailable. Two places
felt it, and both are now fixed rather than papered over:

- **Study duplication** used to create the study row and enqueue a job to copy its content, so a
  Next-side caller could only ever produce an empty study. The copying now lives in
  `services/study-duplication/duplicate-content.ts`, called directly by the API and MCP and still
  used by the event step for the async path.
- **Export jobs** are written as `pending` rows that only the engine could pick up. The cron step
  `steps/cron/dispatch-pending-export-jobs.step.ts` adopts any job left pending for 45 seconds,
  claiming it with a conditional update so two instances cannot both enqueue it. It doubles as a
  recovery path for jobs the engine's own queue dropped.

### One declaration per endpoint

`defineRoute` is the only way an endpoint exists. A declaration carries its method, path, scopes,
resource requirement, plan entitlement, input schemas and response schema — and that single object
drives three things:

1. what the router dispatches,
2. what the OpenAPI document describes,
3. what `registry.test.ts` enumerates to prove no endpoint ships unguarded.

Nothing about an endpoint is written twice, so the published reference cannot describe an API that
does not exist. **If the spec is wrong, the API is wrong.**

---

## Authentication

Header-based only. This API never reads cookies, which is what makes
`Access-Control-Allow-Origin: *` safe on it: with no ambient credential, a hostile page can send a
cross-origin request but has nothing to authenticate it with.

| Method | Header | Use for |
| --- | --- | --- |
| API key | `Authorization: Bearer vrt_…` or `X-Api-Key: vrt_…` | Scripts, CI, integrations |
| OAuth 2.1 | `Authorization: Bearer <access token>` | Applications acting for many Veritio users |
| Session | `Authorization: Bearer <session token>` | The dashboard, and local testing |

### Authorizing from the reference page

The "Authorize" button on [veritio.io/docs/api](https://veritio.io/docs/api) runs the real OAuth
flow against your own account, so you can try endpoints without minting a key.

Scalar cannot perform Dynamic Client Registration, which is the only way to obtain a `client_id`
from this server — so `src/api/v1/docs-oauth-client.ts` provisions one and publishes it. Three
details are load-bearing, and each was a separate failure before it was fixed:

- **`x-scalar-client-id` goes on the flow, not the scheme.** On the scheme it is silently ignored,
  and the button sends an empty `client_id`.
- **`x-usePkce` must be set to `SHA-256`.** Scalar defaults it to `no`, and a public client with no
  secret has nothing else protecting the authorization code.
- **`x-scalar-redirect-uri` is pinned explicitly.** Scalar otherwise defaults it to the current page
  URL, which varies with a trailing slash — and the registered value must match exactly.

Provisioning looks the client up in `oauthApplication` by name and redirect URI before registering,
so it is idempotent: one row per origin, however many times it runs. A cache alone was not enough —
it is per-process and does not survive a restart without Redis, so every cold start registered
another client.

The document is served with `Cache-Control: no-cache` and a strong `ETag`. That is deliberate rather
than conservative: it embeds this deployment's endpoint URLs and client id, so a stale copy points
readers at another deployment's authorization server with a client id it never issued — which
surfaces as a bare `invalid_client` and reads like a server bug. Revalidation costs a 304.

That client is public: no secret, PKCE required, and its redirect URI is pinned to this deployment's
own `/docs/api` page, so an authorization code can only ever come back to us. The reader still signs
in and passes the consent screen. If registration fails the button is simply absent — the page still
renders, and the API key path is unaffected.

A `401` carries the RFC 9728 `WWW-Authenticate` challenge pointing at
`/.well-known/oauth-protected-resource`, so a spec-compliant client can discover the authorization
server without being told out of band.

### Scopes

| Scope | Grants |
| --- | --- |
| `studies:read` | Read studies and their setup |
| `studies:write` | Create, edit and **launch** studies |
| `results:read` | Read results and participant responses |
| `panel:read` | Read the participant panel |
| `panel:write` | Edit the participant panel |
| `org:read` | Read workspace and membership information |
| `org:write` | Rename a workspace and manage its members |
| `export:write` | Create exports and generate insight reports |

Scopes gate *what kind* of operation a credential may attempt. They are not a substitute for the
per-resource role check: a key with `studies:write` still cannot touch a study its owner is only a
viewer on.

---

## Conventions

**Base URL** — `https://veritio.io/api/v1`. The version is in the path; breaking changes get a new
one.

**Objects** carry an `object` field naming their type. Collections come back as:

```json
{ "object": "list", "data": [], "has_more": false, "next_cursor": null, "total": 0 }
```

**Pagination** is cursor-based. Follow `next_cursor` until `has_more` is false. The cursor is opaque
— it encodes an offset today, and treating it as opaque is what lets that change to keyset
pagination without breaking clients.

**Errors** are RFC 9457 problem documents, served as `application/problem+json`:

```json
{
  "type": "https://veritio.io/docs/api/errors#insufficient_scope",
  "title": "Insufficient scope",
  "status": 403,
  "detail": "This credential is missing the \"studies:write\" scope.",
  "code": "insufficient_scope",
  "request_id": "req_5c1e…"
}
```

Branch on `code`. It is stable; `title` and `detail` are written for humans and may be reworded.
Validation failures add an `errors` array naming each field, prefixed by its surface
(`body.title`, `query.limit`, `path.study_id`).

`404` and `403` are used deliberately: a resource the caller cannot see at all returns `404`, so
that "does not exist" and "exists but is not yours" stay indistinguishable. `403` is reserved for
cases where the caller is already known to be a member and only the role is short — where naming the
missing role is both safe and the only actionable thing to say.

**Rate limits** are keyed per credential, not per IP, so one team's runaway script cannot exhaust an
office's shared address. Every response carries `RateLimit-Limit`, `RateLimit-Remaining` and
`RateLimit-Reset` (and the `X-RateLimit-*` spellings, which most existing client libraries read).

| Class | Limit | Applies to |
| --- | --- | --- |
| read | 600/min | `GET` endpoints |
| write | 120/min | Mutations |
| heavy | 20/min | Results, exports, insight reports, duplication |

**Idempotency** — send an `Idempotency-Key` header on any creating `POST`. A retry with the same key
replays the original response instead of creating a second resource; keys are remembered for 24
hours and scoped to your account. Reusing a key with a different body is a `409
idempotency_conflict` rather than a misleading replay.

The store is a TTL cache with no compare-and-set, so this reliably collapses a *retry* — the case it
exists for — while two genuinely simultaneous requests can still both pass the check. An in-flight
marker narrows that window and makes the second call a `409` rather than a silent duplicate.

**Request ids** — every response carries `X-Request-Id`. Supply your own to make your logs and ours
line up.

---

## Participant text is untrusted

Anything a participant typed — survey answers, card labels, transcripts, panel notes — is returned
wrapped:

```
<participant_text trust="none">I couldn&#x27;t find the returns page</participant_text>
```

These are strings written by arbitrary members of the public. If you feed API output to a language
model, leave the wrapper on: it is what makes an "ignore previous instructions" buried in a free-text
answer read as quoted data rather than as a new instruction. Strip it only after you have decided the
text is data.

---

## Launching is irreversible

`POST /studies/{study_id}/launch` exposes a study at a public URL and starts collecting data from
real people. It is its own endpoint rather than a `status` field on `PATCH /studies/{study_id}`
precisely so it is greppable in a review and gateable behind confirmation in a client.

Readiness is checked first. `updateStudy` will happily mark a study with no tasks as active — the
builder UI warns a human, but nothing enforces it — so the API refuses with `409 conflict` and names
each failing check. `override_validation: true` skips that, and should only be sent when a person has
seen the specific problems and chosen to proceed.

---

## Endpoint groups

| Group | What it covers |
| --- | --- |
| Meta | `GET /me` — credential introspection |
| Organizations | Workspaces and their members |
| Projects | The containers studies live in |
| Studies | Create, configure, validate, launch, close, duplicate, archive, delete |
| Content | Cards, categories, tree nodes, tasks, questions, designs |
| Participant flow | Welcome, consent, screening, identification, pre/post questions, thank-you |
| Sharing | Participation URL, revocable share links, public results |
| Results | Analysis, per-task metrics, participants, raw responses |
| Exports | Data exports and AI insight reports, both as pollable jobs |
| Panel | The recruitment CRM: participants, tags, segments |
| Collaboration | Team comments, study tags, session recording metadata |

### Content is one polymorphic resource

`/studies/{study_id}/content/{content_type}` rather than eleven bespoke resource trees. The eleven
content types differ by methodology, not by lifecycle — every one is an ordered list that gets
listed, replaced, appended to, patched and deleted from:

| Verb | Effect |
| --- | --- |
| `GET` | List the collection, in display order, with ids |
| `PUT` | Replace it wholesale — the main authoring path, and idempotent |
| `POST` | Append items |
| `PATCH` | Update named items by id |
| `DELETE .../{item_id}` | Remove one item |

The item shape does vary, so `GET /content-types` publishes the JSON Schema for each one. Fetch it
once and you can construct a valid write for a methodology you have never handled.

Building a tree in one call is worth knowing about: give each node a `temp_id` and reference it as
`parent_id` on its children, and the whole hierarchy lands in a single `PUT`.

---

## A complete example

```bash
BASE=https://veritio.io/api/v1
AUTH="Authorization: Bearer $VERITIO_API_KEY"

# 1. Find a project.
PROJECT=$(curl -s "$BASE/projects" -H "$AUTH" | jq -r '.data[0].id')

# 2. Create a tree test.
STUDY=$(curl -s "$BASE/studies" -H "$AUTH" -H 'content-type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"project_id\":\"$PROJECT\",\"title\":\"Support IA\",\"study_type\":\"tree_test\"}" \
  | jq -r '.id')

# 3. Build the tree in one call, wiring children to parents by temp_id.
curl -s -X PUT "$BASE/studies/$STUDY/content/tree_nodes" -H "$AUTH" \
  -H 'content-type: application/json' \
  -d '{"items":[
        {"temp_id":"acct","label":"Account"},
        {"temp_id":"orders","label":"Orders","parent_id":"acct"},
        {"temp_id":"returns","label":"Returns","parent_id":"orders"}
      ]}'

# 4. Check it is ready before exposing it to anyone.
curl -s "$BASE/studies/$STUDY/validation" -H "$AUTH" | jq '.ready, .launch_readiness'

# 5. Launch, then hand out the participation URL.
curl -s -X POST "$BASE/studies/$STUDY/launch" -H "$AUTH" \
  -H 'content-type: application/json' -d '{}' | jq -r '.participation_url'

# 6. Later: read the analysis.
curl -s "$BASE/studies/$STUDY/results" -H "$AUTH" | jq '.overview, .analysis'
```

---

## Testing and invariants

Two suites, both offline:

- `src/api/v1/registry.test.ts` — invariants over the whole registry. Every mutating route binds to
  a resource at `editor` or above and requires a write scope; every path parameter is declared;
  every `resource.argKey` is reachable from an input schema; the OpenAPI document describes exactly
  the registered routes and nothing else. These are the same invariants the MCP server holds over
  its tool registry.
- `src/api/http/handler.test.ts` — the pipeline end to end: an unauthenticated request never reaches
  a handler, a missing scope is refused before any database read, a member with the wrong role gets
  `403` while a non-member gets `404`, and idempotent replay works.

Three markers waive the declarative resource gate, and each is mechanically checked rather than taken
on trust:

| `mutates` | Means | Asserted by |
| --- | --- | --- |
| `derived` | Produces an artifact from data the caller can already read (export, report). Needs only `viewer`. | Must still name a resource |
| `owned` | Acts on a record belonging to the calling user, so there is no role to check. | Handler source must reference `ctx.userId` |
| `resolved` | The organization is resolved from membership inside the handler. | Handler source must call `resolveOrganizationId` |

```bash
cd apps/veritio
bunx vitest run src/api
```

---

## Adding an endpoint

1. Write the `RouteDefinition` in the right `src/api/v1/routes/` module. Business logic goes in
   `src/services/`; the route declares authorization and shapes the response.
2. Add it to `API_ROUTES` in `registry.ts`. That is the whole registration step — an unregistered
   route does not exist, which is a much better failure than one that exists undocumented.
3. Run `bunx vitest run src/api`. The invariants will tell you if the declaration is unsound.

The OpenAPI document and the published reference update themselves.
