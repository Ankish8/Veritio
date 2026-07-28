/**
 * Authenticated dashboard release checks for the workflow-polish batch.
 *
 * This suite uses Playwright directly because results pages maintain long-lived
 * connections that outlive agent-browser's per-command navigation timeout.
 */

import { chromium } from 'playwright'
import type { Browser, BrowserContext, Page } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, run } from '../utils/test-runner'
import { config } from '../utils/test-config'

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4001'
const projectId = process.env.E2E_PROJECT_ID
const cardSortStudyId = process.env.E2E_CARD_SORT_STUDY_ID
const panelSegmentName = process.env.E2E_SEGMENT_NAME

let browser: Browser
let context: BrowserContext
let page: Page

function requireDashboardFixtures(): void {
  if (!projectId || !cardSortStudyId || !panelSegmentName) {
    throw new Error('Dashboard fixture IDs and segment name are required')
  }
}

async function waitForReactClickHandler(target: Page, selector: string): Promise<void> {
  await target.waitForFunction(
    (elementSelector) => {
      const element = document.querySelector(elementSelector)
      if (!element) return false
      const propsKey = Object.keys(element).find((key) => key.startsWith('__reactProps$'))
      if (!propsKey) return false
      return typeof (element as unknown as Record<string, { onClick?: unknown }>)[propsKey]?.onClick === 'function'
    },
    selector,
    { timeout: 60000 }
  )
}

async function authenticate(target: Page): Promise<void> {
  await target.goto(`${baseUrl}${config.routes.signIn}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  const status = await target.evaluate(
    async ({ email, password }) => {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          rememberMe: true,
        }),
      })
      return response.status
    },
    {
      email: config.testUser.email,
      password: config.testUser.password,
    }
  )
  if (status !== 200) {
    throw new Error(`E2E authentication failed with status ${status}`)
  }

  await target.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
}

async function waitForResultsControls(target: Page): Promise<void> {
  const close = target.getByRole('button', { name: 'Close' })
  // The header's overflow trigger is always mounted on desktop; the copy-view
  // item now lives inside that menu, so it only exists once the menu is open.
  const copy = target.getByTestId('results-actions-menu')
  const overlay = target.locator('[data-slot="dialog-overlay"][data-state="open"]')
  let stableChecks = 0

  for (let attempt = 0; attempt < 120; attempt++) {
    if (await overlay.isVisible()) {
      stableChecks = 0
      if (await close.isVisible()) {
        await close.click()
      } else {
        await target.keyboard.press('Escape')
      }
      await target.waitForTimeout(200)
      continue
    }
    if (await copy.isVisible()) {
      stableChecks += 1
      if (stableChecks >= 4) return
    } else {
      stableChecks = 0
    }
    await target.waitForTimeout(500)
  }

  throw new Error('Results controls did not become available')
}

async function openResults(target: Page, query: string): Promise<void> {
  await target.goto(
    `${baseUrl}${config.routes.results(projectId!, cardSortStudyId!)}?${query}`,
    {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    }
  )
  await waitForResultsControls(target)
  await waitForReactClickHandler(target, '[data-testid="results-actions-menu"]')
  await waitForResultsControls(target)
}

function favoriteButton(target: Page, action: 'Add' | 'Remove') {
  return target.locator(
    `table button[aria-label="${action} ${panelSegmentName} ${action === 'Add' ? 'to' : 'from'} favorites"]`
  )
}

async function toggleFavoriteAndWait(target: Page, action: 'Add' | 'Remove'): Promise<void> {
  const selector =
    `table button[aria-label="${action} ${panelSegmentName} ` +
    `${action === 'Add' ? 'to' : 'from'} favorites"]`
  await waitForReactClickHandler(target, selector)
  const responsePromise = target.waitForResponse(
    (response) =>
      response.url().includes('/api/user/preferences') &&
      response.request().method() === 'PATCH',
    { timeout: 10000 }
  ).catch(() => null)
  await favoriteButton(target, action).click()
  const response = await responsePromise
  if (!response) {
    const buttonLabels = await target
      .locator('table button[aria-label*="favorites"]')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
    throw new Error(`Favorite click sent no PATCH; visible actions: ${buttonLabels.join(', ')}`)
  }
  expect.toBe(response.ok(), true)
}

describe('Dashboard - Release Smoke', () => {
  beforeAll(async () => {
    requireDashboardFixtures()
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['clipboard-read', 'clipboard-write'],
    })
    page = await context.newPage()
    await authenticate(page)
  })

  afterAll(async () => {
    await context?.close()
    await browser?.close()
  })

  it('should load the authenticated dashboard and project', async () => {
    await page.goto(`${baseUrl}${config.routes.dashboard}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.getByText('Projects', { exact: true }).first().waitFor({
      state: 'visible',
      timeout: 60000,
    })

    await page.goto(`${baseUrl}${config.routes.project(projectId!)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    expect.toContain(page.url(), `/projects/${projectId}`)
  })

  it('should restore a copied results view in a fresh browser', async () => {
    const query = 'tab=analysis&subtab=segments&status=completed&analysis=similarity'
    await openResults(page, query)

    expect.toContain(page.url(), 'tab=analysis')
    expect.toContain(page.url(), 'status=completed')
    await page.getByTestId('results-actions-menu').click()
    const copyViewItem = page.getByTestId('copy-results-view')
    await copyViewItem.waitFor({ state: 'visible', timeout: 15000 })
    await copyViewItem.click()
    await page.waitForTimeout(1000)
    if (!(await page.getByText('Results view link copied').isVisible())) {
      const diagnostics = await page.evaluate(() => ({
        clipboard: Boolean(navigator.clipboard),
        secureContext: window.isSecureContext,
        buttonText: document.querySelector('[data-testid="copy-results-view"]')?.textContent,
      }))
      const errorToast = await page
        .getByText('Could not copy the results view link')
        .isVisible()
      throw new Error(`Copy failed: ${JSON.stringify({ ...diagnostics, errorToast })}`)
    }

    const copiedUrl = await page.evaluate(() => navigator.clipboard.readText())
    expect.toContain(copiedUrl, query)

    const freshContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    })
    const freshPage = await freshContext.newPage()
    try {
      await authenticate(freshPage)
      await freshPage.goto(copiedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      })
      await waitForResultsControls(freshPage)

      expect.toContain(freshPage.url(), 'tab=analysis')
      expect.toContain(freshPage.url(), 'analysis=similarity')
    } finally {
      await freshContext.close()
    }
  })

  it('should restore URL-addressed results state on back and forward', async () => {
    await openResults(page, 'tab=overview')
    await openResults(page, 'tab=participants&subtab=list&status=all')

    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForURL((url) => url.searchParams.get('tab') === 'overview', {
      timeout: 60000,
    })

    await page.goForward({ waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForURL(
      (url) =>
        url.searchParams.get('tab') === 'participants' &&
        url.searchParams.get('status') === 'all',
      { timeout: 60000 }
    )
  })

  it('should persist a favorite panel segment after reload', async () => {
    await page.goto(`${baseUrl}${config.routes.panelSegments}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.getByText(panelSegmentName!, { exact: true }).last().waitFor({
      state: 'visible',
      timeout: 60000,
    })

    if (await favoriteButton(page, 'Remove').isVisible()) {
      await toggleFavoriteAndWait(page, 'Remove')
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
      await favoriteButton(page, 'Add').waitFor({ state: 'visible', timeout: 60000 })
    }

    await toggleFavoriteAndWait(page, 'Add')
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
    await favoriteButton(page, 'Remove').waitFor({ state: 'visible', timeout: 60000 })
  })
})

run()
