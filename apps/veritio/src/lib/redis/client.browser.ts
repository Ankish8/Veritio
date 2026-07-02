/**
 * Browser build of '#redis-client' (see package.json "imports").
 *
 * The cache's Redis L2 layer is reachable from client bundles because some
 * client components import services that use the shared memory cache. ioredis
 * needs Node built-ins (dns, net) that can't be bundled for the browser, so
 * browser bundles resolve this module instead of ./client.ts. The L2 layer is
 * disabled in the browser (typeof window guard + no REDIS_URL), so none of
 * this ever executes — it only has to satisfy the bundler and the types.
 */

import type Redis from 'ioredis'

export function getRedisClient(): Redis {
  throw new Error('Redis is not available in the browser')
}

export async function closeRedisClient(): Promise<void> {}

export function isRedisConnected(): boolean {
  return false
}
