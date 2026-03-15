import '@testing-library/jest-dom'
import { vi } from 'vitest'

/**
 * Mock Next.js routing
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

/**
 * Mock Next.js image
 */
vi.mock('next/image', () => ({
  default: (props: any) => props,
}))

/**
 * Mock Better Auth client
 */
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
      session: { token: 'test-token' },
    },
    isPending: false,
  }),
  signIn: { email: vi.fn(), social: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

/**
 * Mock auth-fetch
 */
vi.mock('@/lib/auth-fetch', () => ({
  createAuthFetch: () => vi.fn().mockResolvedValue(new Response()),
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}))

/**
 * Suppress console errors in tests unless explicitly needed
 */
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') || args[0].includes('act(...)'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
