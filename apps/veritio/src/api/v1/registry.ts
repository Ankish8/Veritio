/**
 * The route registry.
 *
 * One flat, ordered list is the source of truth for three things at once: what
 * the router dispatches, what the OpenAPI document describes, and what
 * `registry.test.ts` enumerates to prove no endpoint ships without an
 * authorization requirement. Adding a route to this array is the entire
 * registration step; forgetting to add it means the endpoint does not exist,
 * which is a much better failure than an endpoint that exists but is
 * undocumented or unguarded.
 *
 * Ordering is deliberate and follows the shape of a first integration:
 * introspect, find a project, create a study, fill it in, ship it, read what
 * came back. The reference sidebar renders in this order.
 */

import type { RouteDefinition } from "./define-route";
import { META_ROUTES } from "./routes/meta";
import { ORGANIZATION_ROUTES } from "./routes/organizations";
import { PROJECT_ROUTES } from "./routes/projects";
import { STUDY_ROUTES } from "./routes/studies";
import { CONTENT_ROUTES } from "./routes/content";
import { FLOW_ROUTES } from "./routes/flow";
import { SHARING_ROUTES } from "./routes/sharing";
import { RESULTS_ROUTES } from "./routes/results";
import { EXPORT_ROUTES } from "./routes/exports";
import { PANEL_ROUTES } from "./routes/panel";
import { COLLABORATION_ROUTES } from "./routes/collaboration";

export const API_ROUTES: readonly RouteDefinition[] = Object.freeze([
  ...META_ROUTES,
  ...ORGANIZATION_ROUTES,
  ...PROJECT_ROUTES,
  ...STUDY_ROUTES,
  ...CONTENT_ROUTES,
  ...FLOW_ROUTES,
  ...SHARING_ROUTES,
  ...RESULTS_ROUTES,
  ...EXPORT_ROUTES,
  ...PANEL_ROUTES,
  ...COLLABORATION_ROUTES,
]);

/** Tag order in the reference. Anything unlisted is appended alphabetically. */
export const TAG_ORDER = [
  "Meta",
  "Organizations",
  "Projects",
  "Studies",
  "Content",
  "Participant flow",
  "Sharing",
  "Results",
  "Exports",
  "Panel",
  "Collaboration",
] as const;

export const TAG_DESCRIPTIONS: Record<string, string> = {
  Meta: "Find out who a credential belongs to and what it may do.",
  Organizations: "Workspaces and their members.",
  Projects: "The containers studies live in.",
  Studies:
    "Create, configure, validate, launch and close studies of any of the seven methodologies.",
  Content:
    "The material participants interact with: cards, categories, tree nodes, tasks, questions and designs.",
  "Participant flow":
    "Everything a participant sees around the core activity: welcome, consent, screening and closing screens.",
  Sharing: "Participation links, revocable share links, and public results.",
  Results: "Analysed findings, per-task metrics, participants and raw responses.",
  Exports: "Data exports and AI insight reports, both as pollable jobs.",
  Panel: "The recruitment CRM: participants, tags and segments.",
  Collaboration: "Team comments, study tags, and session recording metadata.",
};

const BY_OPERATION = new Map(
  API_ROUTES.map((route) => [route.operationId, route]),
);

export function findRoute(operationId: string): RouteDefinition | undefined {
  return BY_OPERATION.get(operationId);
}
