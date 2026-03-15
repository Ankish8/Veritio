# Base Results Service - Migration Guide

**Created:** January 16, 2026
**Location:** `apps/veritio/src/services/results/base-results-service.ts`
**Status:** ✅ Ready for Migration

---

## Overview

The Base Results Service uses the **Template Method design pattern** to eliminate ~500 lines of duplication across 6 study type result services. It extracts the 80-90% of code that's identical (fetching study, participants, stats calculation) while allowing each study type to customize the remaining 10-20% (study-specific analysis).

---

## Problem Statement

### Current Duplication (Before)

All 6 study type services (`card-sort-overview.ts`, `tree-test-overview.ts`, etc.) have nearly identical code:

```typescript
// card-sort-overview.ts (400 lines)
export async function getCardSortOverview(supabase, studyId) {
  // 1. Fetch study (identical across all types) - 15 lines
  const { data: study } = await supabase.from('studies').select('...').eq('id', studyId)

  // 2. Validate study type (identical pattern) - 5 lines
  if (study.study_type !== 'card_sort') throw new Error('...')

  // 3. Fetch small tables (study-specific) - 10 lines
  const [cards, categories] = await Promise.all([...])

  // 4. Fetch large tables (similar pattern) - 10 lines
  const [participants, responses] = await Promise.all([
    fetchAllParticipants(supabase, studyId),
    fetchAllCardSortResponses(supabase, studyId),
  ])

  // 5. Calculate stats (identical across all types) - 30 lines
  const totalParticipants = participants.length
  const completedParticipants = participants.filter(p => p.status === 'completed').length
  // ... more stats calculations

  // 6. Compute analysis (study-specific) - 50 lines
  const analysis = computeCardSortAnalysis(responses, cards)

  // 7. Return structured data - 10 lines
  return { data: { study, participants, stats, cards, categories, responses, analysis }, error: null }
}
```

**Duplication:**
- Steps 1, 2, 4, 5, 7 are **80-90% identical** across all services
- Only steps 3 and 6 differ by study type
- **~320 lines duplicated** across 6 services

---

## Solution: Template Method Pattern

### Base Service Structure

```typescript
abstract class BaseResultsService {
  // Template method - defines the algorithm
  async getOverview(supabase, studyId) {
    // Common steps
    const study = await this.fetchStudy(supabase, studyId)
    this.validateStudyType(study)
    const participants = await fetchAllParticipants(supabase, studyId)
    const stats = this.calculateStats(participants)

    // Extension points (override in subclass)
    const smallTables = await this.fetchSmallTables(supabase, studyId)
    const largeTables = await this.fetchLargeTables(supabase, studyId)
    const analysis = await this.computeAnalysis({ study, participants, ...smallTables, ...largeTables })

    // Return assembled result
    return { data: { study, participants, stats, ...smallTables, ...largeTables, analysis } }
  }

  // Common methods (shared)
  protected async fetchStudy(supabase, studyId) { /* common implementation */ }
  protected calculateStats(participants) { /* common implementation */ }

  // Abstract methods (must override)
  protected abstract fetchSmallTables(supabase, studyId): Promise<any>
  protected abstract fetchLargeTables(supabase, studyId): Promise<any>
  protected abstract computeAnalysis(data): Promise<any>
}
```

---

## Migration Example: Card Sort

### Before (400 lines with duplication)

```typescript
// card-sort-overview.ts
export async function getCardSortOverview(supabase, studyId) {
  // Fetch study - 15 lines (duplicated)
  const { data: study, error } = await supabase
    .from('studies')
    .select(`id, title, description, study_type, status, ...`)
    .eq('id', studyId)
    .single()

  if (error || !study) return { data: null, error: new Error('Study not found') }

  // Validate type - 5 lines (duplicated)
  if (study.study_type !== 'card_sort') {
    return { data: null, error: new Error('Wrong study type') }
  }

  // Fetch small tables - 10 lines (study-specific)
  const [cards, categories, standardizations] = await Promise.all([
    supabase.from('cards').select('*').eq('study_id', studyId),
    supabase.from('categories').select('*').eq('study_id', studyId),
    supabase.from('category_standardizations').select('*').eq('study_id', studyId),
  ])

  // Fetch large tables - 10 lines (similar pattern)
  const [participants, responses, flowResponses] = await Promise.all([
    fetchAllParticipants(supabase, studyId),
    fetchAllCardSortResponses(supabase, studyId),
    fetchAllFlowResponses(supabase, studyId),
  ])

  // Calculate stats - 30 lines (duplicated)
  const totalParticipants = participants.length
  const completedParticipants = participants.filter(p => p.status === 'completed').length
  const completionRate = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0
  const avgCompletionTimeMs = ...

  // Compute analysis - 50 lines (study-specific)
  const analysis = null // Lazy loaded

  // Return - 10 lines (duplicated)
  return {
    data: {
      study,
      cards: cards.data || [],
      categories: categories.data || [],
      standardizations: standardizations.data || [],
      participants,
      responses,
      flowResponses,
      stats: { totalParticipants, completedParticipants, completionRate, avgCompletionTimeMs },
      analysis,
    },
    error: null,
  }
}
```

### After (80 lines without duplication)

```typescript
// card-sort-overview.ts
import { createResultsService } from './base-results-service'
import { fetchAllCardSortResponses, CATEGORY_STANDARDIZATION_COLUMNS } from './pagination'

// Create service using factory (functional approach)
const cardSortService = createResultsService({
  studyType: 'card_sort',

  // Study-specific small tables
  fetchSmallTables: async (supabase, studyId) => {
    const [cardsResult, categoriesResult, standardizationsResult] = await Promise.all([
      supabase.from('cards').select('*').eq('study_id', studyId),
      supabase.from('categories').select('*').eq('study_id', studyId),
      supabase
        .from('category_standardizations')
        .select(CATEGORY_STANDARDIZATION_COLUMNS)
        .eq('study_id', studyId),
    ])

    return {
      cards: cardsResult.data || [],
      categories: categoriesResult.data || [],
      standardizations: standardizationsResult.data || [],
    }
  },

  // Study-specific large tables
  fetchLargeTables: async (supabase, studyId) => ({
    responses: await fetchAllCardSortResponses(supabase, studyId),
  }),

  // Study-specific analysis (lazy loaded)
  computeAnalysis: async (data) => null,
})

// Export function with same signature (backward compatible)
export async function getCardSortOverview(supabase, studyId) {
  return cardSortService.getOverview(supabase, studyId)
}
```

**Lines Saved:** 400 → 80 lines (80% reduction)

---

## Migration Guide

### Step 1: Identify Common Code

In your current service, identify:
- ✅ **Common:** Study fetch, type validation, stats calculation
- ❌ **Study-specific:** Cards/categories fetch, response type, analysis computation

### Step 2: Use Factory Function

```typescript
import { createResultsService } from './base-results-service'
import { fetchAllYourResponses } from './pagination'

const yourService = createResultsService({
  studyType: 'your_type',
  fetchSmallTables: async (supabase, studyId) => ({
    // Return study-specific tables
    yourTable: await fetch...
  }),
  fetchLargeTables: async (supabase, studyId) => ({
    responses: await fetchAllYourResponses(supabase, studyId),
  }),
  computeAnalysis: async (data) => {
    // Return study-specific analysis or null
    return null
  },
})
```

### Step 3: Export Backward-Compatible Function

```typescript
// Keeps same function signature for existing code
export async function getYourOverview(supabase, studyId) {
  return yourService.getOverview(supabase, studyId)
}
```

### Step 4: Test Thoroughly

1. Test in development
2. Verify data structure matches old implementation
3. Check that stats are calculated correctly
4. Test with real study data
5. Deploy to staging

---

## Before/After Comparison

### Tree Test Service

**Before (450 lines):**
```typescript
export async function getTreeTestOverview(supabase, studyId) {
  // Fetch study - 15 lines (DUPLICATED)
  const { data: study } = await supabase.from('studies').select('...').eq('id', studyId).single()

  // Validate - 5 lines (DUPLICATED)
  if (study.study_type !== 'tree_test') throw new Error('...')

  // Fetch small tables - 10 lines (study-specific)
  const [tasks, nodes] = await Promise.all([
    supabase.from('tree_test_tasks').select('*').eq('study_id', studyId),
    supabase.from('tree_nodes').select('*').eq('study_id', studyId),
  ])

  // Fetch large tables - 10 lines (DUPLICATED pattern)
  const [participants, responses] = await Promise.all([
    fetchAllParticipants(supabase, studyId),
    fetchAllTreeTestResponses(supabase, studyId),
  ])

  // Calculate stats - 30 lines (DUPLICATED)
  const totalParticipants = participants.length
  // ... identical to card sort

  // Compute analysis - 50 lines (study-specific)
  const taskMetrics = computeTaskMetrics(responses, tasks)

  return { data: { study, tasks, nodes, participants, responses, stats, taskMetrics } }
}
```

**After (70 lines):**
```typescript
import { createResultsService } from './base-results-service'
import { fetchAllTreeTestResponses } from './pagination'

const treeTestService = createResultsService({
  studyType: 'tree_test',

  fetchSmallTables: async (supabase, studyId) => {
    const [tasksResult, nodesResult] = await Promise.all([
      supabase.from('tree_test_tasks').select('*').eq('study_id', studyId),
      supabase.from('tree_nodes').select('*').eq('study_id', studyId),
    ])

    return {
      tasks: tasksResult.data || [],
      treeNodes: nodesResult.data || [],
    }
  },

  fetchLargeTables: async (supabase, studyId) => ({
    responses: await fetchAllTreeTestResponses(supabase, studyId),
  }),

  computeAnalysis: async (data) => {
    // Compute task metrics
    return computeTaskMetrics(data.responses, data.tasks)
  },
})

export async function getTreeTestOverview(supabase, studyId) {
  return treeTestService.getOverview(supabase, studyId)
}
```

**Lines Saved:** 450 → 70 lines (84% reduction)

---

## All Study Types Migration

### Card Sort
**Current:** 420 lines
**After:** ~80 lines
**Specific Tables:** cards, categories, standardizations
**Analysis:** Lazy loaded (null)

### Tree Test
**Current:** 450 lines
**After:** ~70 lines
**Specific Tables:** tasks, tree_nodes
**Analysis:** taskMetrics (precomputed)

### Survey
**Current:** 280 lines
**After:** ~40 lines
**Specific Tables:** (none - just uses flowQuestions)
**Analysis:** null (computed by question components)

### Prototype Test
**Current:** 380 lines
**After:** ~75 lines
**Specific Tables:** tasks
**Analysis:** task success metrics

### First Click
**Current:** 390 lines
**After:** ~75 lines
**Specific Tables:** designs, tasks
**Analysis:** heat maps, click distribution

### First Impression
**Current:** 410 lines
**After:** ~80 lines
**Specific Tables:** designs, sessions, exposures
**Analysis:** design metrics, exposure stats

**Total Savings:** ~2,400 → ~420 lines = **~2,000 lines eliminated** (83% reduction)

---

## Advanced Usage: Class-Based Approach

For more complex services, extend the base class directly:

```typescript
import { BaseResultsService } from './base-results-service'
import type { CardSortAnalysis, CardSortData } from './types'

class CardSortResultsService extends BaseResultsService<
  CardSortData,
  CardSortAnalysis
> {
  protected expectedStudyType = 'card_sort'

  protected async fetchSmallTables(supabase, studyId) {
    const [cards, categories, standardizations] = await Promise.all([
      supabase.from('cards').select('*').eq('study_id', studyId),
      supabase.from('categories').select('*').eq('study_id', studyId),
      supabase.from('category_standardizations').select('*').eq('study_id', studyId),
    ])

    return {
      cards: cards.data || [],
      categories: categories.data || [],
      standardizations: standardizations.data || [],
    }
  }

  protected async fetchLargeTables(supabase, studyId) {
    return {
      responses: await fetchAllCardSortResponses(supabase, studyId),
    }
  }

  protected async computeAnalysis(data) {
    // Lazy loaded - return null
    return null
  }

  // Can add custom methods
  async getFullAnalysis(supabase, studyId) {
    const overview = await this.getOverview(supabase, studyId)
    if (!overview.data) return overview

    // Compute expensive analysis
    const analysis = await computeFullCardSortAnalysis(overview.data)

    return {
      ...overview,
      data: { ...overview.data, analysis },
    }
  }
}

// Export singleton instance
export const cardSortResultsService = new CardSortResultsService()

// Export function for backward compatibility
export async function getCardSortOverview(supabase, studyId) {
  return cardSortResultsService.getOverview(supabase, studyId)
}
```

---

## Migration Checklist

### Per Study Type

- [ ] Create service using `createResultsService()` factory
- [ ] Implement `fetchSmallTables()` - study-specific tables
- [ ] Implement `fetchLargeTables()` - response data
- [ ] Implement `computeAnalysis()` - study analysis or null
- [ ] Export backward-compatible function
- [ ] Test with real data in dev
- [ ] Verify data structure matches old implementation
- [ ] Check performance (should be same or better)
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Delete old implementation

### All Services

- [ ] Migrate card-sort-overview.ts
- [ ] Migrate tree-test-overview.ts
- [ ] Migrate survey-overview.ts
- [ ] Migrate prototype-test-overview.ts
- [ ] Migrate first-click-overview.ts
- [ ] Migrate first-impression-overview.ts
- [ ] Update documentation
- [ ] Add tests for base service

---

## Testing Strategy

### Test Base Service

```typescript
// base-results-service.test.ts
import { describe, it, expect } from 'vitest'
import { createResultsService } from './base-results-service'

describe('BaseResultsService', () => {
  it('should fetch study and calculate stats correctly', async () => {
    const service = createResultsService({
      studyType: 'test_type',
      fetchSmallTables: async () => ({}),
      fetchLargeTables: async () => ({ responses: [] }),
      computeAnalysis: async () => null,
    })

    const result = await service.getOverview(mockSupabase, 'study-id')

    expect(result.data.study).toBeDefined()
    expect(result.data.stats.totalParticipants).toBeGreaterThanOrEqual(0)
  })

  it('should reject wrong study type', async () => {
    const service = createResultsService({
      studyType: 'card_sort',
      fetchSmallTables: async () => ({}),
      fetchLargeTables: async () => ({ responses: [] }),
      computeAnalysis: async () => null,
    })

    // Pass a tree_test study
    const result = await service.getOverview(mockSupabaseWithTreeTest, 'study-id')

    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('only for card_sort studies')
  })
})
```

### Test Study-Specific Services

```typescript
// card-sort-overview.test.ts
import { describe, it, expect } from 'vitest'
import { getCardSortOverview } from './card-sort-overview'

describe('getCardSortOverview', () => {
  it('should return cards and categories', async () => {
    const result = await getCardSortOverview(mockSupabase, 'study-id')

    expect(result.data.cards).toBeDefined()
    expect(result.data.categories).toBeDefined()
    expect(result.data.stats.totalParticipants).toBeGreaterThanOrEqual(0)
  })
})
```

---

## Performance Considerations

### Before (6 services)
- **~2,400 lines** of code to parse/compile
- Duplication increases bundle size
- Maintenance burden (6 places to fix bugs)

### After (Base + 6 configs)
- **~600 lines** total (base + configurations)
- Shared code means better tree-shaking
- Single place to optimize (benefits all study types)

### Optimization Opportunities in Base Service

```typescript
// Add caching to base service
protected async fetchStudy(supabase, studyId) {
  // Check cache first
  const cached = cache.get(cacheKeys.study(studyId))
  if (cached) return { data: cached, error: null }

  // Fetch and cache
  const result = await supabase.from('studies').select('...').eq('id', studyId).single()
  if (result.data) {
    cache.set(cacheKeys.study(studyId), result.data, 60) // 60s TTL
  }

  return result
}

// This optimization now benefits ALL 6 study types! ✅
```

---

## FAQ

### Q: Will this break existing code?

**A:** No! The migration maintains backward compatibility:
```typescript
// Old code still works
const result = await getCardSortOverview(supabase, studyId)

// New code (same signature)
const result = await cardSortService.getOverview(supabase, studyId)
```

### Q: What about performance?

**A:** Should be the same or better:
- Same database queries
- Same data fetching pattern
- Potential for shared optimizations
- Smaller bundle size

### Q: Can I customize the base service for one study type?

**A:** Yes! Use class-based approach and override methods:
```typescript
class CustomCardSortService extends BaseResultsService {
  // Override any method
  protected async calculateStats(participants) {
    // Custom stats calculation for card sort only
    const baseStats = super.calculateStats(participants)
    return { ...baseStats, customMetric: calculateCustom(participants) }
  }
}
```

### Q: What if I need different stats for each study type?

**A:** The base `calculateStats()` returns common stats. Add study-specific stats in `computeAnalysis()`:
```typescript
computeAnalysis: async (data) => ({
  // Study-specific stats here
  successRate: calculateSuccessRate(data.responses),
  avgDirectness: calculateDirectness(data.responses),
})
```

---

## Rollout Plan

### Week 1: Preparation
- [ ] Review this guide with team
- [ ] Agree on migration priority order
- [ ] Set up monitoring for performance
- [ ] Add tests for base service

### Week 2: Migrate First Service (Card Sort)
- [ ] Migrate card-sort-overview.ts
- [ ] Test thoroughly in dev
- [ ] Deploy to staging
- [ ] Monitor for 2-3 days
- [ ] Deploy to production if stable

### Week 3: Migrate Remaining Services
- [ ] Migrate tree-test-overview.ts
- [ ] Migrate survey-overview.ts
- [ ] Migrate prototype-test-overview.ts
- [ ] Deploy to staging, monitor

### Week 4: Final Services + Cleanup
- [ ] Migrate first-click-overview.ts
- [ ] Migrate first-impression-overview.ts
- [ ] Run full test suite
- [ ] Deploy to production
- [ ] Delete old implementations
- [ ] Update documentation

**Total Time:** 3-4 weeks (can be faster if done in parallel)

---

## Success Metrics

### Code Quality
- **Target:** Reduce results services from 2,400 → 600 lines (75% reduction)
- **Target:** Single place for bug fixes (base service)
- **Target:** Zero duplication in common logic

### Maintenance
- **Target:** < 1 hour to add new study type (vs 4-6 hours currently)
- **Target:** Bug fixes apply to all study types automatically
- **Target:** Performance optimizations benefit all types

### Developer Experience
- **Target:** New developers understand pattern quickly
- **Target:** Clear separation: common vs study-specific
- **Target:** Type-safe extension points

---

## Next Steps

1. **Get Team Consensus** - Review this guide
2. **Add Tests** - Write tests for base service
3. **Pilot Migration** - Start with card sort
4. **Monitor** - Ensure no regressions
5. **Roll Out** - Migrate remaining services
6. **Document Learnings** - Update this guide

---

**Document Owner:** Development Team
**Last Updated:** January 16, 2026
**Status:** Ready for implementation
