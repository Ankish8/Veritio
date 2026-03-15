import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { StorageMetrics } from './performance-monitoring-service'

type SupabaseClientType = SupabaseClient<Database>

export interface CostEstimate {
  database_storage_gb: number
  database_cost_per_month: number
  r2_storage_gb: number
  r2_cost_per_month: number
  total_monthly_cost: number
  cost_breakdown: {
    category: string
    size_gb: number
    cost_per_month: number
    percentage: number
  }[]
}

export interface OptimizationSavings {
  phase: string
  storage_before_gb: number
  storage_after_gb: number
  cost_before: number
  cost_after: number
  monthly_savings: number
  percentage_saved: number
  optimizations_applied: string[]
}

export interface CostMetrics {
  current_costs: CostEstimate
  baseline_costs: CostEstimate | null
  total_savings: number
  savings_by_phase: OptimizationSavings[]
  storage_trend: Array<{
    date: string
    size_gb: number
    estimated_cost: number
  }>
}

/**
 * Supabase pricing (approximate):
 * - First 8GB free
 * - $0.125/GB/month after that
 * - Compute/bandwidth typically included in base plan ($25/mo)
 */
const SUPABASE_STORAGE_COST_PER_GB = 0.125
const SUPABASE_FREE_TIER_GB = 8

/**
 * Cloudflare R2 pricing:
 * - First 10GB free
 * - $0.015/GB/month after that
 */
const R2_STORAGE_COST_PER_GB = 0.015
const R2_FREE_TIER_GB = 10

function bytesToGB(bytes: number): number {
  return bytes / (1024 * 1024 * 1024)
}

function calculateDatabaseCost(sizeGB: number): number {
  const billableGB = Math.max(0, sizeGB - SUPABASE_FREE_TIER_GB)
  return billableGB * SUPABASE_STORAGE_COST_PER_GB
}

function calculateR2Cost(sizeGB: number): number {
  const billableGB = Math.max(0, sizeGB - R2_FREE_TIER_GB)
  return billableGB * R2_STORAGE_COST_PER_GB
}

export function estimateCosts(storage: StorageMetrics, r2SizeBytes: number = 0): CostEstimate {
  const dbSizeGB = bytesToGB(storage.total_size_bytes)
  const r2SizeGB = bytesToGB(r2SizeBytes)

  const dbCost = calculateDatabaseCost(dbSizeGB)
  const r2Cost = calculateR2Cost(r2SizeGB)
  const totalCost = dbCost + r2Cost

  const breakdown = [
    {
      category: 'Database Tables',
      size_gb: bytesToGB(
        storage.total_size_bytes - storage.yjs_documents_size_bytes - storage.recordings_size_bytes
      ),
      cost_per_month: 0,
      percentage: 0,
    },
    {
      category: 'Yjs Documents',
      size_gb: bytesToGB(storage.yjs_documents_size_bytes),
      cost_per_month: 0,
      percentage: 0,
    },
    {
      category: 'Recording Metadata',
      size_gb: bytesToGB(storage.recordings_size_bytes),
      cost_per_month: 0,
      percentage: 0,
    },
    {
      category: 'R2 Storage (Recordings)',
      size_gb: r2SizeGB,
      cost_per_month: r2Cost,
      percentage: totalCost > 0 ? (r2Cost / totalCost) * 100 : 0,
    },
  ]

  // Distribute database costs proportionally
  const dbCategories = breakdown.slice(0, 3)
  const totalDbSize = dbSizeGB

  dbCategories.forEach((cat) => {
    const proportion = totalDbSize > 0 ? cat.size_gb / totalDbSize : 0
    cat.cost_per_month = dbCost * proportion
    cat.percentage = totalCost > 0 ? (cat.cost_per_month / totalCost) * 100 : 0
  })

  return {
    database_storage_gb: dbSizeGB,
    database_cost_per_month: dbCost,
    r2_storage_gb: r2SizeGB,
    r2_cost_per_month: r2Cost,
    total_monthly_cost: totalCost,
    cost_breakdown: breakdown,
  }
}

export function calculateOptimizationSavings(
  phaseName: string,
  beforeStorage: StorageMetrics,
  afterStorage: StorageMetrics,
  beforeR2: number,
  afterR2: number,
  optimizationsApplied: string[]
): OptimizationSavings {
  const beforeCosts = estimateCosts(beforeStorage, beforeR2)
  const afterCosts = estimateCosts(afterStorage, afterR2)

  const savings = beforeCosts.total_monthly_cost - afterCosts.total_monthly_cost
  const percentageSaved =
    beforeCosts.total_monthly_cost > 0
      ? (savings / beforeCosts.total_monthly_cost) * 100
      : 0

  return {
    phase: phaseName,
    storage_before_gb: beforeCosts.database_storage_gb + beforeCosts.r2_storage_gb,
    storage_after_gb: afterCosts.database_storage_gb + afterCosts.r2_storage_gb,
    cost_before: beforeCosts.total_monthly_cost,
    cost_after: afterCosts.total_monthly_cost,
    monthly_savings: savings,
    percentage_saved: percentageSaved,
    optimizations_applied: optimizationsApplied,
  }
}

export async function getCostMetrics(
  supabase: SupabaseClientType,
  currentStorage: StorageMetrics
): Promise<CostMetrics> {
  // For now, R2 storage is minimal (recordings stored there)
  // In production, you'd query actual R2 bucket size via API
  const estimatedR2Bytes = currentStorage.recordings_size_bytes * 10 // Rough estimate

  const currentCosts = estimateCosts(currentStorage, estimatedR2Bytes)

  // Load baseline from phase1-baseline.json if available
  let baselineCosts: CostEstimate | null = null
  let totalSavings = 0
  const savingsByPhase: OptimizationSavings[] = []

  try {
    // In a real implementation, you'd load this from a database table
    // For now, we'll use hardcoded baseline from the JSON
    const baselineStorage: StorageMetrics = {
      total_size_bytes: 20311187,
      recordings_size_bytes: 147456,
      yjs_documents_size_bytes: 524288,
      chunk_etags_size_bytes: 0,
      largest_tables: [],
    }

    baselineCosts = estimateCosts(baselineStorage, 147456 * 10)
    totalSavings = baselineCosts.total_monthly_cost - currentCosts.total_monthly_cost

    // Example savings by phase (in production, load from metrics table)
    savingsByPhase.push({
      phase: 'Phase 1: Quick Wins',
      storage_before_gb: bytesToGB(baselineStorage.total_size_bytes),
      storage_after_gb: bytesToGB(currentStorage.total_size_bytes),
      cost_before: baselineCosts.total_monthly_cost,
      cost_after: currentCosts.total_monthly_cost,
      monthly_savings: totalSavings,
      percentage_saved:
        baselineCosts.total_monthly_cost > 0
          ? (totalSavings / baselineCosts.total_monthly_cost) * 100
          : 0,
      optimizations_applied: [
        'Added organization_id indexes',
        'Fixed GROUP BY queries',
        'Yjs cleanup automation',
      ],
    })
  } catch {
    // No baseline available
  }

  return {
    current_costs: currentCosts,
    baseline_costs: baselineCosts,
    total_savings: totalSavings,
    savings_by_phase: savingsByPhase,
    storage_trend: [], // Would be populated from historical metrics table
  }
}
