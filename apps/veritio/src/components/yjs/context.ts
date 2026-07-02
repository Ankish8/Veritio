'use client'
/**
 * Lightweight access to the Yjs context — no runtime yjs/y-websocket imports.
 *
 * Presence components (avatars, sync indicator, tab presence) render on
 * results/analysis routes where no YjsProvider is mounted; importing them via
 * yjs-provider would drag the whole collaboration runtime into those bundles.
 * The context object is the same one YjsProvider provides, so behavior is
 * identical wherever a provider IS mounted.
 */
export {
  YjsContext,
  useYjs,
  useYjsOptional,
  type YjsContextValue,
} from '@veritio/yjs/components/yjs-context'
