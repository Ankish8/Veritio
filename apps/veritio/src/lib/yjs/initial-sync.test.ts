import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { hasCompletedInitialSync } from '@veritio/yjs/lib'

function seedEmptyTextWhenReady(doc: Y.Doc, ready: boolean, fieldPath: string, value: string) {
  const text = doc.getText(fieldPath)
  if (ready && text.length === 0) {
    text.insert(0, value)
  }
}

function seedEmptyFragmentWhenReady(
  doc: Y.Doc,
  ready: boolean,
  fieldPath: string,
  value: string
) {
  const fragment = doc.getXmlFragment(fieldPath)
  if (!ready || fragment.length > 0) return

  const paragraph = new Y.XmlElement('paragraph')
  const text = new Y.XmlText()
  text.insert(0, value)
  paragraph.insert(0, [text])
  fragment.insert(0, [paragraph])
}

describe('hasCompletedInitialSync', () => {
  it('waits for both IndexedDB and WebSocket before allowing field bootstrap', () => {
    expect(hasCompletedInitialSync(false, false)).toBe(false)
    expect(hasCompletedInitialSync(true, false)).toBe(false)
    expect(hasCompletedInitialSync(false, true)).toBe(false)
    expect(hasCompletedInitialSync(true, true)).toBe(true)
  })

  it('prevents late server hydration from duplicating database content', () => {
    const fieldPath = 'meta.title'
    const initialValue = 'E-Commerce Homepage Card Sort'
    const serverDoc = new Y.Doc()
    serverDoc.getText(fieldPath).insert(0, initialValue)
    const serverUpdate = Y.encodeStateAsUpdate(serverDoc)

    // Reproduce the old OR readiness behavior: IndexedDB finishes with an
    // empty cache, so the client seeds before the server update arrives.
    const unsafeClient = new Y.Doc()
    const localCacheSynced = true
    const websocketSynced = false
    seedEmptyTextWhenReady(
      unsafeClient,
      localCacheSynced || websocketSynced,
      fieldPath,
      initialValue
    )
    Y.applyUpdate(unsafeClient, serverUpdate)
    expect(unsafeClient.getText(fieldPath).toString()).toBe(initialValue + initialValue)

    // With full-sync readiness, the empty local cache cannot trigger a seed.
    // Once the server update arrives, the field is non-empty and is not seeded.
    const safeClient = new Y.Doc()
    seedEmptyTextWhenReady(
      safeClient,
      hasCompletedInitialSync(true, false),
      fieldPath,
      initialValue
    )
    Y.applyUpdate(safeClient, serverUpdate)
    seedEmptyTextWhenReady(
      safeClient,
      hasCompletedInitialSync(true, true),
      fieldPath,
      initialValue
    )
    expect(safeClient.getText(fieldPath).toString()).toBe(initialValue)
  })

  it('keeps late server hydration from duplicating a rich-text fragment', () => {
    const fieldPath = 'meta.purpose'
    const initialValue = 'Validate the top-level category structure.'
    const serverDoc = new Y.Doc()
    seedEmptyFragmentWhenReady(serverDoc, true, fieldPath, initialValue)
    const serverUpdate = Y.encodeStateAsUpdate(serverDoc)

    const clientDoc = new Y.Doc()
    seedEmptyFragmentWhenReady(
      clientDoc,
      hasCompletedInitialSync(true, false),
      fieldPath,
      initialValue
    )
    Y.applyUpdate(clientDoc, serverUpdate)
    seedEmptyFragmentWhenReady(
      clientDoc,
      hasCompletedInitialSync(true, true),
      fieldPath,
      initialValue
    )

    const fragment = clientDoc.getXmlFragment(fieldPath)
    expect(fragment.length).toBe(1)
    expect(fragment.toString()).toContain(initialValue)
  })
})
