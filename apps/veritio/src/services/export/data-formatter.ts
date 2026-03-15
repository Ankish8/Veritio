/**
 * Export Data Formatter
 *
 * Formats study data into batched export format.
 * Reuses formatters from assistant/study-tools.ts but adapts them
 * to work with batch data instead of full datasets.
 *
 * Supports all study types: card-sort, tree-test, survey, prototype-test,
 * first-click, first-impression.
 */

/**
 * Export batch format expected by adapters (Google Sheets, CSV, etc.)
 */
export interface ExportDataBatch {
  sheetName: string
  headers: string[]
  rows: (string | number)[][]
}

/**
 * Format export batch from study data
 *
 * @param studyType - Type of study (survey, card_sort, etc.)
 * @param participants - Array of participant records
 * @param responses - Array of response records (type varies by study)
 * @param metadata - Additional metadata (tasks, cards, nodes, etc.)
 * @returns Formatted batch ready for export
 */
export function formatExportBatch(
  studyType: string,
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  switch (studyType) {
    case 'survey':
      return formatSurveyBatch(participants, responses, metadata)
    case 'first_impression':
      return formatFirstImpressionBatch(participants, responses, metadata)
    case 'card_sort':
      return formatCardSortBatch(participants, responses, metadata)
    case 'tree_test':
      return formatTreeTestBatch(participants, responses, metadata)
    case 'first_click':
      return formatFirstClickBatch(participants, responses, metadata)
    case 'prototype_test':
      return formatPrototypeTestBatch(participants, responses, metadata)
    default:
      return {
        sheetName: 'Responses',
        headers: ['Participant ID'],
        rows: participants.map((p) => [p.id]),
      }
  }
}

// ---------------------------------------------------------------------------
// Helper utilities (reused from assistant/study-tools.ts)
// ---------------------------------------------------------------------------

function formatExportValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'object' && v !== null)
          return v.label ?? v.value ?? v.text ?? JSON.stringify(v)
        return String(v)
      })
      .join('; ')
  }
  if (typeof value === 'object') {
    if ('value' in value && value.value !== undefined) return String(value.value)
    if ('selected' in value && Array.isArray(value.selected))
      return value.selected.map(String).join('; ')
    return JSON.stringify(value)
  }
  return String(value)
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Study-specific formatters
// ---------------------------------------------------------------------------

/**
 * Format survey responses
 * Adapts formatSurveyResponses() from study-tools.ts (lines 582-606)
 */
function formatSurveyBatch(
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  const questions: any[] = metadata?.flowQuestions ?? []

  const sorted = [...questions].sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section)
    return (a.position ?? 0) - (b.position ?? 0)
  })

  // Build participant → question → response map
  const byParticipant = new Map<string, Map<string, any>>()
  for (const r of responses) {
    if (!byParticipant.has(r.participant_id))
      byParticipant.set(r.participant_id, new Map())
    byParticipant.get(r.participant_id)!.set(r.question_id, r)
  }

  const qLabels = sorted.map(
    (q, i) => stripHtml(q.question_text || '').slice(0, 60) || `Q${i + 1}`,
  )
  const headers = ['Participant ID', ...qLabels]
  const rows: (string | number)[][] = []

  for (const [pid, qMap] of byParticipant) {
    rows.push([
      pid,
      ...sorted.map((q) => formatExportValue(qMap.get(q.id)?.response_value)),
    ])
  }

  return { sheetName: 'Responses', headers, rows }
}

/**
 * Format first impression responses
 * Adapts formatFirstImpressionResponses() from study-tools.ts (lines 610-633)
 */
function formatFirstImpressionBatch(
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  const designs: any[] = metadata?.designs ?? []

  const headers = ['Participant ID', 'Design', 'Question', 'Response', 'Response Time (ms)']
  const rows: (string | number)[][] = []

  const designMap = new Map(designs.map((d: any) => [d.id, d]))

  for (const r of responses) {
    const design = designMap.get(r.design_id)
    const designName = design?.name ?? r.design_id
    const questionText = r.question_text ?? r.question_id ?? ''
    rows.push([
      r.participant_id ?? r.session_id ?? '',
      designName,
      stripHtml(questionText),
      formatExportValue(r.response_value ?? r.value),
      r.response_time_ms ?? '',
    ])
  }

  return { sheetName: 'Responses', headers, rows }
}

/**
 * Format card sort responses
 * Adapts formatCardSortResponses() from study-tools.ts (lines 637-656)
 */
function formatCardSortBatch(
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  const cards: any[] = metadata?.cards ?? []

  const cardLabels = cards.map((c: any) => c.label)
  const headers = ['Participant ID', 'Duration (s)', ...cardLabels]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const placements = r.card_placements ?? {}
    const durationSec = r.total_time_ms ? Math.round(r.total_time_ms / 1000) : ''
    rows.push([
      r.participant_id,
      durationSec,
      ...cards.map((c: any) => placements[c.id] ?? ''),
    ])
  }

  return { sheetName: 'Responses', headers, rows }
}

/**
 * Format tree test responses
 * Adapts formatTreeTestResponses() from study-tools.ts (lines 660-693)
 */
function formatTreeTestBatch(
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  const tasks: any[] = metadata?.tasks ?? []
  const nodes: any[] = metadata?.nodes ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]))

  const headers = [
    'Participant ID',
    'Task',
    'Selected Node',
    'Correct Answer',
    'Is Correct',
    'Is Direct',
    'Path Taken',
    'Time (ms)',
  ]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const task = taskMap.get(r.task_id)
    const selectedNode = r.selected_node_id ? nodeMap.get(r.selected_node_id) : null
    const correctNode = task?.correct_node_id ? nodeMap.get(task.correct_node_id) : null
    const pathLabels = (r.path_taken ?? [])
      .map((id: string) => nodeMap.get(id)?.label ?? id)
      .join(' > ')

    rows.push([
      r.participant_id,
      task?.question ?? task?.title ?? '',
      selectedNode?.label ?? '',
      correctNode?.label ?? '',
      r.is_correct ? 'Yes' : 'No',
      r.is_direct ? 'Yes' : 'No',
      pathLabels,
      r.total_time_ms ?? '',
    ])
  }

  return { sheetName: 'Responses', headers, rows }
}

/**
 * Format first click responses
 * Adapts formatFirstClickResponses() from study-tools.ts (lines 697-722)
 */
function formatFirstClickBatch(
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  const tasks: any[] = metadata?.tasks ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))

  const headers = [
    'Participant ID',
    'Task',
    'Click X',
    'Click Y',
    'Is Correct',
    'Time to Click (ms)',
  ]
  const rows: (string | number)[][] = []

  for (const r of responses) {
    const task = taskMap.get(r.task_id)
    rows.push([
      r.participant_id,
      task?.instruction ?? '',
      r.click_x ?? '',
      r.click_y ?? '',
      r.is_correct ? 'Yes' : 'No',
      r.time_to_click_ms ?? '',
    ])
  }

  return { sheetName: 'Responses', headers, rows }
}

/**
 * Format prototype test responses
 * Adapts formatPrototypeTestResponses() from study-tools.ts (lines 726-752)
 */
function formatPrototypeTestBatch(
  participants: any[],
  responses: any[],
  metadata?: any,
): ExportDataBatch {
  const tasks: any[] = metadata?.tasks ?? []

  const taskMap = new Map(tasks.map((t: any) => [t.id, t]))

  const headers = [
    'Participant ID',
    'Task',
    'Outcome',
    'Time (ms)',
    'Click Count',
    'Misclick Count',
    'Is Direct',
  ]
  const rows: (string | number)[][] = []

  // For prototype test, responses are taskAttempts
  for (const a of responses) {
    const task = taskMap.get(a.task_id)
    rows.push([
      a.participant_id,
      task?.title ?? '',
      a.outcome ?? '',
      a.total_time_ms ?? '',
      a.click_count ?? 0,
      a.misclick_count ?? 0,
      a.is_direct ? 'Yes' : 'No',
    ])
  }

  return { sheetName: 'Responses', headers, rows }
}
