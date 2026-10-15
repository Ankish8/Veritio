# Dependency advisory exceptions

Last reviewed: 2026-10-15  
Next review: 2026-11-15  
Owner: Veritio security maintainers

`bun run audit:security` rejects every critical or high advisory unless its
exact GHSA is listed in the expiring allowlist. It also rejects stale allowlist
entries after an upstream fix removes an advisory.

## iii OpenTelemetry dependency

- Package: `@opentelemetry/propagator-jaeger@1.30.1`
- Advisory: `GHSA-45rx-2jwx-cxfr`
- Path: `iii-sdk@0.23.0` -> `@iii-dev/helpers@0.23.0` ->
  `@opentelemetry/sdk-trace-node@1.30.1`
- Reachability: the vulnerable `JaegerPropagator` is not constructed. The iii
  helper explicitly installs only `W3CTraceContextPropagator` and
  `W3CBaggagePropagator`. The package remains installed because the upstream
  SDK declares it as an exact dependency.
- Resolution: upgrade iii when its supported OpenTelemetry line contains the
  fix. Do not force the OpenTelemetry 2.x package into the 1.x SDK tree.
- 2026-10-15 review: `@iii-dev/helpers@0.24.x` moves to OpenTelemetry 2.x
  (fixed), but that requires the iii 0.24 engine/SDK upgrade, which is a
  separate migration. Renewed for one month.

The related moderate `GHSA-8988-4f7v-96qf` affects the W3C baggage propagator
that iii does use. In Veritio's worker process, propagation carriers arrive
from the trusted local iii engine bridge rather than directly from public HTTP
requests. This is accepted temporarily, with the same upstream upgrade due
date.

## Puppeteer browser installer dependency

- Package: `extract-zip@2.0.1`
- Advisories: `GHSA-jmr9-qjv8-65gv`, `GHSA-7pqw-9j4j-h8q3`
- Path: `puppeteer-core@24.43.1` -> `@puppeteer/browsers@2.13.2`
- Reachability: `extract-zip` is dynamically imported only by Puppeteer's
  browser download/install function. Veritio never calls that function in its
  application code. PDF and insights jobs launch a repository/operator-chosen
  local executable or `@sparticuz/chromium`.
- Resolution: adopt the first patched `@puppeteer/browsers` release. Until
  then, CI and production must not download or unpack browsers with Puppeteer.
- 2026-10-15 review: `@puppeteer/browsers@3.x` no longer depends on
  `extract-zip`, but it ships only with `puppeteer-core@25`, a major upgrade
  that touches PDF and insights rendering. Renewed for one month; do the
  Puppeteer 25 upgrade as its own change.

## Glob matching in build tooling

- Package: `braces@3.0.3` (no patched release exists)
- Advisory: `GHSA-vfj7-8cjw-p6xm` (stack exhaustion on deeply nested patterns)
- Path: `micromatch@4.0.8` -> `braces`, used by build and lint tooling
  (fast-glob, Tailwind, ESLint, lint-staged)
- Reachability: patterns come from repository configuration, never from
  users or HTTP requests. Worst case is a crashed local build.
- Resolution: drop the exception when `braces` publishes a fix or the
  tooling moves off `micromatch`.

## Moderate development-only AJV advisory

`GHSA-2g4f-4pwh-qvx6` remains in ESLint's legacy configuration validator.
Forcing AJV 8 breaks ESLint because the consumer relies on AJV 6 APIs. The
`$data` option implicated by the advisory is not enabled by Veritio, and ESLint
processes repository-controlled configuration. This is reviewed but does not
need a high-severity allowlist entry.
