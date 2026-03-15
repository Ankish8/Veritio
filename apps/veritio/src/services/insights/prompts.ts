/**
 * LLM system prompts for insights report generation.
 * Each group of sections gets a tailored prompt with the data summary.
 */

import type { StudySummary } from './data-summarizer'
import type { SectionDefinition } from './section-definitions'

const STUDY_TYPE_LABELS: Record<string, string> = {
  card_sort: 'Card Sort',
  tree_test: 'Tree Test',
  survey: 'Survey',
  prototype_test: 'Prototype Test',
  first_click: 'First Click',
  first_impression: 'First Impression',
  live_website_test: 'Live Website Test',
}

function buildBaseContext(summary: StudySummary): string {
  return `# Study Context
- **Title:** ${summary.studyTitle}
- **Type:** ${STUDY_TYPE_LABELS[summary.studyType] || summary.studyType}
- **Participants:** ${summary.participantCount} total, ${summary.completedCount} completed (${summary.completionRate}% completion rate)
- **Average Completion Time:** ${formatTime(summary.avgCompletionTimeMs)}`
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

const JSON_FORMAT_INSTRUCTIONS = `
## Output Format
Respond ONLY with valid JSON matching this exact structure (no markdown, no code fences):
{
  "sections": [
    {
      "id": "<section_id from the list below>",
      "title": "<section title>",
      "narrative": "<1-2 sentences of context — what the data shows and why it matters. Do NOT write paragraphs.>",
      "keyFindings": ["<finding 1>", "<finding 2>", ...],
      "charts": [
        {
          "type": "bar" | "pie" | "line" | "horizontal_bar" | "stacked_bar" | "grouped_bar",
          "title": "<chart title>",
          "data": [{"<xKey>": "<label>", "<yKey>": <value>, ...}, ...],
          "xKey": "<key for x-axis labels>",
          "yKeys": ["<key1>", "<key2 if stacked/grouped>"],
          "colors": ["#3b82f6", "#10b981", ...],
          "xLabel": "<optional axis label>",
          "yLabel": "<optional axis label>"
        }
      ],
      "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"]
    }
  ]
}`

const CHART_GUIDELINES = `
## Chart Guidelines
- Only include charts when the data genuinely benefits from visualization (don't force charts).
- Maximum 3 charts per section.
- Use appropriate chart types:
  - **bar/horizontal_bar**: Comparing discrete categories (success rates, counts)
  - **pie**: Showing composition/proportions (max 6 slices, combine small values as "Other")
  - **line**: Showing trends over time or sequential tasks
  - **stacked_bar**: Showing composition across categories
  - **grouped_bar**: Comparing multiple metrics side-by-side
- Chart data must use concrete numbers from the study data, never invented values.
- Keep chart titles short and descriptive.
- Use these colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"]`

const ANALYSIS_GUIDELINES = `
## Analysis Guidelines
- Narrative must be 1-2 sentences only. Let charts and key findings carry the data — do not repeat them in prose.
- Write in a professional, clear tone suitable for a UX research report.
- Focus on actionable insights, not just restating numbers.
- Highlight patterns, outliers, and areas of concern.
- Compare metrics against UX research benchmarks where applicable.
- Use specific numbers from the data to support findings.
- Markdown in narrative: use **bold** for key metrics only.
- Each key finding should be one concise sentence. Include no more than 3 key findings per section.
- Recommendations must be specific and actionable (not generic advice). Max 2 per section.`

// ---------------------------------------------------------------------------
// Group-specific prompt builders
// ---------------------------------------------------------------------------

export function buildOverviewPrompt(
  summary: StudySummary,
  sections: SectionDefinition[],
): string {
  const sectionList = sections.map(s => `- **${s.id}**: ${s.title} — ${s.description}`).join('\n')

  return `You are a UX research analyst generating an insights report.

${buildBaseContext(summary)}

## Study Data
\`\`\`json
${JSON.stringify(summary.data, null, 2)}
\`\`\`

## Sections to Generate
${sectionList}

${ANALYSIS_GUIDELINES}
${CHART_GUIDELINES}
${JSON_FORMAT_INSTRUCTIONS}`
}

export function buildDeepAnalysisPrompt(
  summary: StudySummary,
  sections: SectionDefinition[],
): string {
  const sectionList = sections.map(s => `- **${s.id}**: ${s.title} — ${s.description}`).join('\n')

  return `You are a UX research analyst performing deep analysis for an insights report.

${buildBaseContext(summary)}

## Study Data (Full Detail)
\`\`\`json
${JSON.stringify(summary.data, null, 2)}
\`\`\`

## Sections to Generate
${sectionList}

${ANALYSIS_GUIDELINES}
${CHART_GUIDELINES}

## Deep Analysis Instructions
- Go beyond surface-level stats. Look for:
  - Patterns across tasks/items (which are consistently easy/hard?)
  - Outliers that suggest usability issues
  - Clusters of similar behavior
  - Time-based patterns (fast responders vs slow)
- For each problematic item, explain WHY it might be problematic and suggest a fix.
- Compare related metrics (e.g., high success rate but slow time = findable but not efficient).

${JSON_FORMAT_INSTRUCTIONS}`
}

export function buildQuestionnairePrompt(
  summary: StudySummary,
  sections: SectionDefinition[],
): string {
  const sectionList = sections.map(s => `- **${s.id}**: ${s.title} — ${s.description}`).join('\n')

  return `You are a UX research analyst analyzing questionnaire responses for an insights report.

${buildBaseContext(summary)}

## Questionnaire Data
\`\`\`json
${JSON.stringify(summary.questionnaireData, null, 2)}
\`\`\`

## Sections to Generate
${sectionList}

${ANALYSIS_GUIDELINES}
${CHART_GUIDELINES}

## Questionnaire Analysis Instructions
- For choice questions: highlight majority opinions and notable minorities
- For scale questions: compare averages against the scale midpoint
- For open text: identify 3-5 recurring themes with example quotes
- Cross-reference questionnaire answers with study performance when relevant

${JSON_FORMAT_INSTRUCTIONS}`
}

export function buildSynthesisPrompt(
  summary: StudySummary,
  previousSections: Array<{ id: string; title: string; keyFindings: string[] }>,
): string {
  const findingsSummary = previousSections
    .map(s => `### ${s.title}\n${s.keyFindings.map(f => `- ${f}`).join('\n')}`)
    .join('\n\n')

  return `You are a UX research analyst writing an executive summary for an insights report.

${buildBaseContext(summary)}

## Key Findings from All Sections
${findingsSummary}

## Task
Write a concise executive summary (2-3 paragraphs max) that:
1. Opens with the most important overall finding
2. Synthesizes patterns across sections (don't just list each section's findings)
3. Highlights the top 3 actionable recommendations
4. Ends with one sentence on suggested next steps

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "executiveSummary": "<markdown-formatted executive summary>"
}`
}

// ---------------------------------------------------------------------------
// Prompt selector by group
// ---------------------------------------------------------------------------

const GROUP_PROMPT_BUILDERS: Record<
  string,
  (summary: StudySummary, sections: SectionDefinition[]) => string
> = {
  overview: buildOverviewPrompt,
  deep_analysis: buildDeepAnalysisPrompt,
  questionnaire: buildQuestionnairePrompt,
}

export function getPromptForGroup(
  group: string,
  summary: StudySummary,
  sections: SectionDefinition[],
): string {
  const builder = GROUP_PROMPT_BUILDERS[group]
  if (!builder) throw new Error(`Unknown prompt group: ${group}`)
  return builder(summary, sections)
}
