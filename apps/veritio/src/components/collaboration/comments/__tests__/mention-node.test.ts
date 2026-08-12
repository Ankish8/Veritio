/**
 * The composer's serialization contract.
 *
 * The whole point of the Tiptap swap is that `editor.getText()` produces the
 * exact `@[Name](userId)` wire format the API and database expect. If the
 * mention node's renderText is not picked up by getText, mentions would
 * serialize to nothing and the mentions column would silently go empty again —
 * the original defect, reintroduced. These tests pin that down.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { MentionNode } from '../mention-node'
import { extractMentionIds, extractMentions } from '@/lib/comments/mention-format'

const UUID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

function makeEditor(content?: Record<string, unknown>) {
  return new Editor({
    extensions: [StarterKit.configure({ link: false }), MentionNode],
    content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
  })
}

function paragraph(...nodes: Array<Record<string, unknown>>) {
  return { type: 'doc', content: [{ type: 'paragraph', content: nodes }] }
}

describe('mention node serialization', () => {
  it('serializes a mention to the wire format', () => {
    const editor = makeEditor(
      paragraph(
        { type: 'text', text: 'hey ' },
        { type: 'mention', attrs: { id: UUID, label: 'Ada Lovelace' } },
        { type: 'text', text: ' look' }
      )
    )

    expect(editor.getText()).toBe(`hey @[Ada Lovelace](${UUID}) look`)
    editor.destroy()
  })

  it('round-trips through the shared parser', () => {
    const editor = makeEditor(
      paragraph({ type: 'mention', attrs: { id: UUID, label: 'Ada Lovelace' } })
    )

    const serialized = editor.getText()
    expect(extractMentionIds(serialized)).toEqual([UUID])
    expect(extractMentions(serialized)[0]).toMatchObject({ name: 'Ada Lovelace', userId: UUID })
    editor.destroy()
  })

  it('handles several mentions in one comment', () => {
    const other = 'b1a7f3c2-1111-4a2b-9c3d-0e5f6a7b8c9d'
    const editor = makeEditor(
      paragraph(
        { type: 'mention', attrs: { id: UUID, label: 'Ada' } },
        { type: 'text', text: ' and ' },
        { type: 'mention', attrs: { id: other, label: 'Grace' } }
      )
    )

    expect(extractMentionIds(editor.getText())).toEqual([UUID, other])
    editor.destroy()
  })

  it('is atomic, so deleting a mention removes it whole', () => {
    const editor = makeEditor(
      paragraph({ type: 'mention', attrs: { id: UUID, label: 'Ada Lovelace' } })
    )

    // Select everything and delete — a non-atomic node could leave fragments
    // of the `@[...](...)` markup behind and corrupt the wire format.
    editor.commands.selectAll()
    editor.commands.deleteSelection()

    expect(editor.getText()).toBe('')
    expect(extractMentionIds(editor.getText())).toEqual([])
    editor.destroy()
  })

  it('emits no mention markup for plain text', () => {
    const editor = makeEditor(paragraph({ type: 'text', text: 'no mentions @notreal here' }))

    expect(extractMentionIds(editor.getText())).toEqual([])
    editor.destroy()
  })

  it('preserves a display name containing spaces and punctuation', () => {
    const editor = makeEditor(
      paragraph({ type: 'mention', attrs: { id: UUID, label: 'J. R. R. Tolkien' } })
    )

    expect(extractMentions(editor.getText())[0].name).toBe('J. R. R. Tolkien')
    editor.destroy()
  })
})
