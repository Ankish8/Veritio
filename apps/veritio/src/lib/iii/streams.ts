/**
 * ctx.streams implementation over the iii-stream worker.
 *
 * A Proxy so `ctx.streams.<anyName>` yields a memoized stream handle (the
 * shim types streams as Record<string, MotiaStreamInstance>). Payload shapes
 * mirror motia rc.26's runtime (stream::get/set/delete/update/list/send with
 * { stream_name, group_id, item_id, ... }).
 *
 * Note: the shim's getGroup() maps to the engine's stream::list — rc.26's
 * Stream class never had getGroup, so the one caller
 * (cleanup-participant-activity cron) was silently broken until now.
 */

import type { IIIClient } from 'iii-sdk'
import type { MotiaStreamInstance, StreamEvent, StreamEventChannel, UpdateOp } from '../motia/types'

function createStreamHandle(client: IIIClient, streamName: string): MotiaStreamInstance {
  const call = <T>(function_id: string, payload: unknown): Promise<T> =>
    client.trigger<unknown, T>({ function_id, payload })

  return {
    get<T>(groupId: string, id: string): Promise<T | null> {
      return call<T | null>('stream::get', { stream_name: streamName, group_id: groupId, item_id: id })
    },

    set<T>(groupId: string, id: string, data: T): Promise<unknown> {
      return call<unknown>('stream::set', { stream_name: streamName, group_id: groupId, item_id: id, data })
    },

    update(groupId: string, id: string, ops: UpdateOp[]): Promise<unknown> {
      return call<unknown>('stream::update', { stream_name: streamName, group_id: groupId, item_id: id, ops })
    },

    delete(groupId: string, id: string): Promise<unknown> {
      return call<unknown>('stream::delete', { stream_name: streamName, group_id: groupId, item_id: id })
    },

    async getGroup(groupId: string): Promise<unknown[]> {
      const items = await call<unknown[]>('stream::list', { stream_name: streamName, group_id: groupId })
      return items ?? []
    },

    async send<T>(channel: StreamEventChannel, event: StreamEvent<T>): Promise<void> {
      await call<unknown>('stream::send', {
        stream_name: streamName,
        group_id: channel.groupId,
        id: channel.id,
        type: event.type,
        data: event.data,
      })
    },
  }
}

export function createStreamsProxy(client: IIIClient): Record<string, MotiaStreamInstance> {
  const handles = new Map<string, MotiaStreamInstance>()
  return new Proxy({} as Record<string, MotiaStreamInstance>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      let handle = handles.get(prop)
      if (!handle) {
        handle = createStreamHandle(client, prop)
        handles.set(prop, handle)
      }
      return handle
    },
  })
}
