'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ArrowRight, RefreshCw, Plug } from 'lucide-react'

/** Minimal integration info needed for auto-generating chips */
export interface ConnectedIntegration {
  toolkit: string
  name: string
  logo: string | null
}

const DISPLAY_COUNT = 5

// -- Results mode suggestions (study-type specific) --
const RESULTS_SUGGESTIONS: Record<string, string[]> = {
  card_sort: [
    'What was the overall agreement rate?',
    'Which categories had the most disagreement?',
    'Show me the similarity matrix',
    'Which cards were most often grouped together?',
    'What patterns emerged in the sort?',
    'Compare agreement across participant groups',
  ],
  tree_test: [
    'Which tasks had the lowest success rate?',
    'Show me the average task completion time',
    'Where did participants go wrong most often?',
    'Which paths were most commonly taken?',
    'Compare direct vs indirect success rates',
    'What was the first-click correctness rate?',
  ],
  prototype_test: [
    'Which tasks did participants struggle with?',
    'What was the average misclick rate?',
    'Show me the most common navigation paths',
    'Which screens had the highest drop-off?',
    'Compare task completion times',
    'What was the average success rate?',
  ],
  first_click: [
    'What areas got the most clicks?',
    'Which tasks had the fastest response?',
    'Show me the click distribution patterns',
    'What percentage clicked the correct area?',
    'Compare click accuracy across tasks',
    'Which task had the most scattered clicks?',
  ],
  first_impression: [
    'What were the most common impressions?',
    'Which designs scored highest?',
    'Compare ratings across designs',
    'What themes appeared in open responses?',
    'Which design had the most polarized reactions?',
    'Summarize the qualitative feedback',
  ],
  survey: [
    'Summarize the survey responses',
    'Which questions had the most varied answers?',
    'What were the most common themes?',
    'Show me response distributions',
    'Are there any notable correlations?',
    'Which questions had the lowest completion rate?',
  ],
  _common: [
    'Summarize the key findings',
    'How many participants completed the study?',
    'What are the main takeaways?',
    'Are there any surprising patterns?',
    'What should I improve for next time?',
    'Generate a report summary',
  ],
}

// -- Builder mode suggestions (study-type specific, used as fallback when no tab) --
const BUILDER_SUGGESTIONS: Record<string, string[]> = {
  card_sort: [
    'Help me organize my card categories',
    'Suggest more cards for my sort',
    'Review my category names',
    'How many cards should I include?',
    'Help me write card labels',
    'Should I use an open or closed sort?',
  ],
  tree_test: [
    'Build a navigation tree for my website',
    'Generate a tree structure for e-commerce',
    'Help me organize my top-level categories',
    'Review my tree depth and balance',
    'Suggest labels for my navigation nodes',
    'How many levels should my tree have?',
  ],
  prototype_test: [
    'Help me define success criteria',
    'Review my task instructions',
    'Suggest more test tasks',
    'What makes a good prototype task?',
    'Help me set up success pathways',
    'Review my task difficulty levels',
  ],
  first_click: [
    'Help me write clear task descriptions',
    'Suggest tasks for my design',
    'Review my time limits',
    'How should I define click targets?',
    'Help me improve task clarity',
    'What makes a good first-click task?',
  ],
  first_impression: [
    'Help me write better questions',
    'Suggest rating scales for my study',
    'Review my display durations',
    'How many designs should I test?',
    'Help me set up comparison questions',
    'What questions work best for impressions?',
  ],
  survey: [
    'Help me improve my survey questions',
    'Suggest follow-up questions',
    'Review my question types',
    'Help me reduce survey length',
    'Are my questions biased?',
    'Suggest better answer options',
  ],
  _common: [
    'Review my study configuration',
    'Help me write better instructions',
    'How can I improve my study?',
    'Is my study too long?',
    'Help me write a good welcome message',
    'What am I missing?',
  ],
}

// -- Section-aware study-flow suggestions --
const FLOW_SECTION_SUGGESTIONS: Record<string, string[]> = {
  welcome: [
    'Write a welcome message',
    'Include study expectations',
    'Add incentive info',
    'Should I show study title?',
    'Help me introduce the study',
  ],
  agreement: [
    'Write a consent agreement',
    'What should consent include?',
    'Set up rejection handling',
    'Help with ethics text',
  ],
  screening: [
    'Add screening questions',
    'Set up rejection rules',
    'Help write eligibility criteria',
    'Add branching logic',
  ],
  identifier: [
    'Which demographic fields to collect?',
    'Set up anonymous mode',
    'Enable email collection',
    'Choose identifier type',
  ],
  pre_study: [
    'Add pre-study questions',
    'Gauge participant familiarity',
    'Randomize question order?',
    'Write intro text',
  ],
  instructions: [
    'Write activity instructions',
    'Review instruction clarity',
    'Split into two parts?',
    'Help explain the task',
  ],
  post_study: [
    'Add post-study feedback',
    'Add difficulty rating',
    'Add SUS questionnaire',
    'Open-ended feedback?',
  ],
  survey: [
    'Add survey questions',
    'Suggest question types',
    'Set up custom sections',
    'Add display logic',
  ],
  thank_you: [
    'Write a thank you message',
    'Set up redirect URL',
    'Add incentive confirmation',
    'Configure redirect delay',
  ],
  closed: [
    'Write a closed study message',
    'Set up redirect for late visitors',
    'What to tell late participants?',
  ],
  prototype_settings: [
    'Review prototype settings',
    'Configure task options',
    'Randomize task order?',
  ],
}

// -- Tab-aware builder suggestions --
function getBuilderSuggestionsForTab(studyType: string, activeTab: string, activeFlowSection?: string): string[] {
  // When on study-flow tab with a specific section, use section-specific suggestions
  if (activeTab === 'study-flow' && activeFlowSection && FLOW_SECTION_SUGGESTIONS[activeFlowSection]) {
    return FLOW_SECTION_SUGGESTIONS[activeFlowSection]
  }
  switch (activeTab) {
    case 'details':
      return [
        'Help me write a study description',
        'Suggest a purpose statement',
        'Review my study title',
        'Help me define the target audience',
        'What details should I include?',
        'Improve my study description',
      ]
    case 'tree':
      return [
        'Help me improve my tree structure',
        'Suggest more tree nodes',
        'Review my tree depth and balance',
        'Are my labels intuitive?',
        'Help me reorganize this section',
        'Is my tree too deep or too flat?',
      ]
    case 'tasks':
      return [
        'Suggest tasks for my tree test',
        'Help me write task instructions',
        'Review my task difficulty',
        'Are my tasks realistic?',
        'Help me set correct answers',
        'How many tasks should I include?',
      ]
    case 'content':
      return [
        'Help me organize my card categories',
        'Suggest more cards for my sort',
        'Review my card labels',
        'Are my categories balanced?',
        'Help me name my categories',
        'How many cards is too many?',
      ]
    case 'prototype':
      return [
        'Help me set up my prototype tasks',
        'What makes good success criteria?',
        'Review my prototype configuration',
        'How should I organize test flows?',
        'Help me define task scenarios',
        'What should participants focus on?',
      ]
    case 'prototype-tasks':
      return [
        'Help me define success criteria',
        'Review my task instructions',
        'Suggest more test tasks',
        'Are my pathways realistic?',
        'Help me write scenario descriptions',
        'Should I add practice tasks?',
      ]
    case 'first-click-tasks':
      return [
        'Help me write clear task descriptions',
        'Suggest tasks for my design',
        'Review my time limits',
        'Help me define click targets',
        'Are my tasks too easy or hard?',
        'What task order works best?',
      ]
    case 'first-impression-designs':
      return [
        'Help me write better questions',
        'Suggest display durations',
        'Review my design setup',
        'How long should each design show?',
        'Help me pick rating scales',
        'Should I randomize design order?',
      ]
    case 'study-flow':
      return [
        'Help me set up the participant flow',
        'Write a welcome message',
        'Help me add screening questions',
        'Review my thank-you message',
        'Should I add a consent step?',
        'Help me configure completion redirects',
        ...(studyType === 'survey' ? [
          'Help me improve my survey questions',
          'Suggest question types to use',
        ] : []),
      ]
    case 'settings':
      return [
        'Review my study configuration',
        'What settings should I change?',
        'Help me set up randomization',
        'Should I enable a time limit?',
        'Review my completion settings',
        'What are the best settings for my study?',
      ]
    case 'branding':
      return [
        'What branding options are available?',
        'Help me customize the look and feel',
        'Suggest a color scheme',
        'How do I add my logo?',
        'Help me match my brand guidelines',
        'What branding makes studies feel professional?',
      ]
    default:
      return []
  }
}

// -- Custom label overrides for polished integration copy --
const INTEGRATION_LABELS: Record<string, Record<string, string>> = {
  results: {
    googlesheets: 'Export results to Google Sheets',
    googledocs: 'Create a report in Google Docs',
    gmail: 'Email results to my team',
  },
  builder: {
    googlesheets: 'Import data from Google Sheets',
    googledocs: 'Generate instructions from a doc',
    gmail: 'Email a test link to my team',
  },
}

interface IntegrationChip {
  label: string
  logo: string | null
}

/** Auto-generate integration chips for any connected toolkit */
function getIntegrationChips(mode: string, integrations: ConnectedIntegration[]): IntegrationChip[] {
  return integrations.map(({ toolkit, name, logo }) => {
    const label = INTEGRATION_LABELS[mode]?.[toolkit]
      ?? (mode === 'results' ? `What can I do with ${name}?` : `Use ${name} with my study`)
    return { label, logo }
  })
}

/** Deterministic shuffle using a simple LCG seed */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr]
  let s = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** Returns the primary suggestion label strings for use as rotating placeholders */
export function getSuggestions(studyType: string, mode: 'results' | 'builder', activeTab?: string, activeFlowSection?: string): string[] {
  if (mode === 'builder' && activeTab) {
    return getBuilderSuggestionsForTab(studyType, activeTab, activeFlowSection)
  }
  const map = mode === 'builder' ? BUILDER_SUGGESTIONS : RESULTS_SUGGESTIONS
  return [...(map[studyType] ?? []), ...(map._common ?? [])]
}

interface SuggestionChipsProps {
  studyType: string
  mode: 'results' | 'builder'
  connectedIntegrations: ConnectedIntegration[]
  onSelect: (text: string) => void
  activeTab?: string
  activeFlowSection?: string
  /** AI-generated suggestions replace hardcoded ones when provided */
  aiSuggestions?: string[] | null
  /** AI-generated integration suggestions replace hardcoded ones when provided */
  aiIntegrationSuggestions?: { toolkit: string; label: string }[] | null
  /** Whether AI suggestions are currently loading */
  isLoadingSuggestions?: boolean
  /** Whether AI integration suggestions are currently loading */
  isLoadingIntegrations?: boolean
  /** Called when user clicks refresh on the "Try asking" section */
  onRefreshSuggestions?: () => void
  /** Called when user clicks refresh on the "Integrations" section */
  onRefreshIntegrations?: () => void
}

function SuggestionButton({ label, onSelect }: { label: string; onSelect: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(label)}
      className="group flex items-center gap-2.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-[13px] text-foreground/90 hover:bg-accent hover:border-border hover:text-foreground transition-all duration-150 cursor-pointer text-left"
    >
      <span className="flex-1 leading-snug">{label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
    </button>
  )
}

function IntegrationChipButton({ chip, onSelect }: { chip: IntegrationChip; onSelect: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(chip.label)}
      className="group flex items-center gap-2.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-[13px] text-foreground/90 hover:bg-accent hover:border-border hover:text-foreground transition-all duration-150 cursor-pointer text-left"
    >
      {chip.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chip.logo} alt="" className="h-3.5 w-3.5 rounded-sm flex-shrink-0" />
      ) : (
        <Plug className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-150 flex-shrink-0" />
      )}
      <span className="flex-1 leading-snug">{chip.label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
    </button>
  )
}

function SectionHeader({ label, onRefresh, isLoading }: { label: string; onRefresh?: () => void; isLoading?: boolean }) {
  return (
    <div className="flex items-center justify-between px-0.5 mb-0.5">
      <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">{label}</p>
      {onRefresh && (
        <button
          type="button"
          onClick={isLoading ? undefined : onRefresh}
          className={`p-0.5 rounded hover:bg-accent text-muted-foreground/50 hover:text-muted-foreground transition-colors ${isLoading ? 'pointer-events-none' : 'cursor-pointer'}`}
          title="More suggestions"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  )
}

export function SuggestionChips({ studyType, mode, connectedIntegrations, onSelect, activeTab, activeFlowSection, aiSuggestions, aiIntegrationSuggestions, isLoadingSuggestions, isLoadingIntegrations, onRefreshSuggestions, onRefreshIntegrations }: SuggestionChipsProps) {
  const [primarySeed, setPrimarySeed] = useState(0)
  const [integrationSeed, setIntegrationSeed] = useState(0)

  // Reset seeds when context changes (tab switch, mode switch, section switch)
  useEffect(() => {
    setPrimarySeed(0) // eslint-disable-line react-hooks/set-state-in-effect
    setIntegrationSeed(0)  
  }, [studyType, mode, activeTab, activeFlowSection])

  // All hardcoded primary suggestions for current context (used as fallback)
  const allHardcodedSuggestions = useMemo(() => {
    if (mode === 'builder' && activeTab) {
      return getBuilderSuggestionsForTab(studyType, activeTab, activeFlowSection)
    }
    const map = mode === 'builder' ? BUILDER_SUGGESTIONS : RESULTS_SUGGESTIONS
    return [...(map[studyType] ?? []), ...(map._common ?? [])]
  }, [studyType, mode, activeTab, activeFlowSection])

  // Use AI suggestions when available, otherwise fall back to hardcoded with shuffle
  const displayedSuggestions = useMemo(() => {
    if (aiSuggestions && aiSuggestions.length > 0) return aiSuggestions
    if (allHardcodedSuggestions.length <= DISPLAY_COUNT) return allHardcodedSuggestions
    return shuffleWithSeed(allHardcodedSuggestions, primarySeed).slice(0, DISPLAY_COUNT)
  }, [aiSuggestions, allHardcodedSuggestions, primarySeed])

  const canRefreshSuggestions = !!onRefreshSuggestions || allHardcodedSuggestions.length > DISPLAY_COUNT

  // All hardcoded integration chips
  const allHardcodedIntegrationChips = useMemo(
    () => getIntegrationChips(mode, connectedIntegrations),
    [mode, connectedIntegrations]
  )

  // Build a logo lookup map from connected integrations
  const logoMap = useMemo(
    () => new Map(connectedIntegrations.map((c) => [c.toolkit, c.logo])),
    [connectedIntegrations]
  )

  // Use AI integration suggestions when available, otherwise fall back to hardcoded
  const displayedIntegrations = useMemo(() => {
    if (aiIntegrationSuggestions && aiIntegrationSuggestions.length > 0) {
      return aiIntegrationSuggestions.map((s) => ({
        label: s.label,
        logo: logoMap.get(s.toolkit) ?? null,
      }))
    }
    if (allHardcodedIntegrationChips.length <= DISPLAY_COUNT) return allHardcodedIntegrationChips
    return shuffleWithSeed(allHardcodedIntegrationChips, integrationSeed).slice(0, DISPLAY_COUNT)
  }, [aiIntegrationSuggestions, logoMap, allHardcodedIntegrationChips, integrationSeed])

  const canRefreshIntegrations = !!onRefreshIntegrations || allHardcodedIntegrationChips.length > DISPLAY_COUNT

  const handleRefreshSuggestions = useCallback(() => {
    // Always bump seed for instant visual feedback (hardcoded shuffle)
    setPrimarySeed(Math.floor(Math.random() * 100000))  
    // Also attempt AI generation — if it succeeds, aiSuggestions will override the shuffle
    onRefreshSuggestions?.()
  }, [onRefreshSuggestions])

  const handleRefreshIntegrations = useCallback(() => {
    // Always bump seed for instant visual feedback
    setIntegrationSeed(Math.floor(Math.random() * 100000))  
    // Also attempt AI generation
    onRefreshIntegrations?.()
  }, [onRefreshIntegrations])

  if (displayedSuggestions.length === 0 && displayedIntegrations.length === 0) return null

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Primary suggestions */}
      <div className="flex flex-col gap-1.5">
        <SectionHeader
          label="Try asking"
          onRefresh={canRefreshSuggestions ? handleRefreshSuggestions : undefined}
          isLoading={isLoadingSuggestions}
        />
        {displayedSuggestions.map((label) => (
          <SuggestionButton key={label} label={label} onSelect={onSelect} />
        ))}
      </div>

      {/* Integration suggestions */}
      {displayedIntegrations.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionHeader
            label="Integrations"
            onRefresh={canRefreshIntegrations ? handleRefreshIntegrations : undefined}
            isLoading={isLoadingIntegrations}
          />
          {displayedIntegrations.map((chip) => (
            <IntegrationChipButton key={chip.label} chip={chip} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
