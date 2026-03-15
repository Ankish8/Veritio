# Contributing to Veritio

Thank you for your interest in contributing to Veritio! This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Node.js](https://nodejs.org) 20+
- [Supabase](https://supabase.com) account (or self-hosted instance)
- [Redis](https://redis.io) (local or cloud)

## Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/veritio.git
cd veritio
```

2. **Install dependencies**

```bash
bun install
```

3. **Configure environment**

```bash
cp .env.example apps/veritio/.env.local
```

Edit `apps/veritio/.env.local` with your Supabase credentials, database URL, and Redis URL. See the `.env.example` file for documentation on each variable.

4. **Start development servers**

```bash
cd apps/veritio && ./scripts/dev.sh
```

This starts three servers:
- Backend (Motia): http://localhost:4000
- Frontend (Next.js): http://localhost:4001
- Yjs WebSocket: ws://localhost:4002

## Project Structure

```
veritio/
├── apps/veritio/          # Main application
│   ├── src/steps/         # Motia API/event/cron handlers
│   ├── src/services/      # Business logic
│   ├── src/components/    # React components
│   ├── src/hooks/         # SWR and custom hooks
│   └── src/stores/        # Zustand state
├── packages/@veritio/     # Shared packages (11)
├── docs/                  # Technical documentation
├── workers/               # Cloudflare Worker
└── supabase/              # Database migrations
```

## Making Changes

1. **Create a branch** from `main`:

```bash
git checkout -b feat/your-feature-name
```

2. **Follow conventional commits**:

- `feat:` -- New feature
- `fix:` -- Bug fix
- `docs:` -- Documentation only
- `refactor:` -- Code change that neither fixes a bug nor adds a feature
- `test:` -- Adding or updating tests
- `chore:` -- Maintenance tasks

3. **Verify your changes**:

```bash
bun run build        # Build all packages
bun run lint         # Lint check
bun run type-check   # TypeScript check
bun test path/to/file.test.ts  # Run relevant tests
```

## Code Style

- **TypeScript** -- Strict mode, use `import type` for type-only imports
- **Tailwind CSS v4** -- CSS-based config (not `tailwind.config.js`)
- **Follow existing patterns** -- Look at similar files before creating new ones
- **Motia steps** -- Files must end with `.step.ts` for auto-discovery
- **Zustand stores** -- Always add `skipHydration: true` with `persist()`

## Pull Requests

1. Fill out the PR template completely
2. Ensure all checks pass (`build`, `lint`, `type-check`)
3. Keep PRs focused -- one feature or fix per PR
4. Add tests for new functionality when applicable
5. Update documentation if you change APIs or behavior

## Testing

```bash
# Run a single test file
bun test path/to/file.test.ts

# Run tests matching a pattern
bun run test:vitest -t "pattern"
```

## Getting Help

- Open a [Discussion](https://github.com/Ankish8/Veritio/discussions) for questions
- Check existing [Issues](https://github.com/Ankish8/Veritio/issues) before filing new ones
- Read the [docs/](docs/) directory for architecture and component guides

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
