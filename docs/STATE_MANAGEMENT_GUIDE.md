# State Management Decision Tree

**Date:** January 16, 2026
**Purpose:** Guide developers on choosing the right state management pattern
**Audience:** All developers working on this codebase

---

## Executive Summary

This codebase uses **4 different state management patterns**. Each has its place. This guide helps you choose the right one.

**Quick Decision:**
- **Server data, simple CRUD** → SWR CRUD Factory
- **Server data, complex queries** → Raw SWR + Cache Orchestrator
- **Complex client state** → Zustand
- **Component tree state** → Context API
- **Local component only** → useState

---

## Pattern 1: SWR CRUD Factory (Recommended for Most Server Data)

### When to Use
✅ Server-synced data (studies, projects, participants)
✅ Simple CRUD operations (create, read, update, delete)
✅ Need optimistic updates
✅ Standard REST API patterns
✅ Parent-child relationships (project → studies)

### When NOT to Use
❌ Complex filtering/search logic
❌ Pagination with cursor-based or offset-based
❌ Non-standard API patterns
❌ Read-only data (no mutations)

### Example: use-studies.ts

```typescript
import { createCRUDHook, createScopedArrayCRUDConfig } from '@/lib/swr/crud-factory'
import { invalidateCache } from '@/lib/swr/cache-invalidation'

const studiesConfig = createScopedArrayCRUDConfig<StudyWithCount>({
  name: 'study',
  scopeParam: 'projectId',
  keyBuilder: (projectId) => SWR_KEYS.projectStudies(projectId),
  apiUrlBuilder: (projectId) => `/api/projects/${projectId}/studies`,
  defaultItem: {
    status: 'draft',
    // ... other defaults
  },
})

export const useStudies = createCRUDHook(studiesConfig)

// Usage in components:
const { data, create, update, archive } = useStudies(projectId)

// Create with automatic cache invalidation
const newStudy = await create({ title: 'My Study', study_type: 'card_sort' })

// Trigger cache events for cross-cache invalidation
await invalidateCache('study:created', { projectId, studyId: newStudy.id })
```

### Benefits
- ✅ Optimistic updates built-in
- ✅ Consistent error handling
- ✅ Automatic cache management
- ✅ Less boilerplate (5-10 lines vs 50+)
- ✅ Type-safe mutations

### Files Using This Pattern
- ✅ `use-studies.ts` (project-scoped studies)
- ✅ `use-projects.ts` (organization projects)
- 🔄 Can migrate: `use-recordings.ts`, `use-study-tags.ts`

---

## Pattern 2: Raw SWR + Cache Orchestrator

### When to Use
✅ Complex filtering/search requirements
✅ Pagination (cursor or offset based)
✅ Dynamic query parameters
✅ Read-only or minimal mutations
✅ Non-standard API patterns
✅ Need full control over SWR options

### When NOT to Use
❌ Simple CRUD that fits factory pattern
❌ Need optimistic updates (requires manual implementation)
❌ Standard REST endpoints (use factory instead)

### Example: use-all-studies.ts

```typescript
import useSWR from 'swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'

export function useAllStudies(filters: AllStudiesFilters = {}, pagination = {}) {
  const queryString = buildQueryString(filters, pagination)

  const { data, error, isLoading, mutate } = useSWR<AllStudiesResponse>(
    SWR_KEYS.allStudies(queryString)
  )

  const archiveStudy = useCallback(async (studyId: string) => {
    await api.archiveStudy(studyId)

    // Use cache orchestrator (not manual globalMutate)
    await invalidateCache('study:archived', { studyId })

    // Revalidate current list
    mutate()
  }, [mutate])

  return {
    studies: data?.data || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch: mutate,
    archiveStudy, // Mutations included but with orchestrator
  }
}
```

### Benefits
- ✅ Full control over caching behavior
- ✅ Supports complex query patterns
- ✅ Works with pagination
- ✅ Cache orchestrator handles cross-cache invalidation
- ✅ Simple to understand (no magic)

### Files Using This Pattern
- ✅ `use-all-studies.ts` (all studies with filters)
- ✅ `use-study-comments.ts` (paginated comments)
- ✅ `use-realtime-results.ts` (real-time updates)
- ✅ Most read-heavy hooks with complex queries

---

## Pattern 3: Zustand Stores

### When to Use
✅ Complex client-side state
✅ State doesn't directly map to server data
✅ Needs to be shared across many components
✅ Frequent state updates (doesn't warrant server roundtrip)
✅ Derived state or computed values
✅ Multi-step form state
✅ UI state that persists across routes

### When NOT to Use
❌ Server-synced data (use SWR instead)
❌ Data that needs caching/revalidation
❌ Simple component-local state
❌ State that maps 1:1 with API responses

### Example: study-flow-builder

```typescript
// stores/study-flow-builder/index.ts
import { create } from 'zustand'

interface FlowBuilderState {
  // Complex client-side state
  selectedQuestionId: string | null
  isDragging: boolean
  clipboard: Question | null
  undoStack: FlowState[]
  redoStack: FlowState[]

  // Actions
  selectQuestion: (id: string) => void
  startDrag: () => void
  undo: () => void
  redo: () => void
}

export const useFlowBuilder = create<FlowBuilderState>((set) => ({
  selectedQuestionId: null,
  isDragging: false,
  clipboard: null,
  undoStack: [],
  redoStack: [],

  selectQuestion: (id) => set({ selectedQuestionId: id }),
  startDrag: () => set({ isDragging: true }),
  undo: () => set((state) => {
    // Complex undo logic
  }),
  redo: () => set((state) => {
    // Complex redo logic
  }),
}))

// Usage:
const selectedId = useFlowBuilder((state) => state.selectedQuestionId)
const selectQuestion = useFlowBuilder((state) => state.selectQuestion)
```

### Benefits
- ✅ No re-renders for unsubscribed state
- ✅ Granular selectors
- ✅ Can persist to localStorage
- ✅ Dev tools integration
- ✅ Middleware support

### Files Using This Pattern
- ✅ `stores/study-flow-builder/` - Flow builder state
- ✅ `stores/study-meta-store.ts` - Study metadata
- ✅ `stores/survey-rules-store.ts` - Conditional logic rules
- ✅ `stores/segment-store/` - Participant segmentation

**IMPORTANT:** Always add `skipHydration: true` for SSR compatibility!

```typescript
export const useMyStore = create<MyState>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'my-store',
      skipHydration: true, // Critical for Next.js!
    }
  )
)
```

---

## Pattern 4: Context API

### When to Use
✅ Component tree needs shared state
✅ State doesn't need global access
✅ Props drilling becomes unwieldy (3+ levels)
✅ Scoped to a feature/page
✅ Moderate update frequency

### When NOT to Use
❌ Global state (use Zustand)
❌ Server data (use SWR)
❌ High-frequency updates (causes re-renders)
❌ State used across many routes

### Example: notes-section-context

```typescript
// contexts/notes-section-context.tsx
import { createContext, useContext, useState } from 'react'

interface NotesSectionContextValue {
  isOpen: boolean
  section: 'screening' | 'pre_study' | 'post_study' | null
  openNotes: (section: string) => void
  closeNotes: () => void
}

const NotesSectionContext = createContext<NotesSectionContextValue | null>(null)

export function NotesSectionProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [section, setSection] = useState(null)

  const value = {
    isOpen,
    section,
    openNotes: (s) => {
      setSection(s)
      setIsOpen(true)
    },
    closeNotes: () => setIsOpen(false),
  }

  return (
    <NotesSectionContext.Provider value={value}>
      {children}
    </NotesSectionContext.Provider>
  )
}

export function useNotesSection() {
  const context = useContext(NotesSectionContext)
  if (!context) throw new Error('Must be used within NotesSectionProvider')
  return context
}

// Usage:
const { isOpen, openNotes } = useNotesSection()
```

### Benefits
- ✅ Scoped to component tree
- ✅ No global state pollution
- ✅ TypeScript-safe
- ✅ Simple to understand

### Files Using This Pattern
- ✅ `contexts/notes-section-context.tsx` - Notes sidebar state
- ✅ `contexts/segment-context.tsx` - Segmentation UI state (backward compat layer)

---

## Pattern 5: useState (Local Component State)

### When to Use
✅ State local to single component
✅ Doesn't need to be shared
✅ Form inputs, UI toggles
✅ Ephemeral state (doesn't persist)

### When NOT to Use
❌ Needs to be shared across components
❌ Should persist across unmounts
❌ Server-synced data

### Example

```typescript
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
    </div>
  )
}
```

---

## Decision Flow Chart

```
START: Need to manage state
│
├─ Is this server data?
│  ├─ YES → Continue to Server Data Flow
│  └─ NO → Continue to Client State Flow
│
SERVER DATA FLOW:
│
├─ Simple CRUD operations?
│  ├─ YES → Use SWR CRUD Factory
│  │         Example: use-studies.ts, use-projects.ts
│  │
│  └─ NO → Complex queries/pagination?
│            └─ YES → Raw SWR + Cache Orchestrator
│                      Example: use-all-studies.ts, use-study-comments.ts
│
CLIENT STATE FLOW:
│
├─ Needs global access?
│  ├─ YES → Use Zustand
│  │         Example: study-flow-builder, segment-store
│  │
│  └─ NO → Scoped to component tree?
│           ├─ YES → Use Context API
│           │         Example: notes-section-context
│           │
│           └─ NO → Use useState
│                     Example: form inputs, UI toggles
```

---

## Common Patterns & Examples

### Server Data: CRUD Operations

**Use: SWR CRUD Factory**

```typescript
// ✅ Good - uses factory
import { createCRUDHook, createScopedArrayCRUDConfig } from '@/lib/swr/crud-factory'

const config = createScopedArrayCRUDConfig({
  name: 'tag',
  scopeParam: 'studyId',
  keyBuilder: (studyId) => `/api/studies/${studyId}/tags`,
  apiUrlBuilder: (studyId) => `/api/studies/${studyId}/tags`,
})

export const useStudyTags = createCRUDHook(config)
```

### Server Data: Complex Filtering

**Use: Raw SWR + Cache Orchestrator**

```typescript
// ✅ Good - complex filtering needs manual control
export function useFilteredStudies(filters: Filters) {
  const queryString = buildQueryString(filters)
  const { data, mutate } = useSWR(`/api/studies?${queryString}`)

  return { studies: data, refetch: mutate }
}
```

### Client State: Builder/Editor

**Use: Zustand**

```typescript
// ✅ Good - complex client state
export const useFlowBuilder = create<BuilderState>((set) => ({
  questions: [],
  selectedId: null,
  clipboard: null,
  addQuestion: (q) => set((s) => ({ questions: [...s.questions, q] })),
}))
```

### UI State: Modal/Sidebar

**Use: Context API or useState**

```typescript
// ✅ Good - scoped UI state
function useNotesSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  return { isOpen, toggle: () => setIsOpen(!isOpen) }
}
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Using Zustand for Server Data

```typescript
// ❌ BAD - server data should use SWR
const useStudiesStore = create((set) => ({
  studies: [],
  fetchStudies: async () => {
    const data = await fetch('/api/studies')
    set({ studies: data })
  },
}))

// ✅ GOOD - use SWR for server data
const { data: studies } = useSWR('/api/studies')
```

**Why bad:** No caching, no revalidation, manual error handling, no request deduplication

### ❌ Anti-Pattern 2: Using useState for Shared State

```typescript
// ❌ BAD - needs props drilling
function Parent() {
  const [selected, setSelected] = useState(null)
  return <Child selected={selected} setSelected={setSelected} />
}

function Child({ selected, setSelected }) {
  return <GrandChild selected={selected} setSelected={setSelected} />
}

// ✅ GOOD - use Context or Zustand
const useSelection = create((set) => ({
  selected: null,
  setSelected: (id) => set({ selected: id }),
}))
```

### ❌ Anti-Pattern 3: Duplicating Mutations Across Hooks

```typescript
// ❌ BAD - archiveStudy logic duplicated in multiple hooks
export function useAllStudies() {
  const archiveStudy = async (id) => {
    await api.archive(id)
    mutate() // Only invalidates THIS hook's cache
  }
}

export function useStudies(projectId) {
  const archiveStudy = async (id) => {
    await api.archive(id)
    mutate() // Only invalidates THIS hook's cache
  }
}

// ✅ GOOD - centralize mutations, use cache orchestrator
export function useAllStudies() {
  // Read-only (no mutations)
  const { data } = useSWR('/api/studies')
  return { studies: data }
}

export function useStudies(projectId) {
  // Has mutations + cache orchestrator
  const archiveStudy = async (id) => {
    await api.archive(id)
    await invalidateCache('study:archived', { studyId: id, projectId })
    // Orchestrator invalidates ALL related caches ✅
  }
}
```

### ❌ Anti-Pattern 4: Manual Cache Invalidation

```typescript
// ❌ BAD - manual invalidation (easy to miss caches)
await createStudy(data)
globalMutate(SWR_KEYS.projects)
globalMutate(SWR_KEYS.projectStudies(projectId))
// Forgot allStudies and dashboard!

// ✅ GOOD - use cache orchestrator
await createStudy(data)
await invalidateCache('study:created', { projectId, studyId })
// Automatically invalidates ALL related caches
```

---

## Migration Strategies

### Migrating from Raw SWR to CRUD Factory

**When to migrate:**
- Hook has simple CRUD operations
- No complex filtering logic
- Standard REST API pattern
- Would benefit from optimistic updates

**How to migrate:**

1. **Identify the CRUD operations**
   ```typescript
   // Current (raw SWR)
   const { data } = useSWR('/api/studies')
   const create = async (data) => { ... }
   const update = async (id, data) => { ... }
   ```

2. **Create factory config**
   ```typescript
   const config = createArrayCRUDConfig({
     name: 'study',
     keyBuilder: () => '/api/studies',
     apiUrlBuilder: () => '/api/studies',
   })
   ```

3. **Use factory hook**
   ```typescript
   export const useStudies = createCRUDHook(config)
   ```

4. **Update components**
   ```typescript
   // Before
   const { data, create } = useStudies()

   // After (same API!)
   const { data, create } = useStudies()
   ```

### When NOT to Migrate

**Keep raw SWR if:**
- Hook has complex filtering (use-all-studies)
- Uses pagination with dynamic params
- Has custom caching logic
- Would require significant factory API changes

**Just add cache orchestrator instead:**
```typescript
// Keep raw SWR
const { data, mutate } = useSWR(complexKey)

// Add cache orchestrator for mutations
const archive = async (id) => {
  await api.archive(id)
  await invalidateCache('entity:archived', { id })
  mutate()
}
```

---

## Real-World Examples

### Example 1: Study Management

```typescript
// ✅ use-studies.ts - CRUD Factory (scoped to project)
export const useStudies = createCRUDHook(
  createScopedArrayCRUDConfig({
    scopeParam: 'projectId',
    // ... config
  })
)

// ✅ use-all-studies.ts - Raw SWR (filtering + pagination)
export function useAllStudies(filters, pagination) {
  const { data, mutate } = useSWR(buildKey(filters, pagination))
  // No mutations - use useStudies for that
  return { studies: data, refetch: mutate }
}

// Usage strategy:
// - List/filter studies → useAllStudies
// - CRUD operations → useStudies (pass projectId)
```

### Example 2: Comments

```typescript
// ✅ use-study-comments.ts - Raw SWR (pagination + real-time)
export function useStudyComments(studyId: string) {
  const [page, setPage] = useState(1)
  const { data, mutate } = useSWR(['/api/comments', studyId, page])

  const createComment = async (content) => {
    // Optimistic update (manual)
    mutate(data => [...data, tempComment], false)

    const comment = await api.createComment(content)

    // Cache orchestrator for cross-cache invalidation
    await invalidateCache('comment:created', { studyId })

    mutate()
    return comment
  }

  return {
    comments: data?.comments || [],
    createComment,
    loadMore: () => setPage(p => p + 1),
  }
}
```

### Example 3: Flow Builder State

```typescript
// ✅ stores/study-flow-builder - Zustand (complex client state)
export const useFlowBuilder = create<FlowBuilderState>((set, get) => ({
  questions: [],
  sections: [],

  addQuestion: (question) => set((state) => ({
    questions: [...state.questions, question],
  })),

  moveQuestion: (from, to) => set((state) => {
    // Complex reordering logic
    const newQuestions = reorderQuestions(state.questions, from, to)
    return { questions: newQuestions }
  }),

  // ... 20+ more actions
}))

// Why Zustand here?
// - Complex state transformations
// - Many actions
// - Needs undo/redo
// - Client-side only (not server synced directly)
```

---

## Cache Orchestrator Integration

### All Patterns Work with Cache Orchestrator

```typescript
// Pattern 1: CRUD Factory + Orchestrator
const { create } = useStudies(projectId)
const study = await create(data)
await invalidateCache('study:created', { projectId, studyId: study.id })

// Pattern 2: Raw SWR + Orchestrator
const { mutate } = useSWR(key)
await api.update(id, data)
await invalidateCache('entity:updated', { id })
mutate()

// Pattern 3: Zustand + Orchestrator
const updateServerState = async () => {
  await api.save(zustandState)
  await invalidateCache('entity:updated', { id })
}

// Pattern 4: Context + Orchestrator
const { update } = useMyContext()
await api.save(data)
await invalidateCache('entity:updated', { id })
update(data) // Update local context too
```

**Key insight:** Cache orchestrator is **complementary** to all patterns, handling cross-cache invalidation regardless of which state pattern you use.

---

## FAQ

### Q: Why do we have both `use-studies` and `use-all-studies`?

**A:**
- `use-studies` - Scoped to a project, CRUD operations, optimistic updates
- `use-all-studies` - All studies across projects, filtering, search, read-only

They serve different purposes. Use `useStudies` for mutations, `useAllStudies` for listing/filtering.

### Q: When should I create a new Zustand store?

**A:** Only when:
1. State is complex (10+ fields)
2. Has many actions (5+ operations)
3. Doesn't directly map to server data
4. Needs to persist across route changes

Otherwise, use SWR or Context.

### Q: Can I mix patterns in one component?

**A:** Yes! Common pattern:
```typescript
function MyComponent() {
  // Server data (SWR)
  const { data: studies } = useStudies(projectId)

  // Client state (Zustand)
  const selectedId = useFlowBuilder((s) => s.selectedQuestionId)

  // Local UI state (useState)
  const [isEditing, setIsEditing] = useState(false)

  // All work together!
}
```

### Q: Should I migrate all hooks to CRUD factory?

**A:** No! Only migrate if:
- Hook fits the factory pattern (simple CRUD)
- Would benefit from optimistic updates
- Doesn't have complex query logic

Keep raw SWR for complex cases.

---

## Checklist for New Features

When building a new feature, ask:

**Is this server data?**
- [ ] YES → Go to Server Data Checklist
- [ ] NO → Go to Client State Checklist

**Server Data Checklist:**
- [ ] Simple CRUD? → Use SWR CRUD Factory
- [ ] Complex queries? → Use Raw SWR + Cache Orchestrator
- [ ] Mutations trigger cross-cache invalidation? → Use `invalidateCache()`
- [ ] Read-only? → Simple `useSWR(key)`

**Client State Checklist:**
- [ ] Global state? → Use Zustand
- [ ] Component tree state? → Use Context
- [ ] Single component? → Use useState
- [ ] Needs persistence? → Zustand with persist middleware

**Cache Invalidation Checklist:**
- [ ] Imported `invalidateCache`?
- [ ] Triggering appropriate event?
- [ ] Providing all metadata (IDs, etc.)?
- [ ] Tested that related caches invalidate?

---

## Summary Table

| Pattern | Use For | Pros | Cons | Examples |
|---------|---------|------|------|----------|
| **SWR CRUD Factory** | Simple server CRUD | Optimistic updates, less code | Limited to standard patterns | use-studies, use-projects |
| **Raw SWR + Orchestrator** | Complex server queries | Full control, pagination | More boilerplate | use-all-studies, use-study-comments |
| **Zustand** | Complex client state | Global, granular selectors, no re-renders | Overkill for simple state | study-flow-builder, segment-store |
| **Context API** | Tree-scoped state | Simple, scoped | Re-renders, no global access | notes-section-context |
| **useState** | Local component state | Simplest | Not shareable | Form inputs, UI toggles |

---

## Next Steps

1. **Read this guide** before choosing a state pattern
2. **Use the decision flow chart** when unsure
3. **Follow the examples** for your use case
4. **Ask the team** if still uncertain
5. **Document your choice** in code comments if non-obvious

---

**Document Owner:** Development Team
**Last Updated:** January 16, 2026
**Questions?** Discuss in team chat or add to this doc
