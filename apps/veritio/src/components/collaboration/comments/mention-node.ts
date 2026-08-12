import { Node, mergeAttributes } from '@tiptap/core'
import { formatMention } from '@/lib/comments/mention-format'

/**
 * An @mention as a single atomic inline node.
 *
 * Atomic matters: a mention is one thing, so backspace removes the whole chip
 * rather than eating it one character at a time and leaving `@[Ada Lovelac`
 * behind — which is exactly what the previous hand-rolled contentEditable did,
 * silently corrupting the wire format.
 *
 * Follows the same Node.create shape as the existing pipingReference extension
 * rather than pulling in @tiptap/suggestion; the `@` trigger and picker are
 * handled by the composer, reusing the popover UI people already know.
 */

export interface MentionAttributes {
  id: string
  label: string
}

export const MentionNode = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mention-id'),
        renderHTML: (attributes) =>
          attributes.id ? { 'data-mention-id': attributes.id } : {},
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mention-label'),
        renderHTML: (attributes) =>
          attributes.label ? { 'data-mention-label': attributes.label } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-mention-id]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class:
          'inline-flex items-center rounded px-1 py-0.5 text-sm font-medium bg-foreground/10 text-foreground',
      }),
      `@${node.attrs.label ?? ''}`,
    ]
  },

  /**
   * What the node contributes to `editor.getText()`. Returning the wire format
   * here is what makes serialization a one-liner in the composer instead of a
   * DOM walk.
   */
  renderText({ node }) {
    return formatMention(node.attrs.label ?? '', node.attrs.id ?? '')
  },
})
