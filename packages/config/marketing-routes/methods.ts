import type { EditionAvailability } from './index'

export interface ResearchMethodMarketingDefinition {
  slug:
    | 'card-sorting'
    | 'tree-testing'
    | 'surveys'
    | 'prototype-testing'
    | 'first-click-testing'
    | 'first-impression-testing'
    | 'live-website-testing'
  name: string
  shortDescription: string
  editionAvailability: EditionAvailability
  verifiedCapabilities: readonly string[]
  operatingNote: string
  evidencePaths: readonly string[]
}

export const researchMethodFeatureMatrix: readonly ResearchMethodMarketingDefinition[] = [
  {
    slug: 'card-sorting',
    name: 'Card sorting',
    shortDescription: 'Learn how participants group and label information with open, closed, or hybrid sorts.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Open, closed, and hybrid modes', 'Participant sorting flow', 'Similarity and agreement analysis'],
    operatingNote: 'Available in hosted and self-hosted editions.',
    evidencePaths: ['packages/@veritio/card-sort', 'apps/veritio/src/steps/api/cards'],
  },
  {
    slug: 'tree-testing',
    name: 'Tree testing',
    shortDescription: 'Validate information architecture by asking participants to find destinations in a text hierarchy.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Task-based navigation', 'Path and backtrack capture', 'Directness and success analysis'],
    operatingNote: 'Available in hosted and self-hosted editions.',
    evidencePaths: ['apps/veritio/src/components/builders/tree-test', 'apps/veritio/src/services/results/tree-test'],
  },
  {
    slug: 'surveys',
    name: 'Surveys',
    shortDescription: 'Collect structured and open-ended responses in a configurable study flow.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Reusable question types', 'Required questions and validation', 'Branching and display logic'],
    operatingNote: 'AI-assisted authoring and analysis require the operator’s own configured model credentials when self-hosted.',
    evidencePaths: ['packages/@veritio/study-flow', 'apps/veritio/src/steps/api/survey'],
  },
  {
    slug: 'prototype-testing',
    name: 'Prototype testing',
    shortDescription: 'Observe task completion, paths, clicks, and timing on interactive prototypes.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Task-based prototype studies', 'Click and navigation path capture', 'Task-level results analysis'],
    operatingNote: 'Prototype URL support is available. This page does not claim automatic Figma file import.',
    evidencePaths: ['packages/@veritio/prototype-test', 'apps/veritio/src/components/players/prototype-test'],
  },
  {
    slug: 'first-click-testing',
    name: 'First-click testing',
    shortDescription: 'Measure where participants click first when completing a task on a design.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Image-based tasks', 'First-click coordinate capture', 'Click-map analysis'],
    operatingNote: 'Available in hosted and self-hosted editions; operators provide their own object storage configuration.',
    evidencePaths: ['apps/veritio/src/components/builders/first-click', 'apps/veritio/src/services/results/first-click'],
  },
  {
    slug: 'first-impression-testing',
    name: 'First-impression testing',
    shortDescription: 'Show a design for a controlled interval, then collect recall and perception feedback.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Timed exposure', 'Follow-up study questions', 'Participant response analysis'],
    operatingNote: 'Available in hosted and self-hosted editions; operators provide their own object storage configuration.',
    evidencePaths: ['apps/veritio/src/components/builders/first-impression', 'apps/veritio/src/services/results/first-impression'],
  },
  {
    slug: 'live-website-testing',
    name: 'Live website testing',
    shortDescription: 'Run task-based studies against a live site and capture interaction events and paths.',
    editionAvailability: 'both',
    verifiedCapabilities: ['Task and success criteria', 'Click and navigation event capture', 'Optional session recording flows'],
    operatingNote: 'Self-hosted reverse-proxy mode requires the separate Cloudflare Worker and correctly configured Supabase and API origins.',
    evidencePaths: ['workers/proxy-worker.ts', 'apps/veritio/src/components/players/live-website'],
  },
] as const

export function findResearchMethod(slug: string) {
  return researchMethodFeatureMatrix.find((method) => method.slug === slug)
}
