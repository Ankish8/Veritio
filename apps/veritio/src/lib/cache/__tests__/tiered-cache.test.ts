// @vitest-environment node
// (the L2 layer disables itself when `window` exists, so jsdom would turn
// every test into a no-op L1 test)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// In-memory stand-in for ioredis: enough surface for the L2 module
function createFakeRedis() {
  const store = new Map<string, { value: string; expiresAt: number }>()
  const subscribers: Array<(channel: string, message: string) => void> = []

  const client: any = {
    status: 'ready',
    store,
    subscribers,
    async set(key: string, value: string, _px: string, ttlMs: number) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      return 'OK'
    },
    async get(key: string) {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt < Date.now()) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    async pttl(key: string) {
      const entry = store.get(key)
      if (!entry) return -2
      return Math.max(0, entry.expiresAt - Date.now())
    },
    async del(...keys: string[]) {
      let n = 0
      for (const key of keys) {
        if (store.delete(key)) n++
      }
      return n
    },
    async scan(_cursor: string, _match: string, pattern: string) {
      // Simplified single-pass scan honoring the MATCH glob prefix
      const prefix = pattern.replace(/\*$/, '')
      const keys = Array.from(store.keys()).filter((k) => k.startsWith(prefix))
      return ['0', keys]
    },
    async publish(channel: string, message: string) {
      for (const fn of subscribers) fn(channel, message)
      return subscribers.length
    },
    async subscribe() {
      return 1
    },
    on(event: string, fn: any) {
      if (event === 'message') subscribers.push(fn)
      return client
    },
    async connect() {},
    disconnect() {},
    duplicate() {
      return client
    },
  }

  // scan signature used by the module: scan(cursor, 'MATCH', match, 'COUNT', n)
  const rawScan = client.scan
  client.scan = (cursor: string, _m: string, match: string) => rawScan(cursor, _m, match)

  return client
}

const fakeRedis = createFakeRedis()

describe('tiered cache (L1 + Redis L2)', () => {
  beforeEach(() => {
    vi.resetModules()
    fakeRedis.store.clear()
    fakeRedis.subscribers.length = 0
    process.env.REDIS_URL = 'redis://localhost:6379'
    delete process.env.CACHE_REDIS_L2_DISABLED
  })

  afterEach(() => {
    delete process.env.REDIS_URL
  })

  // Inject the fake client before memory-cache's module-load init runs
  // ('#redis-client' resolves differently across environments, so module
  // mocking is brittle — dependency injection is deterministic)
  async function loadCache() {
    const l2 = await import('../redis-l2')
    l2.__setRedisClientFactoryForTests(() => fakeRedis)
    const mod = await import('../memory-cache')
    return mod.cache
  }

  it('keeps sync get/set semantics (L1)', async () => {
    const cache = await loadCache()
    cache.set('k1', { a: 1 }, 60_000)
    expect(cache.get<{ a: number }>('k1')).toEqual({ a: 1 })
    expect(cache.get('missing')).toBeNull()
  })

  it('mirrors set into Redis and getTiered reads it back after L1 loss', async () => {
    const cache = await loadCache()
    cache.set('k2', { hello: 'world' }, 60_000)
    // allow the fire-and-forget SET to settle
    await new Promise((r) => setImmediate(r))
    expect(fakeRedis.store.has('veritio:cache:k2')).toBe(true)

    // Simulate a restart: L1 gone, Redis still has the value
    cache.localDelete('k2')
    expect(cache.get('k2')).toBeNull()
    const value = await cache.getTiered<{ hello: string }>('k2')
    expect(value).toEqual({ hello: 'world' })
    // L2 hit hydrated L1
    expect(cache.get('k2')).toEqual({ hello: 'world' })
  })

  it('getTiered returns null on full miss', async () => {
    const cache = await loadCache()
    expect(await cache.getTiered('nope')).toBeNull()
  })

  it('delete removes from L1 and Redis', async () => {
    const cache = await loadCache()
    cache.set('k3', 'v', 60_000)
    await new Promise((r) => setImmediate(r))
    cache.delete('k3')
    await new Promise((r) => setImmediate(r))
    expect(cache.get('k3')).toBeNull()
    expect(await cache.getTiered('k3')).toBeNull()
    expect(fakeRedis.store.has('veritio:cache:k3')).toBe(false)
  })

  it('deletePattern removes matching keys from L1 and Redis', async () => {
    const cache = await loadCache()
    cache.set('participate:abc', 1, 60_000)
    cache.set('participate:def', 2, 60_000)
    cache.set('other:xyz', 3, 60_000)
    await new Promise((r) => setImmediate(r))

    cache.deletePattern('participate:')
    await new Promise((r) => setImmediate(r))

    expect(cache.get('participate:abc')).toBeNull()
    expect(cache.get('participate:def')).toBeNull()
    expect(cache.get('other:xyz')).toBe(3)
    expect(fakeRedis.store.has('veritio:cache:participate:abc')).toBe(false)
    expect(fakeRedis.store.has('veritio:cache:other:xyz')).toBe(true)
  })

  it('drops L1 entries when another instance broadcasts an invalidation', async () => {
    const cache = await loadCache()
    cache.set('k4', 'v', 60_000)
    await new Promise((r) => setImmediate(r))

    // Simulate a broadcast from ANOTHER instance (publish directly)
    await fakeRedis.publish(
      'veritio:cache:invalidate',
      JSON.stringify({ type: 'key', value: 'k4' })
    )
    expect(cache.get('k4')).toBeNull()
  })

  it('non-serializable values degrade to L1-only without throwing', async () => {
    const cache = await loadCache()
    const circular: any = {}
    circular.self = circular
    expect(() => cache.set('k5', circular, 60_000)).not.toThrow()
    expect(cache.get('k5')).toBe(circular)
    await new Promise((r) => setImmediate(r))
    expect(fakeRedis.store.has('veritio:cache:k5')).toBe(false)
  })

  it('stays L1-only when Redis is not configured', async () => {
    delete process.env.REDIS_URL
    vi.resetModules()
    const mod = await import('../memory-cache')
    const cache = mod.cache
    cache.set('k6', 'v', 60_000)
    await new Promise((r) => setImmediate(r))
    expect(fakeRedis.store.has('veritio:cache:k6')).toBe(false)
    expect(await cache.getTiered('k6')).toBe('v') // still served from L1
  })
})
