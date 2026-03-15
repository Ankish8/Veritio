import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { ComponentType } from 'react'

 
type AnyComponent = ComponentType<any>

export interface PipingReferenceOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pipingReference: {
      /**
       * Insert a piping reference node
       */
      setPipingReference: (attributes: {
        questionId: string
        questionTitle: string
      }) => ReturnType
    }
  }
}

/**
 * PipingReference Node Extension
 *
 * Creates an inline, atomic node that displays answer references as styled chips.
 * The node stores the question ID and a preview of the question title for display.
 *
 * Serializes to HTML that the existing piping resolution system can parse:
 * <span data-piping-reference="true" data-question-id="xxx">Question preview</span>
 *
 * The player-side `resolveAllPipingReferences()` function will replace these
 * with actual participant answers at render time.
 */
export const PipingReference = Node.create<PipingReferenceOptions>({
  name: 'pipingReference',

  group: 'inline',

  inline: true,

  // Atomic = non-editable, treated as single unit
  atom: true,

  // Selectable as a single unit
  selectable: true,

  // Can be dragged
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      questionId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-question-id'),
        renderHTML: (attributes) => ({
          'data-question-id': attributes.questionId,
        }),
      },
      questionTitle: {
        default: '',
        parseHTML: (element) => element.textContent || '',
        // Title is stored in the text content, not as an attribute
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-piping-reference]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-piping-reference': 'true',
          'data-question-id': node.attrs.questionId,
          class: 'piping-reference',
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      node.attrs.questionTitle || 'Previous answer',
    ]
  },

  addCommands() {
    return {
      setPipingReference:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Backspace at start of node should delete it
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isReference = false
          const { selection } = state
          const { empty, anchor } = selection

          if (!empty) {
            return false
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node) => {
            if (node.type.name === this.name) {
              isReference = true
            }
          })

          if (isReference) {
            // Delete the reference node
            tr.delete(anchor - 1, anchor)
            return true
          }

          return false
        }),
    }
  },

  // NodeView will be set via createPipingReferenceExtension
  // This base extension doesn't render anything by default
  addNodeView() {
    // Return a simple placeholder that will be overridden
    return () => ({
      dom: document.createElement('span'),
    })
  },
})

/**
 * Create a configured PipingReference extension with a custom NodeView component
 *
 * @param NodeViewComponent - React component that receives TipTap NodeViewProps
 */
export function createPipingReferenceExtension(NodeViewComponent: AnyComponent) {
  return PipingReference.extend({
    addNodeView() {
      return ReactNodeViewRenderer(NodeViewComponent)
    },
  })
}
