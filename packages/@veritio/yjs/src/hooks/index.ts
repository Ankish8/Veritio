/**
 * @veritio/yjs - Hooks
 *
 * Generic Yjs collaboration hooks for real-time editing.
 */

// Core document and awareness hooks
export { useYjsDocument } from './use-yjs-document'
export { useYjsAwareness } from './use-yjs-awareness'

// Data structure hooks
export { useYjsText } from './use-yjs-text'
export { useYjsArray } from './use-yjs-array'
export { useYjsMap } from './use-yjs-map'

// Presence hooks (require YjsProvider context)
export { useCollaborativePresence, useAllCollaborativePresence } from './use-collaborative-presence'
export { useCollaborativeField } from './use-collaborative-field'
export { useTabPresence } from './use-tab-presence'
