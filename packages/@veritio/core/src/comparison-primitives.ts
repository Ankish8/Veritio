/**
 * Comparison Primitives
 *
 * Shared, pure comparison functions used by both the survey rules engine
 * and the screening condition evaluator. These have no framework dependencies.
 */

// =============================================================================
// Numeric Comparisons
// =============================================================================

/**
 * Compare two numbers using the given operator string.
 * Supports: equals, not_equals, greater_than, less_than,
 * greater_than_or_equals, less_than_or_equals, between, in_list, not_in_list,
 * and variable-prefixed aliases.
 */
export function compareNumeric(
  value: number,
  target: number,
  operator: string,
  options?: { allTargets?: number[]; range?: { min: number; max: number } }
): boolean {
  switch (operator) {
    case 'equals':
    case 'variable_equals':
    case 'is':
      return value === target;
    case 'not_equals':
    case 'is_not':
      return value !== target;
    case 'greater_than':
    case 'variable_greater':
      return value > target;
    case 'less_than':
    case 'variable_less':
      return value < target;
    case 'greater_than_or_equals':
      return value >= target;
    case 'less_than_or_equals':
      return value <= target;
    case 'between':
      if (options?.range) {
        return value >= options.range.min && value <= options.range.max;
      }
      return false;
    case 'in_list':
      return options?.allTargets?.includes(value) ?? value === target;
    case 'not_in_list':
      return options?.allTargets ? !options.allTargets.includes(value) : value !== target;
    case 'contains':
      // 'contains' on a numeric is treated as equality
      return value === target;
    default:
      return false;
  }
}

// =============================================================================
// String Comparisons
// =============================================================================

/**
 * Compare a string value against one or more comparison strings.
 * Both sides are normalized (lowercased, trimmed) before comparison.
 */
export function compareStrings(
  value: string,
  comparisonValues: string[],
  operator: string
): boolean {
  const normalized = value.toLowerCase().trim();
  const normalizedComparisons = comparisonValues.map((v) => String(v).toLowerCase().trim());

  switch (operator) {
    case 'equals':
    case 'in_list':
    case 'is':
      return normalizedComparisons.includes(normalized);
    case 'not_equals':
    case 'not_in_list':
    case 'is_not':
      return !normalizedComparisons.includes(normalized);
    case 'contains':
      return normalizedComparisons.some((v) => normalized.includes(v));
    case 'not_contains':
      return !normalizedComparisons.some((v) => normalized.includes(v));
    default:
      return false;
  }
}

// =============================================================================
// Option ID Comparisons (for single/multi choice)
// =============================================================================

/**
 * Compare selected option ID(s) against target values.
 * Works for both single-choice (one selected) and multi-choice (many selected).
 */
export function compareOptionIds(
  selectedIds: string[],
  targetIds: string[],
  operator: string
): boolean {
  switch (operator) {
    case 'equals':
    case 'in_list':
    case 'is':
      return selectedIds.some((id) => targetIds.includes(id));
    case 'not_equals':
    case 'not_in_list':
    case 'is_not':
      return !selectedIds.some((id) => targetIds.includes(id));
    case 'contains':
      return targetIds.every((id) => selectedIds.includes(id));
    case 'not_contains':
      return !targetIds.some((id) => selectedIds.includes(id));
    default:
      return false;
  }
}

// =============================================================================
// Value Extraction
// =============================================================================

/**
 * Extract a numeric value from a response object.
 * Handles plain numbers and objects with a `value` property (e.g. scale responses).
 */
export function extractNumericValue(response: unknown): number {
  if (typeof response === 'number') return response;

  if (typeof response === 'object' && response !== null && 'value' in response) {
    const val = (response as { value: unknown }).value;
    if (typeof val === 'number') return val;
  }

  return 0;
}

// =============================================================================
// Graph Utilities
// =============================================================================

/**
 * Detect a cycle in a directed graph using DFS.
 * Returns the cycle path if found, or null if the graph is acyclic.
 */
export function detectCycle(graph: Map<string, Set<string>>): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): string[] | null {
    if (recursionStack.has(node)) {
      return path;
    }
    if (visited.has(node)) {
      return null;
    }

    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        const cycle = dfs(neighbor, [...path, neighbor]);
        if (cycle) {
          return cycle;
        }
      }
    }

    recursionStack.delete(node);
    return null;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      const cycle = dfs(node, [node]);
      if (cycle) {
        return cycle;
      }
    }
  }

  return null;
}

/**
 * Topological sort for a dependency graph.
 * Items with no dependencies come first. Falls back to original order
 * for items not in the graph.
 */
export function topologicalSort<T>(
  items: T[],
  getId: (item: T) => string,
  getDependencies: (item: T) => string[]
): T[] {
  const itemMap = new Map<string, T>();
  const depGraph = new Map<string, Set<string>>();
  const allIds: string[] = [];

  for (const item of items) {
    const id = getId(item);
    itemMap.set(id, item);
    allIds.push(id);
    depGraph.set(id, new Set(getDependencies(item)));
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) return; // cycle - skip to avoid infinite loop

    visiting.add(id);
    const deps = depGraph.get(id);
    if (deps) {
      for (const dep of deps) {
        if (itemMap.has(dep)) {
          visit(dep);
        }
      }
    }
    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
  }

  for (const id of allIds) {
    visit(id);
  }

  return sorted.map((id) => itemMap.get(id)!).filter(Boolean);
}
