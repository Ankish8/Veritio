/**
 * E2E Test Runner
 *
 * A simple test runner for agent-browser E2E tests.
 * Uses a BDD-style syntax similar to Jest/Vitest.
 */

import { close } from './browser'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

interface SuiteResult {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  duration: number
}

type TestFn = () => void | Promise<void>
type HookFn = () => void | Promise<void>

interface TestCase {
  name: string
  fn: TestFn
  skip?: boolean
  only?: boolean
}

interface TestSuite {
  name: string
  tests: TestCase[]
  beforeAll?: HookFn
  afterAll?: HookFn
  beforeEach?: HookFn
  afterEach?: HookFn
}

// Global state
let currentSuite: TestSuite | null = null
const suites: TestSuite[] = []

// ─────────────────────────────────────────────────────────────────────────────
// Test Definition API
// ─────────────────────────────────────────────────────────────────────────────

export function describe(name: string, fn: () => void): void {
  currentSuite = {
    name,
    tests: [],
  }
  fn()
  suites.push(currentSuite)
  currentSuite = null
}

export function it(name: string, fn: TestFn): void {
  if (!currentSuite) {
    throw new Error('it() must be called inside describe()')
  }
  currentSuite.tests.push({ name, fn })
}

export function test(name: string, fn: TestFn): void {
  it(name, fn)
}

// Skip and only modifiers
it.skip = (name: string, fn: TestFn): void => {
  if (!currentSuite) throw new Error('it.skip() must be called inside describe()')
  currentSuite.tests.push({ name, fn, skip: true })
}

it.only = (name: string, fn: TestFn): void => {
  if (!currentSuite) throw new Error('it.only() must be called inside describe()')
  currentSuite.tests.push({ name, fn, only: true })
}

// Hooks
export function beforeAll(fn: HookFn): void {
  if (!currentSuite) throw new Error('beforeAll() must be called inside describe()')
  currentSuite.beforeAll = fn
}

export function afterAll(fn: HookFn): void {
  if (!currentSuite) throw new Error('afterAll() must be called inside describe()')
  currentSuite.afterAll = fn
}

export function beforeEach(fn: HookFn): void {
  if (!currentSuite) throw new Error('beforeEach() must be called inside describe()')
  currentSuite.beforeEach = fn
}

export function afterEach(fn: HookFn): void {
  if (!currentSuite) throw new Error('afterEach() must be called inside describe()')
  currentSuite.afterEach = fn
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertions
// ─────────────────────────────────────────────────────────────────────────────

export const expect = {
  toBe<T>(actual: T, expected: T): void {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  },

  toEqual<T>(actual: T, expected: T): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  },

  toBeTruthy(value: unknown): void {
    if (!value) {
      throw new Error(`Expected truthy value, got ${JSON.stringify(value)}`)
    }
  },

  toBeFalsy(value: unknown): void {
    if (value) {
      throw new Error(`Expected falsy value, got ${JSON.stringify(value)}`)
    }
  },

  toContain(str: string, substring: string): void {
    if (!str.includes(substring)) {
      throw new Error(`Expected "${str}" to contain "${substring}"`)
    }
  },

  toMatch(str: string, pattern: RegExp): void {
    if (!pattern.test(str)) {
      throw new Error(`Expected "${str}" to match ${pattern}`)
    }
  },

  toThrow(fn: () => void, message?: string): void {
    try {
      fn()
      throw new Error(`Expected function to throw${message ? `: ${message}` : ''}`)
    } catch (error) {
      if (message && !(error as Error).message.includes(message)) {
        throw new Error(`Expected error message to contain "${message}", got "${(error as Error).message}"`)
      }
    }
  },

  toBeGreaterThan(actual: number, expected: number): void {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`)
    }
  },

  toBeLessThan(actual: number, expected: number): void {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`)
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Runner
// ─────────────────────────────────────────────────────────────────────────────

async function runTest(test: TestCase, suite: TestSuite): Promise<TestResult> {
  const start = Date.now()

  if (test.skip) {
    return {
      name: test.name,
      passed: true,
      duration: 0,
    }
  }

  try {
    // Run beforeEach hook
    if (suite.beforeEach) {
      await suite.beforeEach()
    }

    // Run test
    await test.fn()

    // Run afterEach hook
    if (suite.afterEach) {
      await suite.afterEach()
    }

    return {
      name: test.name,
      passed: true,
      duration: Date.now() - start,
    }
  } catch (error) {
    // Still run afterEach on failure
    if (suite.afterEach) {
      try {
        await suite.afterEach()
      } catch {
        // Ignore cleanup errors
      }
    }

    return {
      name: test.name,
      passed: false,
      error: (error as Error).message,
      duration: Date.now() - start,
    }
  }
}

async function runSuite(suite: TestSuite): Promise<SuiteResult> {
  const start = Date.now()
  const results: TestResult[] = []

  console.log(`\n📦 ${suite.name}`)

  try {
    // Run beforeAll hook
    if (suite.beforeAll) {
      await suite.beforeAll()
    }

    // Check for .only tests
    const hasOnly = suite.tests.some((t) => t.only)
    const testsToRun = hasOnly ? suite.tests.filter((t) => t.only) : suite.tests

    // Run all tests
    for (const test of testsToRun) {
      const result = await runTest(test, suite)
      results.push(result)

      const icon = test.skip ? '⏭️' : result.passed ? '✅' : '❌'
      const time = result.duration > 0 ? ` (${result.duration}ms)` : ''
      console.log(`  ${icon} ${test.name}${time}`)

      if (!result.passed && result.error) {
        console.log(`     └─ ${result.error}`)
      }
    }

    // Run afterAll hook
    if (suite.afterAll) {
      await suite.afterAll()
    }
  } catch (error) {
    console.log(`  ❌ Suite setup/teardown failed: ${(error as Error).message}`)
  }

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  return {
    name: suite.name,
    tests: results,
    passed,
    failed,
    duration: Date.now() - start,
  }
}

export async function run(): Promise<void> {
  console.log('\n🚀 Running E2E Tests\n')
  console.log('═'.repeat(60))

  const start = Date.now()
  const results: SuiteResult[] = []

  for (const suite of suites) {
    const result = await runSuite(suite)
    results.push(result)
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('\n📊 Summary\n')

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const totalDuration = Date.now() - start

  for (const result of results) {
    const icon = result.failed === 0 ? '✅' : '❌'
    console.log(`  ${icon} ${result.name}: ${result.passed}/${result.tests.length} passed`)
  }

  console.log(`\n  Total: ${totalPassed} passed, ${totalFailed} failed`)
  console.log(`  Duration: ${totalDuration}ms`)

  // Cleanup
  try {
    close()
  } catch {
    // Browser might already be closed
  }

  // Exit with appropriate code
  if (totalFailed > 0) {
    process.exit(1)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export everything
// ─────────────────────────────────────────────────────────────────────────────

export { describe as suite }
export { it as spec }
