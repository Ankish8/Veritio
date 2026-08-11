# MCP landing announcement and explainer

## Objective

Announce the Veritio MCP server across the public marketing site and give prospective users a clear path from discovery to connection.

The launch should feel as easy to understand as established remote MCP integrations: explain the outcome first, show concrete use cases, make permissions legible, and hand users to the existing client-specific setup flow only when they are ready to connect.

## Research findings

Official MCP experiences from Figma, Linear, Notion, Canva, and Atlassian consistently separate three layers:

1. A short launch message focused on the workflow benefit.
2. An overview that explains capabilities, compatible clients, example prompts, and permissions.
3. A focused setup experience with client-specific installation and OAuth steps.

Veritio already has the third layer at `/mcp/setup`. The marketing work should add the first two layers rather than duplicating setup instructions.

The public `/mcp` path cannot host marketing content because it is the live Streamable HTTP protocol endpoint. The explainer will therefore live at `/mcp-server`.

## Information architecture

### Site-wide announcement

Replace the dormant lifetime-deal message with a new, versioned MCP announcement:

- Message: `New: Bring Veritio research into Codex, Claude, Cursor, and VS Code.`
- CTA: `See how it works`
- Destination: `/mcp-server`
- Dismissal is persisted under a new MCP-specific key so visitors who dismissed the old LTD announcement still see the product launch.
- The bar continues to own the navigation and body offsets so dismissal collapses the whole gap without a flash.

### MCP explainer page

The new `/mcp-server` page will use the current landing-site visual language and tell one continuous story:

1. **Hero** — bring research context and actions into the AI tools teams already use.
2. **Capabilities** — create and configure studies, inspect results, work with participants, collaborate, and export findings.
3. **How it works** — add Veritio, sign in and approve access, then ask in natural language.
4. **Example workflows** — truthful prompts based on the current tool registry.
5. **Compatible clients** — Codex, Claude Code, Cursor, and VS Code, with remote HTTP as the default.
6. **Permissions and trust** — OAuth 2.1, PKCE, scoped access, workspace role checks, revocation, and a hard read-only endpoint.
7. **FAQ** — what MCP is, whether an API key is needed, what read-only means, and how self-hosted/headless clients connect.
8. **Final CTA** — `Connect Veritio MCP`, linking to `https://veritio.io/mcp/setup`.

The page will avoid unimplemented claims such as study duplication, MCP Apps, or registry listing.

## Routing

- Add the new page to the landing Next.js app at `/mcp-server`.
- Add `/mcp-server` to the main application’s multi-zone rewrites so the canonical `https://veritio.io/mcp-server` URL serves the landing deployment.
- Keep `/mcp` and `/mcp/readonly` untouched as protocol endpoints.
- Add an MCP link to the marketing footer so the page remains discoverable after the announcement is dismissed.

## Components and styling

- Generalize the existing `AnnouncementBar` from LTD-specific copy and storage to the MCP launch while keeping the proven dismissal behavior.
- Rename announcement CSS hooks and the layout CSS variable away from `ltd` terminology.
- Build the explainer as a server-rendered page using the existing `Navbar`, `Footer`, `GuideLines`, `FadeIn`, `LineTicker`, and `ArrowIcon` patterns.
- Use lightweight inline SVG illustrations and CSS rather than introducing an image or icon dependency.
- Include responsive states for desktop, tablet, and mobile and honor reduced-motion preferences.

## Accessibility

- The announcement remains a labelled region with a clearly labelled dismiss button.
- CTAs use descriptive text rather than generic “Learn more”.
- Semantic headings, ordered setup steps, lists, `<details>` FAQs, and visible focus states support keyboard and assistive-technology navigation.
- Decorative SVGs are hidden from accessibility APIs.
- Mobile layout must not introduce horizontal overflow.

## Analytics

No new analytics SDK or event system is required. Existing first-party PostHog page capture will observe the new page. Links remain ordinary navigable anchors so the funnel works without client-side analytics.

## Verification

1. Landing TypeScript, ESLint, production build, and formatting checks.
2. Main app TypeScript/build verification for the new multi-zone rewrite.
3. Desktop and 390 px mobile browser checks for the banner and `/mcp-server` page.
4. Exercise banner CTA, footer link, final setup CTA, FAQ controls, and dismissal persistence.
5. Confirm body/nav offsets collapse after dismissal and reset cleanly with the new storage key.
6. Confirm no console errors, broken assets, or horizontal overflow.
