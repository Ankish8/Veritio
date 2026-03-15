/**
 * Authentication Helpers for E2E Tests
 *
 * Provides login, logout, and session management utilities
 */

import {
  open,
  fill,
  click,
  waitForUrl,
  waitForText,
  getUrl,
  close,
  clickByRole,
  clickByText,
  fillByLabel,
  fillByPlaceholder,
  wait,
  snapshot,
} from './browser'
import { config } from './test-config'

export interface AuthOptions {
  session?: string
  headed?: boolean
}

/**
 * Login with email and password
 */
export async function login(
  email: string = config.testUser.email,
  password: string = config.testUser.password,
  options: AuthOptions = {}
): Promise<void> {
  const { session, headed } = options
  const execOptions = { session, headed, timeout: config.navigationTimeout }

  // Navigate to sign-in page with retry (daemon might have startup issues)
  let retries = 3
  while (retries > 0) {
    try {
      open(config.routes.signIn, execOptions)
      break
    } catch {
      retries--
      if (retries === 0) throw new Error('Failed to open sign-in page after retries')
      wait(2000, execOptions)
    }
  }
  wait(2000, execOptions)

  // Fill in credentials using label-based selectors (matches actual UI)
  // The sign-in page uses textbox inputs identified by their labels
  try {
    fillByLabel('Email', email, execOptions)
  } catch {
    try {
      fillByPlaceholder('Email', email, execOptions)
    } catch {
      fill('input[type="email"]', email, execOptions)
    }
  }

  try {
    fillByLabel('Password', password, execOptions)
  } catch {
    try {
      fillByPlaceholder('Password', password, execOptions)
    } catch {
      fill('input[type="password"]', password, execOptions)
    }
  }

  // Submit form
  try {
    clickByRole('button', 'Sign in', execOptions)
  } catch {
    clickByText('Sign in', execOptions)
  }

  // Wait for redirect to dashboard (simple wait, then verify)
  wait(4000, execOptions)

  // Verify we're logged in by checking URL
  const url = getUrl(execOptions)
  if (url.includes('/sign-in')) {
    // Still on sign-in, might need to wait more or there was an error
    wait(2000, execOptions)
  }
}

/**
 * Logout current user
 */
export function logout(options: AuthOptions = {}): void {
  const { session, headed } = options
  const execOptions = { session, headed }

  // Look for user menu or logout button
  try {
    // Try clicking user avatar/menu first
    click('[data-testid="user-menu"]', execOptions)
    wait(500, execOptions)
    clickByRole('menuitem', 'Logout', execOptions)
  } catch {
    // Fallback: navigate to sign-in which should clear session
    open(config.routes.signIn, execOptions)
  }

  waitForUrl(config.routes.signIn, { ...execOptions, timeout: 5000 })
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(options: AuthOptions = {}): boolean {
  const { session, headed } = options
  const execOptions = { session, headed }

  const url = getUrl(execOptions)

  // If on sign-in or sign-up page, not logged in
  if (url.includes('/sign-in') || url.includes('/sign-up')) {
    return false
  }

  // Check for auth-related elements
  try {
    const snap = snapshot({ interactive: true, compact: true, ...execOptions })
    // Look for dashboard elements that indicate logged in state
    return snap.includes('Projects') || snap.includes('Dashboard') || snap.includes('Logout')
  } catch {
    return false
  }
}

/**
 * Ensure user is logged in, login if not
 */
export async function ensureLoggedIn(options: AuthOptions = {}): Promise<void> {
  if (!isLoggedIn(options)) {
    await login(config.testUser.email, config.testUser.password, options)
  }
}

/**
 * Sign up a new user (for testing sign-up flow)
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
  options: AuthOptions = {}
): Promise<void> {
  const { session, headed } = options
  const execOptions = { session, headed, timeout: config.navigationTimeout }

  // Navigate to sign-up page
  open(config.routes.signUp, execOptions)
  wait(1000, execOptions)

  // Fill in registration form
  fill('input[name="name"]', name, execOptions)
  fill('input[name="email"]', email, execOptions)
  fill('input[name="password"]', password, execOptions)

  // Look for confirm password field
  try {
    fill('input[name="confirmPassword"]', password, execOptions)
  } catch {
    // Some forms don't have confirm password
  }

  // Submit form
  clickByRole('button', 'Sign up', execOptions)

  // Wait for redirect (could be dashboard or email verification)
  wait(3000, execOptions)
}

/**
 * Reset browser session (clear cookies, storage, close browser)
 */
export function resetSession(options: AuthOptions = {}): void {
  const { session, headed } = options
  const execOptions = { session, headed }

  try {
    close(execOptions)
  } catch {
    // Browser might already be closed
  }
}

/**
 * Navigate to dashboard, ensuring logged in
 */
export async function goToDashboard(options: AuthOptions = {}): Promise<void> {
  await ensureLoggedIn(options)
  open(config.routes.dashboard, options)
  waitForText('Projects', { timeout: 10000, ...options })
}

/**
 * Navigate to a specific project
 */
export async function goToProject(projectId: string, options: AuthOptions = {}): Promise<void> {
  await ensureLoggedIn(options)
  open(config.routes.project(projectId), options)
  wait(1000, options)
}

/**
 * Navigate to study builder
 */
export async function goToBuilder(
  projectId: string,
  studyId: string,
  options: AuthOptions = {}
): Promise<void> {
  await ensureLoggedIn(options)
  open(config.routes.builder(projectId, studyId), options)
  wait(1000, options)
}

/**
 * Navigate to study results
 */
export async function goToResults(
  projectId: string,
  studyId: string,
  options: AuthOptions = {}
): Promise<void> {
  await ensureLoggedIn(options)
  open(config.routes.results(projectId, studyId), options)
  wait(1000, options)
}
