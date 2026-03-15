/**
 * Authentication E2E Tests
 *
 * Tests for sign-in, sign-up, and session management flows
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect, run } from '../utils/test-runner'
import {
  open,
  fill,
  clickByRole,
  snapshot,
  wait,
  close,
  getUrl,
} from '../utils/browser'
import { config } from '../utils/test-config'
import { login, logout, resetSession } from '../utils/auth'

describe('Authentication - Sign In', () => {
  beforeEach(() => {
    // Start fresh for each test
    try {
      close()
    } catch {
      // Browser might not be open
    }
  })

  afterAll(() => {
    resetSession()
  })

  it('should display the sign-in page correctly', () => {
    open(config.routes.signIn)
    wait(1000)

    // Take a snapshot to verify page structure
    const snap = snapshot({ interactive: true, compact: true })

    // Should have email and password inputs
    expect.toContain(snap, 'email')
    expect.toContain(snap, 'password')
  })

  it('should show error for invalid credentials', () => {
    open(config.routes.signIn)
    wait(1000)

    // Fill in invalid credentials
    fill('input[name="email"]', 'invalid@example.com')
    fill('input[name="password"]', 'wrongpassword')

    // Submit form
    clickByRole('button', 'Sign in')
    wait(2000)

    // Should show error message
    const snap = snapshot({ compact: true })
    const hasError =
      snap.toLowerCase().includes('invalid') ||
      snap.toLowerCase().includes('error') ||
      snap.toLowerCase().includes('incorrect')

    expect.toBeTruthy(hasError)
  })

  it('should redirect to dashboard after successful login', async () => {
    await login(config.testUser.email, config.testUser.password)

    // Should be on dashboard
    const url = getUrl()
    const isOnDashboard =
      url === config.baseUrl + '/' ||
      url.includes('/projects') ||
      url.includes('/dashboard')

    expect.toBeTruthy(isOnDashboard)
  })

  it('should show logged-in user elements after login', async () => {
    await login()
    wait(1000)

    // Take snapshot to verify logged-in state
    const snap = snapshot({ interactive: true, compact: true })

    // Should see projects or dashboard elements
    const isLoggedIn =
      snap.includes('Projects') ||
      snap.includes('Dashboard') ||
      snap.includes('Create')

    expect.toBeTruthy(isLoggedIn)
  })
})

describe('Authentication - Sign Up', () => {
  beforeEach(() => {
    try {
      close()
    } catch {
      // Browser might not be open
    }
  })

  afterAll(() => {
    resetSession()
  })

  it('should display the sign-up page correctly', () => {
    open(config.routes.signUp)
    wait(1000)

    const snap = snapshot({ interactive: true, compact: true })

    // Should have registration fields
    expect.toContain(snap, 'email')
    expect.toContain(snap, 'password')
  })

  it('should have a link to sign-in page', () => {
    open(config.routes.signUp)
    wait(1000)

    const snap = snapshot({ interactive: true, compact: true })

    // Should have a sign-in link
    const hasSignInLink =
      snap.toLowerCase().includes('sign in') ||
      snap.toLowerCase().includes('login') ||
      snap.toLowerCase().includes('already have an account')

    expect.toBeTruthy(hasSignInLink)
  })

  it('should validate email format', () => {
    open(config.routes.signUp)
    wait(1000)

    // Fill in invalid email
    fill('input[name="email"]', 'not-an-email')
    fill('input[name="password"]', 'validpassword123')

    // Try to submit
    clickByRole('button', 'Sign up')
    wait(1000)

    // Should still be on sign-up page (validation failed)
    const url = getUrl()
    expect.toContain(url, 'sign-up')
  })
})

describe('Authentication - Session Management', () => {
  beforeAll(async () => {
    // Ensure we're logged in for session tests
    await login()
  })

  afterAll(() => {
    resetSession()
  })

  it('should persist session across page navigation', () => {
    // Navigate to different pages
    open(config.routes.projects)
    wait(1000)

    const snap1 = snapshot({ compact: true })
    const hasProjects = snap1.includes('Project') || snap1.includes('Create')
    expect.toBeTruthy(hasProjects)

    // Navigate to settings
    open(config.routes.settings)
    wait(1000)

    const snap2 = snapshot({ compact: true })
    const hasSettings =
      snap2.includes('Settings') ||
      snap2.includes('Profile') ||
      snap2.includes('Account')
    expect.toBeTruthy(hasSettings)
  })

  it('should protect dashboard routes from unauthenticated access', () => {
    // Close browser to clear session
    close()

    // Try to access protected route without auth
    open(config.routes.projects)
    wait(2000)

    // Should be redirected to sign-in
    const url = getUrl()
    const redirectedToAuth =
      url.includes('sign-in') ||
      url.includes('login') ||
      url.includes('auth')

    expect.toBeTruthy(redirectedToAuth)
  })
})

describe('Authentication - Logout', () => {
  beforeEach(async () => {
    await login()
    wait(1000)
  })

  afterAll(() => {
    resetSession()
  })

  it('should successfully logout user', () => {
    logout()

    // Should be on sign-in page
    const url = getUrl()
    expect.toContain(url, 'sign-in')
  })

  it('should clear session after logout', () => {
    logout()
    wait(500)

    // Try to access protected route
    open(config.routes.projects)
    wait(2000)

    // Should be redirected to sign-in
    const url = getUrl()
    const redirectedToAuth =
      url.includes('sign-in') ||
      url.includes('login')

    expect.toBeTruthy(redirectedToAuth)
  })
})

// Run tests when this file is executed directly
run()
