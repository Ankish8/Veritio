# @veritio/auth

Shared authentication utilities for Veritio applications using Better Auth.

## Features

- 🔐 Server-side session management
- 🎯 Client-side auth hooks and utilities
- 🔄 Session token management with caching
- 🚀 Next.js App Router compatible
- 📦 TypeScript support

## Installation

This package is part of the Veritio monorepo and uses workspace dependencies:

```json
{
  "dependencies": {
    "@veritio/auth": "workspace:*"
  }
}
```

## Usage

### Client-side (React Components, Hooks)

```typescript
import { useSession, signIn, signOut } from '@veritio/auth/client'

function UserButton() {
  const { data: session, isPending } = useSession()

  if (isPending) return <div>Loading...</div>

  if (!session) {
    return <button onClick={() => signIn.email({ email: 'user@example.com' })}>
      Sign In
    </button>
  }

  return (
    <div>
      <span>{session.user.email}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Server-side (API Routes, Server Components)

```typescript
import { getServerSession, requireAuth } from '@veritio/auth/server'

// Get session (nullable)
export default async function Page() {
  const session = await getServerSession()

  if (!session) {
    return <div>Not authenticated</div>
  }

  return <div>Welcome {session.user.email}</div>
}

// Require authentication (throws if not authenticated)
export default async function ProtectedPage() {
  const session = await requireAuth()
  return <div>Protected content for {session.user.email}</div>
}
```

## Environment Variables

Required environment variables:

```bash
# Database connection
DATABASE_URL=postgresql://user:pass@host:5432/db

# Better Auth configuration
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:4000  # Optional, defaults to app URL
NEXT_PUBLIC_APP_URL=http://localhost:4001

# OAuth providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## API Reference

### Client Exports (`@veritio/auth/client`)

- `useSession()` - React hook for session state
- `signIn` - Sign in methods (email, oauth)
- `signUp` - Sign up methods
- `signOut()` - Sign out function
- `changePassword(oldPassword, newPassword)` - Password change
- `getAuthToken()` - Get current auth token
- `clearAuthToken()` - Clear stored token
- `handleSessionExpired()` - Handle session expiration
- `createAuthFetch()` - Create authenticated fetch wrapper

### Server Exports (`@veritio/auth/server`)

- `getServerSession()` - Get session server-side (nullable)
- `getServerUser()` - Get user object server-side (nullable)
- `getServerUserId()` - Get user ID server-side (nullable)
- `requireAuth()` - Require authentication (throws if not authenticated)
- `isAuthenticated()` - Check if request is authenticated

### Types

```typescript
import type { Session, User } from '@veritio/auth'

interface Session {
  user: User
  session: {
    userId: string
    expiresAt: Date
    token: string
  }
}

interface User {
  id: string
  email: string
  emailVerified: boolean
  firstName?: string
  lastName?: string
  image?: string
  sourceApp?: string
  createdAt: Date
  updatedAt: Date
}
```

## Architecture

### Session Caching

The package implements a 5-minute session cache to reduce database queries:

```typescript
// Server-side caching
const sessionCache = new Map<string, { userId: string; expiresAt: number }>()
```

### Lazy Loading

Server-side auth is lazy-loaded to avoid bundling issues with the PostgreSQL driver:

```typescript
// Avoids pg module in client bundle
const { auth } = await import('./auth')
```

## Database Schema

Better Auth automatically creates these tables:

- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth provider accounts
- `verification` - Email verification tokens

## Notes

- API routes (`/api/auth/[...all]/route.ts`) must remain in each app (Next.js-specific)
- Middleware files stay in each app (app-specific routing logic)
- This package only extracts reusable utilities, not framework-specific code

## License

Private - Part of Veritio monorepo
