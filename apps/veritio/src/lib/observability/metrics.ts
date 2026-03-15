/**
 * In-memory metrics collector for request tracking.
 * Phase 1: Simple in-memory storage
 * Phase 2: Can be extended to export to Prometheus/Grafana
 */

interface RequestMetrics {
  count: number
  latencySum: number
  latencyMin: number
  latencyMax: number
  latencies: number[] // For percentile calculation
  statusCodes: Record<number, number>
  errors: Record<string, number>
}

interface MetricsSnapshot {
  requests: Record<string, RequestMetrics>
  errors: Record<string, Record<string, number>>
  timestamp: string
  uptime: number
}

class MetricsCollector {
  private requests = new Map<string, RequestMetrics>()
  private startTime = Date.now()

  /**
   * Record a completed request.
   */
  recordRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    const key = `${method} ${endpoint}`
    let metrics = this.requests.get(key)

    if (!metrics) {
      metrics = {
        count: 0,
        latencySum: 0,
        latencyMin: Infinity,
        latencyMax: 0,
        latencies: [],
        statusCodes: {},
        errors: {},
      }
      this.requests.set(key, metrics)
    }

    metrics.count++
    metrics.latencySum += duration
    metrics.latencyMin = Math.min(metrics.latencyMin, duration)
    metrics.latencyMax = Math.max(metrics.latencyMax, duration)

    // Store latencies for percentile calculation (keep last 1000)
    metrics.latencies.push(duration)
    if (metrics.latencies.length > 1000) {
      metrics.latencies.shift()
    }

    // Track status codes
    metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1
  }

  /**
   * Record an error.
   */
  recordError(endpoint: string, method: string, errorCode: string): void {
    const key = `${method} ${endpoint}`
    let metrics = this.requests.get(key)

    if (!metrics) {
      metrics = {
        count: 0,
        latencySum: 0,
        latencyMin: Infinity,
        latencyMax: 0,
        latencies: [],
        statusCodes: {},
        errors: {},
      }
      this.requests.set(key, metrics)
    }

    metrics.errors[errorCode] = (metrics.errors[errorCode] || 0) + 1
  }

  /**
   * Calculate percentile from latency array.
   */
  private calculatePercentile(latencies: number[], percentile: number): number {
    if (latencies.length === 0) return 0

    const sorted = [...latencies].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * Get metrics snapshot with calculated values.
   */
  getMetrics(): MetricsSnapshot {
    const requestsData: Record<string, RequestMetrics & {
      latencyAvg: number
      latencyP50: number
      latencyP95: number
      latencyP99: number
    }> = {}

    for (const [key, metrics] of this.requests) {
      const latencyAvg = metrics.count > 0 ? metrics.latencySum / metrics.count : 0

      requestsData[key] = {
        ...metrics,
        latencyAvg,
        latencyP50: this.calculatePercentile(metrics.latencies, 50),
        latencyP95: this.calculatePercentile(metrics.latencies, 95),
        latencyP99: this.calculatePercentile(metrics.latencies, 99),
      }
    }

    return {
      requests: requestsData,
      errors: this.getErrorsByEndpoint(),
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * Get errors grouped by endpoint.
   */
  private getErrorsByEndpoint(): Record<string, Record<string, number>> {
    const errors: Record<string, Record<string, number>> = {}

    for (const [key, metrics] of this.requests) {
      if (Object.keys(metrics.errors).length > 0) {
        errors[key] = metrics.errors
      }
    }

    return errors
  }

  /**
   * Get summary statistics.
   */
  getSummary() {
    let totalRequests = 0
    let totalErrors = 0
    let avgLatency = 0

    for (const metrics of this.requests.values()) {
      totalRequests += metrics.count
      totalErrors += Object.values(metrics.errors).reduce((sum, count) => sum + count, 0)
      avgLatency += metrics.latencySum
    }

    return {
      totalRequests,
      totalErrors,
      avgLatency: totalRequests > 0 ? avgLatency / totalRequests : 0,
      uptime: Date.now() - this.startTime,
      endpoints: this.requests.size,
    }
  }

  /**
   * Reset all metrics.
   */
  reset(): void {
    this.requests.clear()
    this.startTime = Date.now()
  }
}

// Singleton instance
export const metrics = new MetricsCollector()
