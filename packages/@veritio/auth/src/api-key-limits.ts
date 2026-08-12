/**
 * Bounds on an API key's name.
 *
 * Deliberately its own module with no imports: `app/api/mcp-keys/route.ts`
 * needs these numbers during request validation but must not pull in the auth
 * instance (and therefore `pg`) to get them.
 *
 * They are enforced twice — the `apiKey()` plugin checks them inside Better
 * Auth, and the route checks them first so the caller gets a message naming the
 * limit. Both sides must read from here. When they disagreed, Better Auth's
 * default of 32 silently undercut the route's 80, so a name in that gap passed
 * the route, threw `INVALID_NAME_LENGTH` inside the plugin, and reached the UI
 * as an opaque 500.
 */
export const API_KEY_NAME_MIN_LENGTH = 1;
export const API_KEY_NAME_MAX_LENGTH = 80;
