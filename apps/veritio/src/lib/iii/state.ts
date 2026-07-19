/**
 * MotiaStateManager implementation over the iii-state worker.
 *
 * Payload shapes mirror motia rc.26's runtime exactly (state::get/set/delete/
 * update with { scope, key, data|ops }) — the engine-side functions kept the
 * same contracts in 0.21. Live call sites are get/set/delete only (assistant
 * cancellation flag, analytics caches); the rest of the interface is
 * implemented faithfully for completeness.
 */

import type { IIIClient } from 'iii-sdk'
import type { MotiaStateManager, UpdateOp } from '../motia/types'

export function createStateManager(client: IIIClient): MotiaStateManager {
  const call = <T>(function_id: string, payload: unknown): Promise<T> =>
    client.trigger<unknown, T>({ function_id, payload })

  return {
    get<T>(scope: string, key: string): Promise<T | null> {
      return call<T | null>('state::get', { scope, key })
    },

    set<T>(scope: string, key: string, value: T): Promise<{ new_value: T; old_value: T | null }> {
      return call<{ new_value: T; old_value: T | null }>('state::set', { scope, key, data: value })
    },

    delete<T>(scope: string, key: string): Promise<T | null> {
      return call<T | null>('state::delete', { scope, key })
    },

    update(scope: string, key: string, ops: UpdateOp[]): Promise<unknown> {
      return call<unknown>('state::update', { scope, key, ops })
    },

    // state::list returns the scope's items as an array. The shim's paginated
    // signature predates the engine contract; no live call sites use it —
    // emulate cursor/limit client-side over the full list.
    async list(
      scope: string,
      options?: { cursor?: string; limit?: number }
    ): Promise<{ items: Array<{ key: string; value: unknown }>; cursor?: string }> {
      const raw = await call<unknown[]>('state::list', { scope })
      const items = (raw ?? []).map((entry) => {
        const e = entry as { id?: string; key?: string; value?: unknown; data?: unknown }
        return {
          key: e.key ?? e.id ?? '',
          value: e.value ?? e.data ?? entry,
        }
      })
      const start = options?.cursor ? Number(options.cursor) || 0 : 0
      const limit = options?.limit ?? items.length
      const page = items.slice(start, start + limit)
      const next = start + limit < items.length ? String(start + limit) : undefined
      return { items: page, cursor: next }
    },

    async getGroup(scope: string): Promise<Record<string, unknown>> {
      const { items } = await this.list(scope)
      return Object.fromEntries(items.map((i) => [i.key, i.value]))
    },

    // rc.26 implemented clear() as list + per-key delete; 0.21 keeps no
    // state::clear either, so the fallback is the contract.
    async clear(scope: string): Promise<void> {
      const { items } = await this.list(scope)
      await Promise.all(items.map((i) => this.delete(scope, i.key)))
    },
  }
}
