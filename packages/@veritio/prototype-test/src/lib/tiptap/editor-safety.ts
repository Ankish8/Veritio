import type { Editor } from '@tiptap/react'

/**
 * Tiptap's `Editor.destroy()` nulls `editor.schema` and the command manager. Components that
 * keep an editor in state (AI refine, menu bars) can render once more with the destroyed
 * instance while the field switches questions, and `getText()` / `can()` then throw
 * "Cannot read properties of null (reading 'nodes')" during render.
 */
export function isEditorUsable(editor: Editor | null | undefined): editor is Editor {
  return !!editor && !!editor.schema
}

export function getEditorTextSafe(editor: Editor | null | undefined): string {
  if (!isEditorUsable(editor)) return ''
  try {
    return editor.getText()
  } catch {
    return ''
  }
}
