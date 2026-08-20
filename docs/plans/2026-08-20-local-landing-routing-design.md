# Local landing routing design

## Problem

The logged-out root page on `localhost:4001` is rewritten to the deployed landing site. As a result, local landing changes are invisible on the main local origin, and absolute authentication links can send a local user to production.

## Design

Development will run the landing app on `http://localhost:4003` alongside the main app on `http://localhost:4001`. The main app will use the local landing origin for its multi-zone rewrites and content-security policy in development, while production will continue to use the deployed landing origin. An explicit `NEXT_PUBLIC_LANDING_ORIGIN` remains the highest-priority override in either environment.

Because the browser URL remains on port 4001 during a rewrite, the landing app will emit absolute development asset URLs pointing to port 4003. This keeps its Next.js chunks and static assets separate from the main app's `/_next` namespace. Internal authentication links remain same-origin paths such as `/sign-in`, so they resolve to the main app on port 4001.

The standard development script will own the complete lifecycle of the landing server: port cleanup, startup readiness, status reporting, and shutdown.

## Alternatives considered

- Deploy the link-only change to the production landing site. This would fix the immediate cached page but keep local development dependent on production and prevent local landing hot reload.
- Keep the remote rewrite and introduce a special HTML proxy that rewrites authentication links. This adds response transformation and cache complexity while still serving stale production UI locally.

## Verification

- Unit-test development, production, and explicit landing-origin selection.
- Type-check and build both Next.js applications.
- Confirm the root response on port 4001 rewrites to port 4003 and renders relative login links.
- Click the desktop login link in an automated browser and confirm the final URL is `http://localhost:4001/sign-in`.
