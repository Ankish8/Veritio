# Self-hosting operations

Veritio supports Linux container hosts through the repository's Docker Compose file. Supabase remains external, and live website testing additionally requires the separately deployed Cloudflare Worker under `workers/`.

## Supported releases

- Production support applies to the latest tagged minor release and its latest patch.
- Security fixes are backported to the current minor release when practical. Older minors must upgrade.
- `main` is development code, not a supported production update channel.
- Bun 1.3.x, Docker Engine 27+, Docker Compose v2, PostgreSQL 15+, and Redis 7 are the current tested baseline.

Every release must publish database notes, required environment changes, image/runtime changes, and known breaking changes. A release is not self-host-ready until the clean-install smoke test covers migration, account creation, study creation, first publication, participant completion, and results retrieval.

## Production checklist

1. Pin a Veritio release tag and record the exact commit SHA.
2. Use TLS for the public frontend, Yjs WebSocket, stream WebSocket, Supabase, and Redis when Redis is external.
3. Generate independent values for `BETTER_AUTH_SECRET`, `PDF_RENDER_SECRET`, `REDIS_PASSWORD`, `YJS_INTERNAL_API_KEY`, `STREAM_TOKEN_SECRET`, and any OAuth state secret. Never reuse provider keys as signing secrets.
4. Keep `SUPABASE_SERVICE_ROLE_KEY`, database URLs, Redis credentials, provider keys, and signing secrets out of images and source control.
5. Restrict ports 4000 and 4002 to the application network when an ingress can route them internally. Expose 4001 publicly. Expose 4004 only when browser streams are enabled.
6. Set public URLs before building the frontend image; rebuild after any `NEXT_PUBLIC_*` change.
7. Require readiness checks from backend `/api/health`, frontend `/health/ready`, Yjs `/health/ready`, Redis `PING`, and the live-test worker `/health/ready` when enabled.
8. Configure outbound email, AI, Figma, R2, Deepgram, DeepL, Google, Composio, PostHog, billing, and Cloudflare using the operator's own accounts. Features stay unavailable when their provider credentials are absent.

## Backup

Before every upgrade:

```bash
# Supabase/PostgreSQL: use the direct/session connection, not a transaction pooler
pg_dump --format=custom --no-owner --no-privileges \
  "$DATABASE_DIRECT_URL" > "veritio-$(date +%Y%m%d-%H%M%S).dump"

# Queue and Redis volumes (stop writers first for a consistent filesystem copy)
docker compose stop backend frontend yjs
docker run --rm -v veritio_backend-queue:/source:ro -v "$PWD/backups:/backup" \
  alpine tar czf /backup/backend-queue.tgz -C /source .
docker run --rm -v veritio_redis_data:/source:ro -v "$PWD/backups:/backup" \
  alpine tar czf /backup/redis-data.tgz -C /source .
docker compose start redis backend yjs frontend
```

Also back up Supabase Storage buckets and external R2 objects according to those providers' procedures. Database-only backups do not contain recordings or uploaded assets.

Test restoration on an isolated environment. An untested backup is not a rollback plan.

## Update and rollback

1. Read the target release notes and take verified backups.
2. Check out the exact tag.
3. Run `bun run self-host:migrate:status`, then `bun run self-host:migrate` from `apps/veritio` with `DATABASE_DIRECT_URL`.
4. Rebuild and start with `docker compose up -d --build`.
5. Wait for every readiness check, then execute the release smoke test.

Application images and volumes can be rolled back independently only when release notes say the database change is backward compatible. Database migrations are forward-only by default; restore the matching database and object-storage backups when a migration is not backward compatible.

## Failure signals

- Backend readiness checks database, Redis, writable queue persistence, and the browser stream listener.
- Frontend readiness verifies the backend readiness contract.
- Yjs readiness verifies signing secrets and its durable Supabase table.
- Worker readiness verifies required secrets and backend reachability.

Do not route traffic based only on liveness endpoints. Liveness means the process can answer; readiness means required dependencies are available.
