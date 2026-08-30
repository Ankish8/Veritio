import "server-only";

import { handleApiRequest } from "@/api/http/handler";

/**
 * The public API, served from one catch-all route.
 *
 * A file per endpoint would be the idiomatic App Router layout, but Next.js
 * route files are not enumerable at runtime — and the OpenAPI document has to
 * be generated from the same declarations the runtime dispatches on, or it
 * drifts. So the registry in `src/api/v1/registry.ts` is the source of truth
 * and this file is a thin adapter onto it.
 *
 * Excluded from the `/api/*` backend proxy in `next.config.ts`; without that
 * entry every request here would be forwarded to the iii engine and 404.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleApiRequest;
export const POST = handleApiRequest;
export const PATCH = handleApiRequest;
export const PUT = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
