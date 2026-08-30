/**
 * Shared schema primitives for the public API.
 *
 * Two jobs. First, query-string coercion: every query value arrives as a
 * string, and the naive fix (`z.coerce.boolean()`) is actively wrong — it
 * follows JavaScript truthiness, so `?include_archived=false` reads as `true`.
 * The helpers here parse query values the way an HTTP client means them.
 *
 * Second, response shapes. These are what the OpenAPI document publishes, so a
 * field that is not described here is a field clients cannot rely on.
 */

import { z } from "zod4";

// --- Query-string coercion -------------------------------------------------

/** An integer query parameter, e.g. `?limit=50`. */
export const queryInt = (opts: {
  min?: number;
  max?: number;
  default?: number;
  description: string;
}) => {
  let inner = z.number().int();
  if (opts.min !== undefined) inner = inner.min(opts.min);
  if (opts.max !== undefined) inner = inner.max(opts.max);

  // The default lives on the *inner* schema rather than in the preprocessor so
  // that `z.toJSONSchema` emits it, which is what tells the OpenAPI generator
  // the parameter is optional. A default applied inside the preprocessor is
  // invisible to the schema and the published spec would mark it required.
  const withDefault =
    opts.default === undefined ? inner.optional() : inner.default(opts.default);

  return z
    .preprocess((value) => {
      if (value === undefined || value === "") return undefined;
      if (typeof value !== "string") return value;
      const parsed = Number(value);
      // Hand a non-numeric string through unchanged so zod reports "expected
      // number" against the caller's actual input, rather than a bare NaN.
      return Number.isFinite(parsed) ? parsed : value;
    }, withDefault)
    .describe(opts.description);
};

/**
 * A boolean query parameter.
 *
 * Accepts `true/false`, `1/0`, `yes/no`. Anything else is an error rather than
 * a silent `false`: `z.coerce.boolean()` would follow JavaScript truthiness and
 * read `?include_archived=false` as `true`, which is a filter silently
 * inverting itself.
 */
export const queryBool = (opts: { default?: boolean; description: string }) => {
  const TRUE = new Set(["true", "1", "yes"]);
  const FALSE = new Set(["false", "0", "no"]);

  const inner = z.boolean();
  const withDefault =
    opts.default === undefined ? inner.optional() : inner.default(opts.default);

  return z
    .preprocess((value) => {
      if (value === undefined || value === "") return undefined;
      if (typeof value !== "string") return value;
      const normalized = value.toLowerCase();
      if (TRUE.has(normalized)) return true;
      if (FALSE.has(normalized)) return false;
      // Not a recognised spelling: pass it through so the error names the field.
      return value;
    }, withDefault)
    .describe(opts.description);
};

// --- Identifiers -----------------------------------------------------------

export const uuidParam = (what: string) =>
  z.string().uuid().describe(`The ${what} id.`);

export const STUDY_TYPES = [
  "card_sort",
  "tree_test",
  "survey",
  "prototype_test",
  "first_click",
  "first_impression",
  "live_website_test",
] as const;

export const STUDY_STATUSES = ["draft", "active", "paused", "completed"] as const;

export const studyTypeSchema = z
  .enum(STUDY_TYPES)
  .describe("Which methodology the study runs.");

export const studyStatusSchema = z
  .enum(STUDY_STATUSES)
  .describe(
    "draft is editable and unreachable by participants; active is collecting; " +
      "paused keeps existing data but turns new participants away; completed is closed.",
  );

// --- Pagination ------------------------------------------------------------

/**
 * Cursor pagination.
 *
 * The cursor is opaque on purpose. Today it encodes an offset, because that is
 * what the underlying services take; treating it as opaque means moving to
 * keyset pagination later is not a breaking change. Clients that decode it are
 * relying on something the contract does not promise.
 */
export const paginationQuery = {
  limit: queryInt({
    min: 1,
    max: 100,
    default: 25,
    description: "How many items to return. 1-100, default 25.",
  }),
  cursor: z
    .string()
    .optional()
    .describe(
      "Opaque cursor from a previous response's `next_cursor`. Omit for the first page.",
    ),
};

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

/** Returns 0 for an absent cursor and throws for a corrupt one. */
export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { o?: unknown };
    if (typeof parsed.o === "number" && Number.isInteger(parsed.o) && parsed.o >= 0) {
      return parsed.o;
    }
  } catch {
    // fall through
  }
  // Deliberately loud. A silently-ignored bad cursor restarts the caller at
  // page one, which reads as duplicated data rather than as an error.
  throw new Error("invalid_cursor");
}

/** The list envelope every collection endpoint returns. */
export function listOf<T extends z.ZodType>(item: T, what: string) {
  return z
    .object({
      object: z.literal("list"),
      data: z.array(item).describe(`The ${what} on this page.`),
      has_more: z
        .boolean()
        .describe("True when another page exists. Follow `next_cursor`."),
      next_cursor: z
        .string()
        .nullable()
        .describe("Pass as `cursor` to fetch the next page. Null on the last page."),
      total: z
        .number()
        .int()
        .nullable()
        .describe(
          "Total matching items, when the underlying query can count them cheaply. Null otherwise.",
        ),
    })
    .describe(`A page of ${what}.`);
}

export interface Page<T> {
  object: "list";
  data: T[];
  has_more: boolean;
  next_cursor: string | null;
  total: number | null;
}

/** Build a list envelope from an offset-based read. */
export function page<T>(
  items: T[],
  opts: { offset: number; limit: number; total?: number | null },
): Page<T> {
  const total = opts.total ?? null;
  const consumed = opts.offset + items.length;
  const hasMore =
    total !== null ? consumed < total : items.length === opts.limit;
  return {
    object: "list",
    data: items,
    has_more: hasMore,
    next_cursor: hasMore ? encodeCursor(consumed) : null,
    total,
  };
}

// --- Common response fragments --------------------------------------------

export const deletedSchema = (what: string) =>
  z
    .object({
      object: z.literal(what),
      id: z.string(),
      deleted: z.literal(true),
    })
    .describe(`Confirmation that the ${what} was deleted.`);

export const timestamps = {
  created_at: z.string().describe("ISO 8601 creation time."),
  updated_at: z.string().nullable().describe("ISO 8601 time of the last change."),
};
