/**
 * Shared input primitives.
 *
 * Note the zod import: `zod4` is an npm alias for zod v4, scoped to this MCP
 * layer. The rest of the app is on zod 3 (350+ files, and CLAUDE.md pins the v3
 * `.issues` convention), while `@modelcontextprotocol/server` needs a v4
 * Standard Schema with `~standard.jsonSchema`. The alias lets both coexist
 * without a monorepo-wide migration.
 */

import { z } from "zod4";

export const STUDY_TYPES = [
  "card_sort",
  "tree_test",
  "survey",
  "prototype_test",
  "first_click",
  "first_impression",
  "live_website_test",
] as const;

export type StudyType = (typeof STUDY_TYPES)[number];

export const studyTypeSchema = z
  .enum(STUDY_TYPES)
  .describe("Veritio study type. Determines which content and settings apply.");

export const STUDY_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
] as const;

export const uuid = (what: string) =>
  z.string().uuid().describe(`The ${what} id (UUID).`);

/**
 * Concise vs detailed output.
 *
 * Concise routes to the existing `summarize*ForLLM` helpers, which drop
 * per-participant arrays and keep pre-computed aggregates. Detailed calls the
 * result services directly and is opt-in because these payloads can be large.
 */
export const responseFormat = z
  .enum(["concise", "detailed"])
  .default("concise")
  .describe(
    "concise (default) returns aggregates and summaries and is what you want for analysis. " +
      "detailed adds raw per-participant rows and technical ids, and can be very large.",
  );

export const pagination = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Max items to return. Default 50."),
  cursor: z
    .string()
    .optional()
    .describe("Opaque cursor from a previous response`s next_cursor."),
};

/**
 * Participant-authored text is the one input an agent must never trust.
 *
 * Survey answers, card labels, comments and transcripts are written by
 * arbitrary members of the public and flow straight into an agent's context.
 * Wrapping them in an explicit, named boundary makes the provenance legible to
 * the model, so a "ignore previous instructions" buried in a free-text answer
 * reads as data rather than instruction.
 */
export function untrusted(value: string): string {
  // Encode markup instead of trying to strip one exact closing tag. Encoding
  // handles casing, whitespace and nested/opening-tag variants uniformly and
  // guarantees the wrapper remains the only real tag in the returned string.
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<participant_text trust="none">${escaped}</participant_text>`;
}

/** Apply `untrusted()` to named fields of each row. */
export function markUntrusted<T extends Record<string, unknown>>(
  rows: T[],
  fields: readonly (keyof T)[],
): T[] {
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of fields) {
      const v = copy[field];
      if (typeof v === "string") copy[field] = untrusted(v) as T[keyof T];
    }
    return copy;
  });
}
