/**
 * Local IndexedDB and the remote WebSocket are independent Yjs update sources.
 *
 * A field must not bootstrap database content into an empty Yjs type until both
 * sources have finished their initial sync. Otherwise the first source can make
 * a temporarily empty document look authoritative; inserting the database value
 * at that point causes a later identical update from the other source to merge
 * as duplicated CRDT content.
 */
export function hasCompletedInitialSync(
  isIndexedDbSynced: boolean,
  isWebSocketSynced: boolean
): boolean {
  return isIndexedDbSynced && isWebSocketSynced
}
