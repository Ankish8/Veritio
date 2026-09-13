# Open-source marketing readiness

**Date:** 2026-09-13  
**Status:** Approved for implementation

## Outcome

Prepare the existing `Ankish8/Veritio` AGPL-3.0 repository for a truthful open-source launch without making it public until every release gate passes. The primary hosted conversion is the first study publication; self-host adoption remains a separate, privacy-preserving signal.

## Release gates

1. Repair the confirmed supply-chain, widget XSS, public-results brute-force, AI-cost, security-header, and vulnerability-reporting findings.
2. Sanitize Git history and author metadata in an isolated mirror, coordinate removal of retained GitHub references, and keep the repository private if the historical report remains public-reachable.
3. Make a clean Linux self-host deployment reproducible with explicit external Supabase requirements, service health checks, secure defaults, migrations, backups, and upgrades.
4. Establish a typed marketing-route manifest and publish only claims supported by the hosted/self-hosted capability matrix.
5. Centralize the first-publication transition so dashboard, REST, and MCP paths emit one `study_first_published` event, then preserve bounded campaign attribution through signup and onboarding.

## Product surfaces

- Add `/open-source` and `/self-hosted` as the first launch pages.
- Keep `/education` canonical and redirect `/for-universities` to it.
- Add method pages from verified product capabilities; comparison pages require dated, sourced verification before publication.
- Public demos are participant-facing sample studies and read-only sample results, never an anonymous researcher dashboard.
- Open-source surfaces use exactly two primary actions: **Try hosted Veritio** and **Self-host from GitHub**.

## Security architecture

- Runtime and build dependency audits are CI release gates: no critical advisories and no unreviewed high advisories.
- HTML accepted for the live-site widget passes through one maintained, allowlist-based sanitizer with safe URL protocols.
- Sensitive public mutations use bounded runtime schemas and a shared distributed limiter.
- Both the canonical domain and directly reachable landing origin receive the same baseline security headers.
- Vulnerability reporting uses a verified `@veritio.io` mailbox and GitHub private reporting.

## Verification

- Targeted security tests cover malicious HTML, password brute force, oversized LLM inputs, authz, SSRF, Yjs claims, and response headers.
- A clean self-host clone can migrate, start, create and publish a study, accept a participant response, and show results.
- Every declared marketing route is reachable through the multi-zone app, canonicalized, indexed correctly, and linked to the intended CTA.
- First publication is counted exactly once from dashboard, REST, and MCP; resume never produces a second conversion.

## Boundaries

Community monitoring, automatic discussion scoring, automatic replies, repository publication, promotion, and self-host telemetry by default are not part of this implementation. Earlier prospect research remains proposal-only.
