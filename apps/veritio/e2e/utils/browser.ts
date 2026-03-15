/**
 * Browser automation utilities wrapping agent-browser CLI
 *
 * Agent-browser uses a client-daemon architecture where:
 * - Commands are parsed by a fast Rust CLI
 * - Browser operations are handled by a persistent Node.js daemon
 * - The daemon manages Playwright-based Chromium instances
 */

import { execSync, exec } from 'child_process'

type ExecOptions = {
  timeout?: number
  session?: string
  json?: boolean
  headed?: boolean
}

const DEFAULT_TIMEOUT = 30000
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4001'

/**
 * Execute an agent-browser command and return the result
 */
export function ab(command: string, options: ExecOptions = {}): string {
  const { timeout = DEFAULT_TIMEOUT, session, json, headed } = options

  const flags: string[] = []
  if (session) flags.push(`--session ${session}`)
  if (json) flags.push('--json')
  if (headed) flags.push('--headed')

  const fullCommand = `bunx agent-browser ${command} ${flags.join(' ')}`.trim()

  try {
    const result = execSync(fullCommand, {
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return result.trim()
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message?: string }
    const stderr = err.stderr || ''
    const stdout = err.stdout || ''
    throw new Error(`Command failed: ${fullCommand}\n${stderr || stdout || err.message}`)
  }
}

/**
 * Execute command and parse JSON result
 */
export function abJson<T = unknown>(command: string, options: ExecOptions = {}): T {
  const result = ab(command, { ...options, json: true })
  return JSON.parse(result) as T
}

/**
 * Execute command asynchronously (returns Promise)
 */
export function abAsync(command: string, options: ExecOptions = {}): Promise<string> {
  const { timeout = DEFAULT_TIMEOUT, session, json, headed } = options

  const flags: string[] = []
  if (session) flags.push(`--session ${session}`)
  if (json) flags.push('--json')
  if (headed) flags.push('--headed')

  const fullCommand = `bunx agent-browser ${command} ${flags.join(' ')}`.trim()

  return new Promise((resolve, reject) => {
    exec(fullCommand, { timeout, encoding: 'utf-8' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${fullCommand}\n${stderr || stdout || error.message}`))
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

export function open(path: string, options?: ExecOptions): string {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  return ab(`open "${url}"`, options)
}

export function back(options?: ExecOptions): string {
  return ab('back', options)
}

export function reload(options?: ExecOptions): string {
  return ab('reload', options)
}

export function getUrl(options?: ExecOptions): string {
  return ab('get url', options)
}

export function getTitle(options?: ExecOptions): string {
  return ab('get title', options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Element Interaction
// ─────────────────────────────────────────────────────────────────────────────

export function click(selector: string, options?: ExecOptions): string {
  return ab(`click "${selector}"`, options)
}

export function dblclick(selector: string, options?: ExecOptions): string {
  return ab(`dblclick "${selector}"`, options)
}

export function type(selector: string, text: string, options?: ExecOptions): string {
  return ab(`type "${selector}" "${text}"`, options)
}

export function fill(selector: string, text: string, options?: ExecOptions): string {
  return ab(`fill "${selector}" "${text}"`, options)
}

export function clear(selector: string, options?: ExecOptions): string {
  return ab(`fill "${selector}" ""`, options)
}

export function press(key: string, options?: ExecOptions): string {
  return ab(`press "${key}"`, options)
}

export function hover(selector: string, options?: ExecOptions): string {
  return ab(`hover "${selector}"`, options)
}

export function focus(selector: string, options?: ExecOptions): string {
  return ab(`focus "${selector}"`, options)
}

export function check(selector: string, options?: ExecOptions): string {
  return ab(`check "${selector}"`, options)
}

export function uncheck(selector: string, options?: ExecOptions): string {
  return ab(`uncheck "${selector}"`, options)
}

export function select(selector: string, value: string, options?: ExecOptions): string {
  return ab(`select "${selector}" "${value}"`, options)
}

export function scroll(direction: 'up' | 'down' | 'left' | 'right', pixels?: number, options?: ExecOptions): string {
  const cmd = pixels ? `scroll ${direction} ${pixels}` : `scroll ${direction}`
  return ab(cmd, options)
}

export function scrollIntoView(selector: string, options?: ExecOptions): string {
  return ab(`scrollintoview "${selector}"`, options)
}

export function drag(sourceSelector: string, targetSelector: string, options?: ExecOptions): string {
  return ab(`drag "${sourceSelector}" "${targetSelector}"`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Finders (ARIA-based)
// Using agent-browser's `find` command: find <locator> <value> <action> [text]
// ─────────────────────────────────────────────────────────────────────────────

export function clickByRole(role: string, name?: string, options?: ExecOptions): string {
  const cmd = name ? `find role "${role}" click --name "${name}"` : `find role "${role}" click`
  return ab(cmd, options)
}

export function clickByText(text: string, options?: ExecOptions): string {
  return ab(`find text "${text}" click`, options)
}

export function clickByLabel(label: string, options?: ExecOptions): string {
  return ab(`find label "${label}" click`, options)
}

export function clickByPlaceholder(placeholder: string, options?: ExecOptions): string {
  return ab(`find placeholder "${placeholder}" click`, options)
}

export function clickByTestId(testId: string, options?: ExecOptions): string {
  return ab(`find testid "${testId}" click`, options)
}

export function fillByLabel(label: string, text: string, options?: ExecOptions): string {
  return ab(`find label "${label}" fill "${text}"`, options)
}

export function fillByPlaceholder(placeholder: string, text: string, options?: ExecOptions): string {
  return ab(`find placeholder "${placeholder}" fill "${text}"`, options)
}

export function clickByTab(tabName: string, options?: ExecOptions): string {
  return ab(`find role tab click --name "${tabName}"`, options)
}

export function clickBySwitch(switchName: string, options?: ExecOptions): string {
  return ab(`find role switch click --name "${switchName}"`, options)
}

export function clickByRadio(radioName: string, options?: ExecOptions): string {
  return ab(`find role radio click --name "${radioName}"`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Waiting
// agent-browser wait commands: wait <selector|ms|url:pattern|text:string>
// ─────────────────────────────────────────────────────────────────────────────

export function wait(selectorOrMs: string | number, options?: ExecOptions): string {
  return ab(`wait ${selectorOrMs}`, options)
}

export function waitForText(text: string, options?: ExecOptions): string {
  // Use eval to wait for text to appear
  const escaped = text.replace(/"/g, '\\"')
  return ab(`eval "await new Promise(r => { const check = () => document.body?.innerText?.includes('${escaped}') ? r() : setTimeout(check, 100); check(); })"`, options)
}

export function waitForUrl(pattern: string, options?: ExecOptions): string {
  // Use eval to wait for URL pattern
  const escaped = pattern.replace(/"/g, '\\"')
  return ab(`eval "await new Promise(r => { const check = () => window.location.href.includes('${escaped}') ? r() : setTimeout(check, 100); check(); })"`, options)
}

export function waitForLoad(_state: 'load' | 'domcontentloaded' | 'networkidle' = 'load', options?: ExecOptions): string {
  // Wait for page to be ready
  return ab(`eval "await new Promise(r => document.readyState === 'complete' ? r() : window.addEventListener('load', r))"`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// State Checking
// ─────────────────────────────────────────────────────────────────────────────

export function isVisible(selector: string, options?: ExecOptions): boolean {
  const result = ab(`is-visible "${selector}"`, options)
  return result.toLowerCase() === 'true'
}

export function isEnabled(selector: string, options?: ExecOptions): boolean {
  const result = ab(`is-enabled "${selector}"`, options)
  return result.toLowerCase() === 'true'
}

export function isChecked(selector: string, options?: ExecOptions): boolean {
  const result = ab(`is-checked "${selector}"`, options)
  return result.toLowerCase() === 'true'
}

// ─────────────────────────────────────────────────────────────────────────────
// Getting Values
// ─────────────────────────────────────────────────────────────────────────────

export function getText(selector: string, options?: ExecOptions): string {
  return ab(`get text "${selector}"`, options)
}

export function getValue(selector: string, options?: ExecOptions): string {
  return ab(`get value "${selector}"`, options)
}

export function getAttribute(selector: string, attr: string, options?: ExecOptions): string {
  return ab(`get attribute "${selector}" "${attr}"`, options)
}

export function getCount(selector: string, options?: ExecOptions): number {
  const result = ab(`get count "${selector}"`, options)
  return parseInt(result, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshots (AI-optimized element references)
// ─────────────────────────────────────────────────────────────────────────────

export interface SnapshotOptions extends ExecOptions {
  interactive?: boolean // -i flag
  compact?: boolean // -c flag
  depth?: number // -d flag
  scope?: string // -s flag (CSS selector)
}

export function snapshot(options: SnapshotOptions = {}): string {
  const flags: string[] = []
  if (options.interactive) flags.push('-i')
  if (options.compact) flags.push('-c')
  if (options.depth) flags.push(`-d ${options.depth}`)
  if (options.scope) flags.push(`-s "${options.scope}"`)

  return ab(`snapshot ${flags.join(' ')}`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Screenshots
// ─────────────────────────────────────────────────────────────────────────────

export function screenshot(path?: string, options?: ExecOptions & { fullPage?: boolean }): string {
  const flags = options?.fullPage ? '-f' : ''
  const cmd = path ? `screenshot "${path}" ${flags}` : `screenshot ${flags}`
  return ab(cmd.trim(), options)
}

// ─────────────────────────────────────────────────────────────────────────────
// JavaScript Execution
// ─────────────────────────────────────────────────────────────────────────────

export function evaluate(js: string, options?: ExecOptions): string {
  // Escape quotes in JS
  const escaped = js.replace(/"/g, '\\"')
  return ab(`eval "${escaped}"`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

export function setCookie(name: string, value: string, options?: ExecOptions): string {
  return ab(`set-cookie "${name}" "${value}"`, options)
}

export function getCookie(name: string, options?: ExecOptions): string {
  return ab(`get-cookie "${name}"`, options)
}

export function clearCookies(options?: ExecOptions): string {
  return ab('clear-cookies', options)
}

export function setLocalStorage(key: string, value: string, options?: ExecOptions): string {
  return ab(`set-localstorage "${key}" "${value}"`, options)
}

export function getLocalStorage(key: string, options?: ExecOptions): string {
  return ab(`get-localstorage "${key}"`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser Control
// ─────────────────────────────────────────────────────────────────────────────

export function close(options?: ExecOptions): string {
  return ab('close', options)
}

export function setViewport(width: number, height: number, options?: ExecOptions): string {
  return ab(`set-viewport ${width} ${height}`, options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────────────────────

let currentSession: string | undefined

export function useSession(name: string): void {
  currentSession = name
}

export function getSession(): string | undefined {
  return currentSession
}

export function withSession<T>(name: string, fn: () => T): T {
  const prev = currentSession
  currentSession = name
  try {
    return fn()
  } finally {
    currentSession = prev
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert that an element exists and is visible
 */
export function assertVisible(selector: string, options?: ExecOptions): void {
  if (!isVisible(selector, options)) {
    throw new Error(`Expected element "${selector}" to be visible`)
  }
}

/**
 * Assert that text appears on the page
 */
export function assertText(text: string, options?: ExecOptions): void {
  try {
    waitForText(text, { ...options, timeout: 5000 })
  } catch {
    throw new Error(`Expected text "${text}" to appear on page`)
  }
}

/**
 * Assert current URL contains pattern
 */
export function assertUrl(pattern: string, options?: ExecOptions): void {
  const url = getUrl(options)
  if (!url.includes(pattern)) {
    throw new Error(`Expected URL to contain "${pattern}", got "${url}"`)
  }
}

/**
 * Retry an action until it succeeds or times out
 */
export async function retry<T>(
  fn: () => T,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000 } = options

  let lastError: Error | undefined
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
