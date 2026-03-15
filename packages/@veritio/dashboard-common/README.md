# @veritio/dashboard-common

Shared dashboard components for Veritio applications.

## Overview

This package contains reusable dashboard UI components used across multiple Veritio apps (Veritio). By centralizing these components, we maintain consistency and eliminate code duplication.

## Components

### WelcomeBanner

Welcome message displayed on dashboard home.

```typescript
import { WelcomeBanner } from '@veritio/dashboard-common/welcome-banner'

<WelcomeBanner
  userName="John"
  activeCount={5}
  entityName="study"      // "study" or "test"
  entityNamePlural="studies"
/>
```

### CreateProjectDialog

Dialog for creating new projects.

```typescript
import { CreateProjectDialog } from '@veritio/dashboard-common/create-project-dialog'

<CreateProjectDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSuccess={(project) => console.log('Created:', project)}
  entityName="study"      // Customize text: "study" vs "test"
/>
```

### EditProjectDialog

Dialog for editing existing projects.

```typescript
import { EditProjectDialog } from '@veritio/dashboard-common/edit-project-dialog'

<EditProjectDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  project={project}
  onSuccess={(updated) => console.log('Updated:', updated)}
  entityName="study"
/>
```

## Installation

```json
{
  "dependencies": {
    "@veritio/dashboard-common": "workspace:*"
  }
}
```

## Development

```bash
# Type-check
bun run --filter @veritio/dashboard-common type-check

# Lint
bun run --filter @veritio/dashboard-common lint
```

## License

Private - Part of Veritio monorepo
