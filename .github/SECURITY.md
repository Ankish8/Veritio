# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Veritio, please report it responsibly.

**Do not open a public issue for security vulnerabilities.**

Use [GitHub private vulnerability reporting](https://github.com/Ankish8/Veritio/security/advisories/new)
when it is available, or email **security@veritio.io**.

If one channel is unavailable, use the other. Do not include credentials,
participant data, or other people's research data in an initial report.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **48 hours** -- We will acknowledge receipt of your report
- **7 days** -- We will provide an initial assessment
- **30 days** -- We aim to release a fix for confirmed vulnerabilities

## Authorization model

Veritio's backend connects to PostgreSQL with the Supabase **service_role** key, which **bypasses Row-Level Security (RLS)**. RLS is therefore **not** the authorization layer.

All authorization is enforced at the application layer:
- **Per-endpoint middleware** -- `apps/veritio/src/middlewares/permissions.middleware.ts` (`requireStudy*`, `requireProject*`, `requireOrg*`, `requireResponse*`), applied in each Motia step's `config.triggers[].middleware`.
- **Service-layer checks** -- `apps/veritio/src/services/permission-service.ts` resolves the study -> project -> organization hierarchy and verifies membership/role before reads or mutations.

RLS policies present in `supabase/` are legacy / defense-in-depth and may be incomplete. When adding an authenticated endpoint that accepts a resource id, you MUST attach the matching permission middleware (or enforce the equivalent check in the service). Do not rely on RLS for tenant isolation.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Disclosure Policy

- Please allow us reasonable time to address the issue before public disclosure
- We will credit reporters in the release notes (unless you prefer to remain anonymous)
- We will not take legal action against researchers who follow responsible disclosure
