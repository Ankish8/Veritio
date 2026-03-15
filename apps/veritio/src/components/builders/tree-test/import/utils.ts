import type { ParsedNode, ImportFormat } from './types'
import type { TreeNode } from '@veritio/study-types'

/**
 * Count total nodes in a parsed tree structure
 */
export function countNodes(nodes: ParsedNode[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + countNodes(node.children),
    0
  )
}

/**
 * Convert parsed nodes to flat TreeNode array for store
 */
export function flattenToTreeNodes(
  parsedNodes: ParsedNode[],
  studyId: string,
  parentId: string | null = null,
  startPosition: number = 0
): TreeNode[] {
  const result: TreeNode[] = []

  parsedNodes.forEach((node, index) => {
    const id = crypto.randomUUID()
    const treeNode: TreeNode = {
      id,
      study_id: studyId,
      parent_id: parentId,
      label: node.label,
      path: null,
      position: startPosition + index,
      created_at: new Date().toISOString(),
    }
    result.push(treeNode)

    // Add children recursively
    const childNodes = flattenToTreeNodes(node.children, studyId, id, 0)
    result.push(...childNodes)
  })

  return result
}

/**
 * Get format-specific placeholder text
 */
export function getPlaceholder(format: ImportFormat): string {
  switch (format) {
    case 'json':
      return `[
  {
    "label": "Home",
    "children": [
      { "label": "Products", "children": [
        { "label": "Category A" },
        { "label": "Category B" }
      ]},
      { "label": "About" },
      { "label": "Contact" }
    ]
  }
]`
    case 'csv':
      return `label,parent_label
Home,
Products,Home
Category A,Products
Category B,Products
About,Home
Contact,Home`
    case 'text':
    default:
      return `Home
	Products
		Category A
		Category B
	About
	Contact`
  }
}
