# V3 Pathway Detection Architecture

Reference for the same-frame pathway success detection system. V3 pathways allow defining success criteria as a sequence of **component state changes** (tab switches, panel opens, toggles) on the same frame, rather than only frame-to-frame navigation.

## Pathway Formats

### V1 (Legacy) — Single frame path
```typescript
{ frames: string[], strict: boolean }
```

### V2 — Multi-path frame navigation
```typescript
{ version: 2, paths: [{ id, name, frames: string[], is_primary }] }
```

### V3 — Frame + Component State Steps
```typescript
{
  version: 3,
  paths: [{
    id: string
    name: string
    steps: PathwayStep[]       // Discriminated union: frame | state
    frames: string[]           // Backward-compat mirror of steps (same frame repeated)
    is_primary: boolean
  }]
}
```

**`PathwayStep`** is a discriminated union:
```typescript
type PathwayStep = PathwayFrameStep | PathwayStateStep

interface PathwayFrameStep { type: 'frame'; id: string; frameId: string }
interface PathwayStateStep { type: 'state'; id: string; componentNodeId: string; variantId: string }
```

**Types defined in:** `packages/@veritio/study-types/src/index.ts`

### Same-Frame Pathway Example

For a pathway "Open Edit panel, then switch tab to Resolved" — all on the inbox frame:

```
steps: [
  { type: "frame",  frameId: "04c024ac-..." }              // Position 0: Start on inbox
  { type: "state",  componentNodeId: "378:29871",           // Position 1: Open Edit panel
                     variantId: "146:11404" }
  { type: "state",  componentNodeId: "359:12289",           // Position 2: Tab → Resolved (GOAL)
                     variantId: "127:12179" }
]
frames: ["04c024ac-...", "04c024ac-...", "04c024ac-..."]    // All same frame
```

## Detection Algorithms

All in `packages/@veritio/prototype-test/src/algorithms/path-matching.ts`.

### Core Concept: Diff-Based Goal Detection

The builder saves **cumulative** state snapshots at each step. If we checked all cumulative states at the goal, we'd require every intermediate state to be simultaneously active. Instead, we **diff** consecutive positions and only check the **last position's new changes** as the goal.

### Function: `extractPathwayPositions(steps)`

Groups steps by frame boundaries, producing positions with:
- `frameId` — which frame this position is on
- `cumulativeStates` — all states set up to this point
- `newStateChanges` — only the NEW state changes at this position (diff from previous)

### Function: `checkGoalStateDiff(pathway, currentStates)`

Checks if the **goal state** (last position's `newStateChanges`) is satisfied in the current Figma component states. Only checks the goal diff, not all cumulative states.

Falls back to `checkPathwayGoalStates()` for pathways without state steps.

### Function: `matchStateSequence(positions, stateEvents, taskId)`

Subsequence matching of participant's chronological `componentStateEvents` against pathway positions. Returns:

```typescript
{
  allStatesReached: boolean    // All expected state changes found (possibly out of order)
  inCorrectOrder: boolean      // State changes occurred in pathway-defined order
  positionsMatched: number     // How many positions matched in forward scan
  totalPositionsWithStates: number
}
```

**Algorithm:** For each position's new state changes (in pathway order), scan forward through events. If all changes for a position are found sequentially, advance to next position. If a position can't be matched in order, break.

Then separately check if all states exist anywhere (for out-of-order / indirect detection).

### Function: `matchPathWithStates(pathTaken, pathway, stateEvents, taskId)`

Combined frame + state matching. Routing:

| Pathway Type | Strategy |
|---|---|
| No state steps | Delegates to `matchPath()` — zero behavior change |
| Same-frame (all steps on one frame) | Skip frame matching, use state sequence only |
| Multi-frame with states | Combine frame matching + state sequence |

Returns `PathWithStatesMatchResult` extending `PathMatchResult` with optional `stateSequenceMatch`.

## Player Integration

File: `packages/@veritio/prototype-test/src/player/prototype-test-player.tsx`

### Three Success Detection Points

#### 1. `handleFigmaStateChange` (fires on every component state change)
- Only runs for `pathway` criteria + `task_flow` mode + auto-complete enabled
- Checks: on goal frame? → `checkGoalStateDiff` → has actual state events? → `matchPathWithStates`
- If goal diff met and events exist: **success**
  - `matched: true` → direct if `inCorrectOrder`, indirect if not
  - `matched: false` → indirect (goal reached, not all intermediates)
- **False positive guard:** If zero state events for this task → return (snapshot preload, not real interaction)

#### 2. `handleFigmaNavigate` (fires on frame navigation)
- Delegates to `checkTaskSuccess()` utility

#### 3. `handleManualComplete` (fires on "Mark complete" button)
- Delegates to `checkTaskSuccess()` utility

### Unified Utility: `checkTaskSuccess()`

File: `packages/@veritio/prototype-test/src/player/utils/check-task-success.ts`

Handles all three `success_criteria_type` values:
- **`pathway`**: `matchPathWithStates` → goal frame fallback → `checkGoalStateDiff` → event existence check
- **`component_state`**: Standalone state matching via `checkStateOnlySuccess()`
- **`destination`**: Simple frame arrival check

Plus the overlay: if `enable_interactive_components` is true, additionally checks `success_component_states`.

### Success Outcome Matrix

| Scenario | `outcome` | `is_direct` |
|---|---|---|
| All states in correct order | `success` | `true` |
| Goal state reached, intermediates missing/wrong order | `success` | `false` |
| On goal frame via wrong path, goal state not met | not success | — |
| Goal state in Figma snapshot but no user events | not success | — |
| User clicks "Give up" | `failure` | — |
| User clicks "Skip" | `skipped` | — |

## Data Flow: Builder → DB → Player → Results

### Save Pipeline (Builder → DB)

```
PathwayBuilderModal (use-pathway-builder-state.ts)
  → BuilderStep[] with type: 'frame' | 'state'
  → TaskList.handlePathwaySave()
  → Zustand store updateTask({ success_pathway: { version: 3, paths: [...] } })
  → Auto-save (3s debounce) → prototype-test-save-strategy.ts
  → sanitizeSuccessPathway() handles v1/v2/v3 formats
  → PUT /api/studies/:studyId/prototype-tasks (bulk update)
  → prototype_test_tasks.success_pathway (JSONB column)
```

### Player → DB

```
PrototypeTestPlayer
  → handleFigmaStateChange / handleFigmaNavigate / handleManualComplete
  → checkGoalStateDiff + matchPathWithStates
  → followedCorrectPathRef.current = true/false
  → handleTaskComplete('success')
  → buildTaskResult(task, outcome, followedCorrectPath)
  → submitResults() sends:
      taskAttempts: [{ taskId, outcome, pathTaken, isDirect, ... }]
      componentStateEvents: [{ taskId, frameId, componentNodeId, fromVariantId, toVariantId, sequenceNumber, ... }]
  → POST /api/participate/:shareCode/submit/prototype-test
  → prototype_test_task_attempts (outcome, path_taken, is_direct)
  → prototype_test_component_state_events (per-event records)
```

### DB Schema (relevant columns)

**`prototype_test_task_attempts`**
| Column | Type | Description |
|---|---|---|
| `outcome` | enum | `success`, `failure`, `skipped` |
| `path_taken` | jsonb | Array of frame IDs visited |
| `is_direct` | boolean | Whether user followed the correct/expected path |
| `total_time_ms` | integer | Time from task start to completion |
| `click_count` | integer | Total clicks during task |
| `misclick_count` | integer | Clicks that didn't trigger navigation |

**`prototype_test_component_state_events`**
| Column | Type | Description |
|---|---|---|
| `task_id` | uuid | Which task this event belongs to |
| `frame_id` | uuid | Frame the user was on when state changed |
| `component_node_id` | text | Figma component node ID (e.g., `378:29871`) |
| `from_variant_id` | text | Previous variant ID |
| `to_variant_id` | text | New variant ID |
| `is_timed_change` | boolean | Whether this was an auto-transition |
| `sequence_number` | integer | Chronological order within the session |

**`prototype_test_tasks`**
| Column | Type | Description |
|---|---|---|
| `success_criteria_type` | text | `destination`, `pathway`, or `component_state` |
| `success_pathway` | jsonb | V1/V2/V3 pathway definition |
| `success_frame_ids` | jsonb | Goal frame IDs (for destination type) |

## Results Page Considerations

When building the results/analysis page for V3 pathways:

### 1. Direct vs Indirect for State Pathways

`is_direct` now correctly reflects whether the user followed the state sequence in order. For same-frame pathways:
- **Direct:** User triggered states in the exact order defined in the pathway
- **Indirect:** User reached the goal state but via a different sequence

### 2. Path Visualization

`path_taken` will often be `[frameId, frameId]` (same frame repeated) for same-frame pathways. The real "path" is in the `component_state_events` table. To reconstruct what the user did:

```sql
SELECT component_node_id, from_variant_id, to_variant_id, sequence_number
FROM prototype_test_component_state_events
WHERE session_id = ? AND task_id = ?
ORDER BY sequence_number ASC
```

### 3. Matching Events to Pathway Steps

To determine which pathway steps the user completed:
1. Load the task's `success_pathway` (V3 format)
2. Extract positions with `extractPathwayPositions(path.steps)`
3. Load the participant's `component_state_events`
4. Run `matchStateSequence(positions, events, taskId)` to get per-position match info

### 4. Component Node ID Nesting

Figma reports nested component IDs like `I359:12289;127:12146` (instance path). The pathway uses top-level IDs like `359:12289`. The matching algorithm compares exact `componentNodeId` matches, so events from nested instances (prefixed with `I` and containing `;`) won't match pathway steps — only top-level component state changes match.

### 5. Backward Compatibility

All V3 functions fall back gracefully:
- `checkGoalStateDiff` → delegates to `checkPathwayGoalStates` for non-V3
- `matchPathWithStates` → delegates to `matchPath` for non-V3
- `pathwayHasStateSteps()` utility detects V3 presence

V1 and V2 pathways continue to work exactly as before.

## Key Files

| File | Purpose |
|---|---|
| `packages/@veritio/study-types/src/index.ts` | Type definitions (PathwayStep, SuccessPathwayV3, etc.) |
| `packages/@veritio/prototype-test/src/algorithms/path-matching.ts` | All matching algorithms |
| `packages/@veritio/prototype-test/src/player/prototype-test-player.tsx` | Player with 3 detection points |
| `packages/@veritio/prototype-test/src/player/utils/check-task-success.ts` | Unified success checking utility |
| `packages/@veritio/prototype-test/src/player/hooks/use-prototype-task-tracking.ts` | Event recording + buildTaskResult |
| `packages/@veritio/prototype-test/src/lib/utils/pathway-migration.ts` | V1/V2/V3 normalization + `pathwayHasStateSteps()` |
| `packages/@veritio/prototype-test/src/builder/hooks/use-pathway-builder-state.ts` | Builder state management |
| `apps/veritio/src/app/.../save-strategies/prototype-test-save-strategy.ts` | Save pipeline + sanitization |
| `apps/veritio/src/services/participant/submissions/prototype-test.ts` | Server-side submission processing |
