# @veritio/study-types

Shared TypeScript type definitions for Veritio study types and database schema.

## Overview

This package contains all TypeScript type definitions for studies, including:
- Supabase database schema types
- Study type settings (Card Sort, Tree Test, Prototype, Survey, First Click)
- Response and participant types
- Common interfaces

## Installation

```json
{
  "dependencies": {
    "@veritio/study-types": "workspace:*"
  }
}
```

## Usage

```typescript
import type { Study, CardSortSettings, TreeNode } from '@veritio/study-types'

// Use types in your components
const study: Study = {
  id: '123',
  title: 'My Study',
  study_type: 'card_sort',
  // ...
}
```

## License

Private - Part of Veritio monorepo
