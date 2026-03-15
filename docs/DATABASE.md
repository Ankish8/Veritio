# Database Schema Reference

Quick reference for Supabase tables. Types: `src/lib/supabase/types.ts`

---

## Entity Relationship Diagram

```
projects
    │
    └──< studies (project_id)
            │
            ├──< cards (study_id)           # Card Sort only
            ├──< categories (study_id)      # Card Sort only (closed/hybrid)
            ├──< tree_nodes (study_id)      # Tree Test only
            │       └──< tree_nodes (parent_id)  # Self-referential
            ├──< tasks (study_id)           # Tree Test only
            │       └──> tree_nodes (correct_node_id)
            ├──< study_flow_questions (study_id)
            ├──< participants (study_id)
            │       ├──< card_sort_responses (participant_id)
            │       ├──< tree_test_responses (participant_id)
            │       ├──< study_flow_responses (participant_id)
            │       └──< participant_analysis_flags (participant_id)
            ├──< category_standardizations (study_id)  # Analysis
            └──< pca_analyses (study_id)               # Analysis (1:1)
```

---

## Core Tables

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| clerk_user_id | string | Owner |
| name | string | |
| description | string? | |

### `studies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| study_type | enum | `'card_sort' \| 'tree_test'` |
| status | enum | `'draft' \| 'active' \| 'paused' \| 'completed'` |
| share_code | string | Unique participant URL code |
| settings | Json | CardSortSettings or TreeTestSettings |
| closing_rule | Json | Auto-close config |
| branding | Json | Logo, colors |

---

## Card Sort Tables

### `cards`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| study_id | uuid | FK → studies |
| label | string | Card text |
| description | string? | Optional detail |
| position | number | Sort order |

### `categories`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| study_id | uuid | FK → studies |
| label | string | Category name |
| position | number | Sort order |

### `card_sort_responses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| participant_id | uuid | FK → participants |
| study_id | uuid | FK → studies |
| card_placements | Json | `{ cardId: categoryId }` |
| custom_categories | Json? | Open sort created categories |
| total_time_ms | number? | Completion time |
| standardized_placements | Json? | After category standardization |

---

## Tree Test Tables

### `tree_nodes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| study_id | uuid | FK → studies |
| parent_id | uuid? | FK → tree_nodes (self-ref) |
| label | string | Node text |
| path | string? | Materialized path |
| position | number | Sort order |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| study_id | uuid | FK → studies |
| question | string | Task description |
| correct_node_id | uuid? | FK → tree_nodes |
| post_task_questions | Json | PostTaskQuestion[] |

### `tree_test_responses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| participant_id | uuid | FK → participants |
| task_id | uuid | FK → tasks |
| path_taken | string[] | Node IDs visited |
| selected_node_id | uuid? | Final selection |
| is_correct | boolean? | Matches correct_node_id |
| is_direct | boolean? | No backtracking |
| backtrack_count | number | Times went back |

---

## Study Flow Tables

### `study_flow_questions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| study_id | uuid | FK → studies |
| section | enum | `'screening' \| 'pre_study' \| 'post_study'` |
| question_type | enum | See Question Types below |
| question_text | string | |
| is_required | boolean | |
| config | Json | Type-specific config |
| display_logic | Json? | Show/hide conditions |
| branching_logic | Json? | Skip logic |

**Question Types:** `single_line_text`, `multi_line_text`, `radio`, `dropdown`, `checkbox`, `likert`, `nps`, `matrix`, `ranking`

### `study_flow_responses`
| Column | Type | Notes |
|--------|------|-------|
| participant_id | uuid | FK → participants |
| question_id | uuid | FK → study_flow_questions |
| response_value | Json | Answer data |

---

## Participant Tables

### `participants`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| study_id | uuid | FK → studies |
| session_token | string | Browser session |
| status | enum | `'in_progress' \| 'completed' \| 'abandoned'` |
| identifier_type | enum? | `'anonymous' \| 'email' \| 'custom'` |
| identifier_value | string? | Email or custom ID |
| screening_result | enum? | `'passed' \| 'rejected'` |
| url_tags | Json | UTM params etc |

### `participant_analysis_flags`
| Column | Type | Notes |
|--------|------|-------|
| participant_id | uuid | FK → participants |
| flag_type | enum | `'all_one_group' \| 'each_own_group' \| 'no_movement' \| 'too_fast' \| 'too_slow'` |
| is_excluded | boolean | Exclude from analysis |

---

## Analysis Tables

### `category_standardizations`
Maps open-sort participant categories to standardized names.

| Column | Type | Notes |
|--------|------|-------|
| study_id | uuid | FK → studies |
| standardized_name | string | Merged category name |
| original_names | string[] | Participant category names |
| agreement_score | number? | Percentage agreement |

### `pca_analyses`
Cached PCA computation results (1:1 with study).

| Column | Type | Notes |
|--------|------|-------|
| study_id | uuid | FK → studies (unique) |
| top_ias | Json | Top information architecture |
| support_ratios | Json | Card support data |
| response_count | number | Responses included |

---

## Common JSON Structures

### CardSortSettings
```typescript
{
  mode: 'open' | 'closed' | 'hybrid'
  randomizeCards: boolean
  randomizeCategories: boolean
  allowSkip: boolean
  showProgress: boolean
  cardLimit?: number
  maxCategories?: number
}
```

### TreeTestSettings
```typescript
{
  randomizeTasks: boolean
  showBreadcrumbs: boolean
  allowBack: boolean
  showTaskProgress: boolean
  allowSkipTasks: boolean
  dontRandomizeFirstTask: boolean
  answerButtonText: string
}
```

---

## Type Imports

```typescript
// Row types (read)
import { Project, Study, Card, Participant } from '@/lib/supabase/types'

// Insert types (create)
import { StudyInsert, CardInsert } from '@/lib/supabase/types'

// Update types (patch)
import { StudyUpdate } from '@/lib/supabase/types'

// Settings types
import { CardSortSettings, TreeTestSettings } from '@/lib/supabase/types'
```
