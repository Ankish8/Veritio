import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { getEditorTextSafe, isEditorUsable } from '@veritio/prototype-test/lib/tiptap/editor-safety'

describe('editor-safety', () => {
  it('reads text from a live editor', () => {
    const editor = new Editor({ extensions: [StarterKit], content: '<p>hello</p>' })
    expect(isEditorUsable(editor)).toBe(true)
    expect(getEditorTextSafe(editor as never)).toBe('hello')
    editor.destroy()
  })

  it('does not throw for a destroyed editor, which nulls schema', () => {
    const editor = new Editor({ extensions: [StarterKit], content: '<p>hello</p>' })
    editor.destroy()
    expect(() => editor.getText()).toThrow(/nodes/)
    expect(isEditorUsable(editor)).toBe(false)
    expect(getEditorTextSafe(editor as never)).toBe('')
  })

  it('handles null', () => {
    expect(getEditorTextSafe(null)).toBe('')
  })
})
