# @veritio/swr-config

Shared SWR configuration and utilities for Veritio applications.

## Features

- 🔧 Pre-configured SWR settings (deduplication, retry logic, etc.)
- 🔑 Shared cache key constants for common endpoints
- ⏱️ Request timeout utilities
- 🎯 TypeScript support

## Installation

```json
{
  "dependencies": {
    "@veritio/swr-config": "workspace:*"
  }
}
```

## Usage

### SWR Configuration

```typescript
import { swrConfig } from '@veritio/swr-config'
import { SWRConfig } from 'swr'

export function SWRProvider({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}
```

### Cache Keys

```typescript
import { SWR_KEYS } from '@veritio/swr-config/keys'

// Use predefined keys
const { data } = useSWR(SWR_KEYS.projects)
const { data } = useSWR(SWR_KEYS.project('project-123'))
const { data } = useSWR(SWR_KEYS.projectStudies('project-123'))
```

## Configuration

The shared SWR config includes:

- **Deduplication**: 2 second interval
- **Revalidation**: On focus and reconnect
- **Retry**: Max 3 attempts with exponential backoff
- **Error handling**: Smart retry logic (avoid 4xx retries)
- **Keep previous data**: Smooth transitions during revalidation

## License

Private - Part of Veritio monorepo
