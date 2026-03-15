import type { ParsedNode, JsonTreeNode } from './types'

/**
 * Find duplicate labels in a tree structure (case-insensitive)
 */
export function findDuplicateLabels(nodes: ParsedNode[]): string[] {
  const labelCounts = new Map<string, number>()

  function countLabels(nodeList: ParsedNode[]) {
    for (const node of nodeList) {
      const lower = node.label.toLowerCase()
      labelCounts.set(lower, (labelCounts.get(lower) || 0) + 1)
      if (node.children.length > 0) {
        countLabels(node.children)
      }
    }
  }

  countLabels(nodes)

  return Array.from(labelCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([label]) => label)
}

/**
 * Parse indented text format into tree structure
 * Uses tabs or spaces (2 spaces = 1 level) for indentation
 */
export function parseTreeText(text: string): ParsedNode[] {
  const lines = text.split('\n').filter((line) => line.trim())
  const root: ParsedNode[] = []
  const stack: { node: ParsedNode; level: number }[] = []

  for (const line of lines) {
    // Count leading tabs or spaces (2 spaces = 1 tab)
    const leadingWhitespace = line.match(/^[\t ]*/)?.[0] || ''
    const tabCount = leadingWhitespace.split('\t').length - 1
    const spaceCount = (leadingWhitespace.match(/ /g) || []).length
    const level = tabCount + Math.floor(spaceCount / 2)
    const label = line.trim()

    if (!label) continue

    const newNode: ParsedNode = { label, level, children: [] }

    // Find parent
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(newNode)
    } else {
      stack[stack.length - 1].node.children.push(newNode)
    }

    stack.push({ node: newNode, level })
  }

  return root
}

/**
 * Parse JSON format with nested hierarchy
 * Expects: [{ label: "...", children: [...] }, ...]
 */
export function parseTreeJSON(text: string): ParsedNode[] {
  const data = JSON.parse(text)

  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of tree nodes')
  }

  function convertJsonNode(node: JsonTreeNode, level: number = 0): ParsedNode {
    if (!node.label || typeof node.label !== 'string') {
      throw new Error('Each node must have a "label" string property')
    }

    const children = Array.isArray(node.children)
      ? node.children.map((child) => convertJsonNode(child, level + 1))
      : []

    return {
      label: node.label.trim(),
      level,
      children,
    }
  }

  return data.map((node) => convertJsonNode(node, 0))
}

/**
 * Parse tree structure based on format
 */
export function parseByFormat(text: string, format: 'text' | 'json' | 'csv'): ParsedNode[] {
  switch (format) {
    case 'json':
      return parseTreeJSON(text)
    case 'csv':
      return parseTreeCSV(text)
    case 'text':
    default:
      return parseTreeText(text)
  }
}

/**
 * Parse CSV format with flat structure
 * Format: label,parent_label (parent_label empty for root nodes)
 */
export function parseTreeCSV(text: string): ParsedNode[] {
  const lines = text.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return []

  // Check if first line is header
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('label') || firstLine.includes('parent')
  const dataLines = hasHeader ? lines.slice(1) : lines

  // Parse CSV rows
  interface CsvRow {
    label: string
    parentLabel: string | null
  }

  const rows: CsvRow[] = []
  for (const line of dataLines) {
    const firstComma = line.indexOf(',')
    if (firstComma === -1) {
      // No comma - single column, treat as root node
      const label = line.trim().replace(/^["']|["']$/g, '')
      if (label) rows.push({ label, parentLabel: null })
    } else {
      const label = line.slice(0, firstComma).trim().replace(/^["']|["']$/g, '')
      const parentLabel = line.slice(firstComma + 1).trim().replace(/^["']|["']$/g, '') || null
      if (label) rows.push({ label, parentLabel })
    }
  }

  if (rows.length === 0) return []

  // Build tree from flat list
  const nodeMap = new Map<string, ParsedNode>()
  const rootNodes: ParsedNode[] = []

  // First pass: create all nodes
  for (const row of rows) {
    if (!nodeMap.has(row.label)) {
      nodeMap.set(row.label, { label: row.label, level: 0, children: [] })
    }
  }

  // Second pass: build hierarchy
  for (const row of rows) {
    const node = nodeMap.get(row.label)!
    if (row.parentLabel && nodeMap.has(row.parentLabel)) {
      const parent = nodeMap.get(row.parentLabel)!
      if (!parent.children.some((c) => c.label === node.label)) {
        parent.children.push(node)
        node.level = parent.level + 1
      }
    } else if (!row.parentLabel) {
      if (!rootNodes.some((r) => r.label === node.label)) {
        rootNodes.push(node)
      }
    }
  }

  // Update levels recursively
  function updateLevels(nodes: ParsedNode[], level: number) {
    for (const node of nodes) {
      node.level = level
      updateLevels(node.children, level + 1)
    }
  }
  updateLevels(rootNodes, 0)

  return rootNodes
}
