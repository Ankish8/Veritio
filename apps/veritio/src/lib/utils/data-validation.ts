/**
 * Development-time data validation utilities
 * These help catch architectural mistakes early
 */

/**
 * Warns if responses array is empty when component expects data
 * Use this in Overview tab components during development
 *
 * @example
 * function MyComponent({ responses, taskMetrics }: Props) {
 *   warnIfEmptyResponses(responses, 'MyComponent')
 *   // ... component logic
 * }
 */
export function warnIfEmptyResponses(
  responses: unknown[],
  _componentName: string
): void {
  if (process.env.NODE_ENV === 'development') {
    if (responses.length === 0) {
      // Empty responses array — Overview tab components should use pre-computed metrics
    }
  }
}

/**
 * Asserts that component is using metrics, not responses
 * Use this in Overview tab components to enforce the pattern
 *
 * @example
 * function OverviewComponent({ taskMetrics, nodes }: Props) {
 *   assertUsingMetrics(taskMetrics, 'OverviewComponent')
 *   // ... component logic
 * }
 */
export function assertUsingMetrics(
  metrics: unknown,
  componentName: string
): void {
  if (process.env.NODE_ENV === 'development') {
    if (!metrics) {
      console.error(
        `❌ [${componentName}] Missing metrics prop.\n` +
        `   Overview tab components must receive metrics from parent.\n` +
        `   See: docs/TREE_TEST_DATA_ARCHITECTURE.md`
      )
    }
  }
}

/**
 * Type guard to check if we're on Overview tab (responses are empty)
 * versus Analysis tab (responses are populated)
 */
export function isOverviewTabData(responses: unknown[]): boolean {
  return responses.length === 0
}

/**
 * Validates that TaskMetrics has required aggregate data
 * Helps catch missing pre-computation
 */
export function validateTaskMetrics(
  taskMetrics: any[],
  requiredFields: string[],
  componentName: string
): void {
  if (process.env.NODE_ENV === 'development') {
    if (taskMetrics.length === 0) return // No data yet, that's fine

    const firstMetric = taskMetrics[0]
    const missing = requiredFields.filter(field => !(field in firstMetric))

    if (missing.length > 0) {
      console.error(
        `❌ [${componentName}] Missing required TaskMetrics fields: ${missing.join(', ')}\n` +
        `   You need to add these fields to the TaskMetrics interface and compute them in computeTaskMetrics().\n` +
        `   See: docs/TREE_TEST_DATA_ARCHITECTURE.md`
      )
    }
  }
}
