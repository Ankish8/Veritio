# E2E Testing with agent-browser

This directory contains end-to-end tests powered by [agent-browser](https://github.com/vercel-labs/agent-browser), a headless browser automation CLI designed for AI agents.

## Quick Start

```bash
# Ensure servers are running
bun run dev:all

# Run all E2E tests
bun run test:e2e

# Run specific test suite
bun run test:e2e:auth
bun run test:e2e:builder
bun run test:e2e:player
bun run test:e2e:dashboard

# Run with browser visible (headed mode)
bun run test:e2e:headed
```

## Directory Structure

```
e2e/
├── index.ts              # Main test runner entry point
├── tests/
│   ├── auth.test.ts      # Authentication tests
│   ├── study-builder.test.ts  # Study creation/editing tests
│   ├── player.test.ts    # Participant flow tests
│   └── dashboard.test.ts # Dashboard & analysis tests
├── utils/
│   ├── browser.ts        # agent-browser command wrappers
│   ├── auth.ts           # Login/logout helpers
│   ├── test-config.ts    # Configuration and routes
│   ├── test-runner.ts    # BDD-style test framework
│   └── index.ts          # Re-exports
└── fixtures/
    └── test-data.ts      # Reusable test data
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:4001` | Frontend URL |
| `E2E_API_URL` | `http://localhost:4000` | Backend API URL |
| `E2E_TEST_EMAIL` | `test@example.com` | Test user email |
| `E2E_TEST_PASSWORD` | `testpassword123` | Test user password |
| `E2E_CARD_SORT_CODE` | `test-card-sort` | Test study code |
| `E2E_TREE_TEST_CODE` | `test-tree-test` | Test study code |
| `E2E_SURVEY_CODE` | `test-survey` | Test study code |

### Headed Mode

Run tests with browser visible:

```bash
# Using npm script
bun run test:e2e:headed

# Or set environment variable
AGENT_BROWSER_HEADED=1 bun e2e/index.ts
```

## Writing Tests

### Basic Structure

```typescript
import { describe, it, expect, run } from '../utils/test-runner'
import { open, click, fill, snapshot, wait } from '../utils/browser'

describe('My Feature', () => {
  it('should do something', () => {
    open('/my-page')
    wait(1000)

    click('[data-testid="my-button"]')

    const snap = snapshot({ compact: true })
    expect.toContain(snap, 'Expected Text')
  })
})

run()
```

### Available Commands

#### Navigation
```typescript
open('/path')           // Navigate to URL
back()                  // Go back
reload()                // Reload page
getUrl()                // Get current URL
getTitle()              // Get page title
```

#### Interaction
```typescript
click('selector')       // Click element
dblclick('selector')    // Double-click
type('selector', 'text') // Type text
fill('selector', 'text') // Clear and fill
press('Enter')          // Press key
hover('selector')       // Hover over element
check('selector')       // Check checkbox
select('selector', 'value') // Select dropdown
scroll('down', 100)     // Scroll
```

#### Semantic Finders (ARIA-based)
```typescript
clickByRole('button', 'Submit')  // By ARIA role
clickByText('Click me')          // By text content
clickByLabel('Email')            // By label
clickByPlaceholder('Enter...')   // By placeholder
clickByTestId('my-button')       // By data-testid
fillByLabel('Email', 'test@example.com')
```

#### Waiting
```typescript
wait(1000)              // Wait ms
wait('[selector]')      // Wait for element
waitForText('Hello')    // Wait for text
waitForUrl('/dashboard') // Wait for URL
waitForLoad()           // Wait for page load
```

#### State Checking
```typescript
isVisible('selector')   // Check visibility
isEnabled('selector')   // Check enabled
isChecked('selector')   // Check checkbox state
```

#### Getting Values
```typescript
getText('selector')     // Get text content
getValue('selector')    // Get input value
getAttribute('sel', 'href') // Get attribute
getCount('selector')    // Count elements
```

#### Snapshots (AI-optimized)
```typescript
// Full page snapshot
snapshot()

// Interactive elements only
snapshot({ interactive: true })

// Compact output
snapshot({ compact: true })

// Limited depth
snapshot({ depth: 3 })

// Scoped to element
snapshot({ scope: '[data-testid="modal"]' })
```

### Assertions

```typescript
expect.toBe(actual, expected)
expect.toEqual(actual, expected)
expect.toBeTruthy(value)
expect.toBeFalsy(value)
expect.toContain(string, substring)
expect.toMatch(string, /regex/)
expect.toThrow(() => fn())
expect.toBeGreaterThan(a, b)
expect.toBeLessThan(a, b)
```

### Helper Assertions

```typescript
assertVisible('[selector]')  // Assert element visible
assertText('Hello')          // Assert text on page
assertUrl('/dashboard')      // Assert URL contains
```

## Test Data Fixtures

```typescript
import { createProjectData, createStudyData, cardSortCards } from '../fixtures/test-data'

const project = createProjectData({ name: 'My Project' })
const study = createStudyData('card-sort', { name: 'My Study' })
```

## Tips

1. **Use snapshots** - The `snapshot()` command returns an accessibility tree that's ideal for verification
2. **Wait appropriately** - Use `wait(ms)` or `waitForText()` to handle async operations
3. **Use semantic selectors** - Prefer `clickByRole()`, `clickByText()` over CSS selectors
4. **Handle errors gracefully** - Wrap interactions in try/catch when elements might not exist
5. **Keep sessions isolated** - Use `resetSession()` in `afterAll()` hooks

## Debugging

### View browser during tests
```bash
bun run test:e2e:headed
```

### Take screenshots
```typescript
screenshot('debug.png')           // Current viewport
screenshot('full.png', { fullPage: true })  // Full page
```

### Get page snapshot
```typescript
const snap = snapshot({ interactive: true, compact: true })
console.log(snap)
```
