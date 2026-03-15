/**
 * E2E Test Suite Entry Point
 *
 * Run all E2E tests or specific test suites
 *
 * Usage:
 *   bun e2e/index.ts           # Run all tests
 *   bun e2e/index.ts auth      # Run only auth tests
 *   bun e2e/index.ts builder   # Run only builder tests
 *   bun e2e/index.ts player    # Run only player tests
 *   bun e2e/index.ts dashboard # Run only dashboard tests
 */

import { execSync } from 'child_process'
import path from 'path'

const TESTS_DIR = path.join(import.meta.dirname, 'tests')

const testSuites = {
  auth: 'auth.test.ts',
  builder: 'study-builder.test.ts',
  player: 'player.test.ts',
  dashboard: 'dashboard.test.ts',
  // Comprehensive Survey Tests
  'survey-questions': 'survey-questions.test.ts',
  'survey-logic': 'survey-logic.test.ts',
  'survey-advanced': 'survey-advanced.test.ts',
}

// Grouped test suites
const testGroups = {
  survey: ['survey-questions', 'survey-logic', 'survey-advanced'],
  all: Object.keys(testSuites) as (keyof typeof testSuites)[],
}

type _TestSuite = keyof typeof testSuites

function runTest(testFile: string): void {
  const fullPath = path.join(TESTS_DIR, testFile)
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Running: ${testFile}`)
  console.log('═'.repeat(60))

  try {
    execSync(`bun ${fullPath}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        E2E_BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:4001',
      },
    })
  } catch {
    console.error(`\n❌ Test suite failed: ${testFile}`)
    process.exit(1)
  }
}

function main(): void {
  const args = process.argv.slice(2)

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Veritio UX - E2E Test Suite                     ║
║           Powered by agent-browser                        ║
╚═══════════════════════════════════════════════════════════╝
`)

  // Check if specific suite requested
  if (args.length > 0) {
    const suite = args[0] as keyof typeof testSuites | keyof typeof testGroups

    if (suite in testSuites) {
      runTest(testSuites[suite as keyof typeof testSuites])
    } else if (suite in testGroups) {
      // Run grouped tests
      console.log(`Running ${suite} test group...\n`)
      for (const testName of testGroups[suite as keyof typeof testGroups]) {
        console.log(`\n📁 Suite: ${testName}`)
        runTest(testSuites[testName as keyof typeof testSuites])
      }
    } else if (args[0] === 'help' || args[0] === '--help') {
      console.log(`
Available test suites:
  auth              - Authentication tests (login, signup, session)
  builder           - Study builder tests (create, edit, publish)
  player            - Participant player tests (card sort, tree test, survey)
  dashboard         - Dashboard and analysis tests

Survey Tests (Comprehensive):
  survey-questions  - All 12 question types with all options
  survey-logic      - Branching, display logic, skip logic, rules engine
  survey-advanced   - A/B testing, scoring, sections, piping, randomization

Test Groups:
  survey            - Run all survey tests (questions + logic + advanced)
  all               - Run all tests

Usage:
  bun e2e/index.ts                 # Run all tests
  bun e2e/index.ts auth            # Run specific suite
  bun e2e/index.ts survey          # Run all survey tests
  bun e2e/index.ts survey-questions # Run survey question tests only
  bun e2e/index.ts --headed        # Run with browser visible

Environment variables:
  E2E_BASE_URL         - Frontend URL (default: http://localhost:4001)
  E2E_API_URL          - Backend URL (default: http://localhost:4000)
  E2E_TEST_EMAIL       - Test user email
  E2E_TEST_PASSWORD    - Test user password
`)
      process.exit(0)
    } else {
      console.error(`Unknown test suite: ${suite}`)
      console.log(`Available suites: ${Object.keys(testSuites).join(', ')}`)
      console.log(`Available groups: ${Object.keys(testGroups).join(', ')}`)
      process.exit(1)
    }
  } else {
    // Run all tests
    console.log('Running all test suites...\n')

    for (const [name, file] of Object.entries(testSuites)) {
      console.log(`\n📁 Suite: ${name}`)
      runTest(file)
    }
  }

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           ✅ All E2E tests completed!                     ║
╚═══════════════════════════════════════════════════════════╝
`)
}

main()
