/**
 * Motia v0.17.9 → v1.0.0 step file codemod
 *
 * Transforms all .step.ts files to the new v1 config format:
 * - API steps: config fields → triggers:[{type:'http',...}]
 * - Event steps: subscribes/input → triggers:[{type:'queue',...}]
 * - Cron steps: cron expression → triggers:[{type:'cron',expression:'7-field'}]
 * - emits: → enqueues:
 * - emit({ → enqueue({
 * - ApiRouteConfig/EventConfig/CronConfig → StepConfig
 * - Handlers['Name'] → Handlers<typeof config>
 *
 * Run: bun apps/veritio/scripts/migration/codemod-steps.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const STEPS_DIR = 'apps/veritio/src/steps'

// --- Cron expression conversion: 5-field → 7-field ---
const CRON_MAP: Record<string, string> = {
  '0 3 * * *': '0 0 3 * * * *',
  '*/30 * * * *': '0 */30 * * * * *',
  '0 0 1 * *': '0 0 0 1 * * *',
  '0 4 * * 0': '0 0 4 * * 0 *',
  '0 2 * * *': '0 0 2 * * * *',
  '0 2 * * 0': '0 0 2 * * 0 *',
  '0 * * * *': '0 0 * * * * *',
  '*/5 * * * *': '0 */5 * * * * *',
  '*/15 * * * *': '0 */15 * * * * *',
  '0 0 * * *': '0 0 0 * * * *',
  '0 1 * * *': '0 0 1 * * * *',
  '0 4 * * *': '0 0 4 * * * *',
  '0 3 * * 0': '0 0 3 * * 0 *',
}

function convertCronExpression(expr: string): string {
  if (CRON_MAP[expr]) return CRON_MAP[expr]
  // Generic conversion: prepend 0 (seconds), append * (year)
  const parts = expr.trim().split(/\s+/)
  if (parts.length === 5) {
    return `0 ${parts.join(' ')} *`
  }
  return expr // already 7-field or unknown
}

// --- Extract the config block from file content ---
function extractConfigBlock(content: string): { start: number; end: number } | null {
  const configMatch = content.match(/export const config[^=]*=\s*\{/)
  if (!configMatch) return null

  const blockStart = content.indexOf(configMatch[0])
  const braceStart = blockStart + configMatch[0].lastIndexOf('{')

  let depth = 1
  let i = braceStart + 1
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++
    if (content[i] === '}') depth--
    i++
  }

  return { start: blockStart, end: i - 1 }
}

// --- Extract a specific property value from the config block ---
// Handles single-line values and bracket-balanced multi-line values
function extractProp(configText: string, propName: string): string | null {
  // Match "  propName: value," pattern
  const regex = new RegExp(`^\\s+${propName}:\\s*`, 'm')
  const match = configText.match(regex)
  if (!match) return null

  const valueStart = configText.indexOf(match[0]) + match[0].length
  let i = valueStart
  let depth = 0
  let inStr = false
  let strChar = ''

  // Read until we hit a comma at depth 0 (or end of object at depth 0)
  while (i < configText.length) {
    const ch = configText[i]

    if (!inStr) {
      if (ch === '"' || ch === "'") {
        inStr = true
        strChar = ch
      } else if (ch === '`') {
        inStr = true
        strChar = '`'
      } else if (ch === '{' || ch === '[' || ch === '(') {
        depth++
      } else if (ch === '}' || ch === ']' || ch === ')') {
        if (depth === 0) break
        depth--
      } else if (ch === ',' && depth === 0) {
        break
      } else if (ch === '\n' && depth === 0) {
        break
      }
    } else {
      if (ch === strChar && configText[i - 1] !== '\\') {
        inStr = false
      }
    }
    i++
  }

  return configText.slice(valueStart, i).trim()
}

// --- Remove "as any" suffix from a value ---
function stripAsAny(value: string): string {
  return value.replace(/\s+as\s+any$/, '').trim()
}

// --- Transform an API step config ---
function transformApiConfig(configText: string): string {
  const name = extractProp(configText, 'name')
  const description = extractProp(configText, 'description')
  const path = extractProp(configText, 'path')
  const method = extractProp(configText, 'method')
  const middleware = extractProp(configText, 'middleware')
  const bodySchemaRaw = extractProp(configText, 'bodySchema')
  const responseSchemaRaw = extractProp(configText, 'responseSchema')
  const emits = extractProp(configText, 'emits')
  const flows = extractProp(configText, 'flows')
  const queryParams = extractProp(configText, 'queryParams')

  // Build HTTP trigger
  const triggerParts: string[] = [`    type: 'http'`]
  if (method) triggerParts.push(`    method: ${method}`)
  if (path) triggerParts.push(`    path: ${path}`)
  if (middleware) triggerParts.push(`    middleware: ${middleware}`)
  if (bodySchemaRaw) {
    const bodySchema = stripAsAny(bodySchemaRaw)
    triggerParts.push(`    bodySchema: ${bodySchema} as any`)
  }
  if (responseSchemaRaw) {
    triggerParts.push(`    responseSchema: ${responseSchemaRaw}`)
  }
  if (queryParams) {
    triggerParts.push(`    queryParams: ${queryParams}`)
  }

  const trigger = `  triggers: [{\n${triggerParts.join(',\n')},\n  }]`

  // Build root config
  const rootParts: string[] = []
  if (name) rootParts.push(`  name: ${name}`)
  if (description) rootParts.push(`  description: ${description}`)
  rootParts.push(trigger)
  if (emits) rootParts.push(`  enqueues: ${emits}`)
  if (flows) rootParts.push(`  flows: ${flows}`)

  return `{\n${rootParts.join(',\n')},\n}`
}

// --- Transform an event step config ---
function transformEventConfig(configText: string): string {
  const name = extractProp(configText, 'name')
  const description = extractProp(configText, 'description')
  const subscribes = extractProp(configText, 'subscribes')
  const inputRaw = extractProp(configText, 'input')
  const emits = extractProp(configText, 'emits')
  const flows = extractProp(configText, 'flows')

  // Extract topic from subscribes array: ['topic-name']
  let topic = "''"
  if (subscribes) {
    const topicMatch = subscribes.match(/\[['"`](.+?)['"`]\]/)
    if (topicMatch) topic = `'${topicMatch[1]}'`
  }

  // Build queue trigger
  const triggerParts: string[] = [
    `    type: 'queue'`,
    `    topic: ${topic}`,
  ]
  if (inputRaw) {
    const input = stripAsAny(inputRaw)
    triggerParts.push(`    input: ${input} as any`)
  }

  const trigger = `  triggers: [{\n${triggerParts.join(',\n')},\n  }]`

  const rootParts: string[] = []
  if (name) rootParts.push(`  name: ${name}`)
  if (description) rootParts.push(`  description: ${description}`)
  rootParts.push(trigger)
  if (emits) rootParts.push(`  enqueues: ${emits}`)
  if (flows) rootParts.push(`  flows: ${flows}`)

  return `{\n${rootParts.join(',\n')},\n}`
}

// --- Transform a cron step config ---
function transformCronConfig(configText: string): string {
  const name = extractProp(configText, 'name')
  const description = extractProp(configText, 'description')
  const cronExpr = extractProp(configText, 'cron')
  const emits = extractProp(configText, 'emits')
  const flows = extractProp(configText, 'flows')

  // Convert cron expression
  let expression = "'0 * * * * * *'"
  if (cronExpr) {
    // cronExpr is like "'0 3 * * *'" (with quotes)
    const raw = cronExpr.replace(/['"]/g, '').split('//')[0].trim() // strip comments
    const converted = convertCronExpression(raw)
    expression = `'${converted}'`
  }

  const trigger = `  triggers: [{ type: 'cron', expression: ${expression} }]`

  const rootParts: string[] = []
  if (name) rootParts.push(`  name: ${name}`)
  if (description) rootParts.push(`  description: ${description}`)
  rootParts.push(trigger)
  if (emits) rootParts.push(`  enqueues: ${emits}`)
  if (flows) rootParts.push(`  flows: ${flows}`)

  return `{\n${rootParts.join(',\n')},\n}`
}

// --- Determine step type from config text ---
function getStepType(configText: string): 'api' | 'event' | 'cron' | null {
  if (configText.match(/\btype:\s*['"]api['"]/)) return 'api'
  if (configText.match(/\btype:\s*['"]event['"]/)) return 'event'
  if (configText.match(/\btype:\s*['"]cron['"]/)) return 'cron'
  return null
}

// --- Transform import line ---
function transformImports(content: string): string {
  // Replace old config type imports from 'motia'
  return content
    .replace(/import\s+type\s*\{([^}]*)\}\s*from\s*['"]motia['"]/g, (match, imports) => {
      const transformed = imports
        .replace(/\bApiRouteConfig\b/g, 'StepConfig')
        .replace(/\bEventConfig\b/g, 'StepConfig')
        .replace(/\bCronConfig\b/g, 'StepConfig')

      // Deduplicate StepConfig if it appears multiple times
      const parts = transformed.split(',').map((s: string) => s.trim()).filter(Boolean)
      const unique = [...new Set(parts)]
      return `import type { ${unique.join(', ')} } from 'motia'`
    })
}

// --- Transform handler type annotation ---
function transformHandlerType(content: string): string {
  // Handlers['StepName'] → Handlers<typeof config>
  return content.replace(/Handlers\['[^']+'\]/g, 'Handlers<typeof config>')
}

// --- Transform emit → enqueue in handler destructuring and calls ---
function transformEmitToEnqueue(content: string): string {
  // In destructuring patterns: { logger, emit, streams } → { logger, enqueue, streams }
  // Match emit as a standalone word in destructuring contexts
  let result = content

  // Replace destructuring: ", emit," / "{ emit," / ", emit }" / "{ emit }"
  result = result.replace(/([{,]\s*)emit(\s*[,}])/g, '$1enqueue$2')

  // Replace "emit: " property in interfaces (e.g., emit?: ...)
  result = result.replace(/\bemit(\??):\s*(EmitFunction|Function|\()/g, 'enqueue$1: EnqueueFunction')
  result = result.replace(/\bemit(\??):\s*\(/g, 'enqueue$1: (')

  // Replace function calls: await emit({ / emit({
  result = result.replace(/\bawait emit\(\{/g, 'await enqueue({')
  result = result.replace(/\bemit\(\{/g, 'enqueue({')

  // Replace EmitFunction → EnqueueFunction in imports and types
  result = result.replace(/\bEmitFunction\b/g, 'EnqueueFunction')

  return result
}

// --- Transform emits: → enqueues: in config ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function transformEmitsToEnqueues(configBody: string): string {
  return configBody.replace(/\bemits:\s*/g, 'enqueues: ')
}

// --- Main transform for a single file ---
function transformFile(filePath: string): { changed: boolean; content: string } {
  let content = readFileSync(filePath, 'utf-8')
  const original = content

  // Find config block
  const bounds = extractConfigBlock(content)
  if (!bounds) {
    console.warn(`  [SKIP] No config block found in ${filePath}`)
    return { changed: false, content }
  }

  const configText = content.slice(bounds.start, bounds.end + 1)

  // Find the body (inside the outer braces)
  const firstBrace = configText.indexOf('{')
  const configBody = configText.slice(firstBrace + 1, -1)

  const stepType = getStepType(configBody)
  if (!stepType) {
    console.warn(`  [SKIP] Unknown step type in ${filePath}`)
    return { changed: false, content }
  }

  // Transform the config block
  let newConfigBody: string
  try {
    if (stepType === 'api') {
      newConfigBody = transformApiConfig(configBody)
    } else if (stepType === 'event') {
      newConfigBody = transformEventConfig(configBody)
    } else {
      newConfigBody = transformCronConfig(configBody)
    }
  } catch (e) {
    console.error(`  [ERROR] Failed to transform ${filePath}: ${e}`)
    return { changed: false, content }
  }

  // Replace old config declaration with new one (removing type annotation)
  const configDeclMatch = configText.match(/export const config[^=]*=\s*/)
  if (!configDeclMatch) {
    console.warn(`  [SKIP] Could not find config declaration in ${filePath}`)
    return { changed: false, content }
  }

  const newConfigDecl = `export const config = ${newConfigBody} satisfies StepConfig`
  content = content.slice(0, bounds.start) + newConfigDecl + content.slice(bounds.end + 1)

  // Transform imports
  content = transformImports(content)

  // Transform handler types
  content = transformHandlerType(content)

  // Transform emit → enqueue
  content = transformEmitToEnqueue(content)

  return { changed: content !== original, content }
}

// --- Run codemod ---
const files = execSync(`find ${STEPS_DIR} -name "*.step.ts"`, { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean)


let _changed = 0
let _skipped = 0
let _errors = 0

for (const file of files) {
  try {
    const result = transformFile(file)
    if (result.changed) {
      writeFileSync(file, result.content)
      _changed++
      } else {
      _skipped++
    }
  } catch (e) {
    console.error(`  [ERROR] ${file}: ${e}`)
    _errors++
  }
}

